import { AssemblyAI } from 'assemblyai';

class SpeechRecognitionService {
  constructor() {
    this.assemblyClients = new Map(); // Maps companyId => AssemblyAI stream
    this.assemblyStartupInProgress = new Map(); // Maps companyId => Promise
    this.apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!this.apiKey) {
      console.warn("❗ ASSEMBLYAI_API_KEY is not defined in your .env file");
    }
  }

  async startAssemblyStream(companyId, onTranscript) {
    try {
      const assembly = new AssemblyAI({ apiKey: this.apiKey });

      const stream = await assembly.realtime.transcriber({
        sampleRate: 16000,
        format: 'pcm',
      });

      return new Promise((resolve, reject) => {
        // Add a timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.error(`🕒 Timeout: AssemblyAI stream took too long to initialize for ${companyId}`);
          this.assemblyStartupInProgress.delete(companyId);
          stream.close();
          reject(new Error('AssemblyAI stream initialization timeout'));
        }, 10000); // 10 second timeout

        stream.on('transcript', (msg) => {
          if (msg.text) {
            console.log(`📝 Transcript for ${companyId}:`, msg.text);
            onTranscript(companyId, msg.text);
          }
        });

        stream.on('error', (err) => {
          console.error(`🛑 AssemblyAI stream error for ${companyId}:`, err);
          clearTimeout(timeout);
          this.assemblyStartupInProgress.delete(companyId);
          reject(err);
        });

        stream.on('close', () => {
          console.log(`🔌 AssemblyAI stream closed for ${companyId}`);
          if (this.assemblyStartupInProgress.has(companyId)) {
            // If this happens during initialization, consider it an error
            clearTimeout(timeout);
            this.assemblyStartupInProgress.delete(companyId);
            reject(new Error('Stream closed during initialization'));
          }
        });

        stream.on('open', () => {
          console.log(`🎙️ AssemblyAI WebSocket is now open for ${companyId}`);
          clearTimeout(timeout);
          this.assemblyClients.set(companyId, stream);
          this.assemblyStartupInProgress.delete(companyId);
          resolve(stream);
        });
      });
    } catch (err) {
      console.error(`🔴 Failed to create AssemblyAI transcriber for ${companyId}:`, err);
      this.assemblyStartupInProgress.delete(companyId);
      throw err;
    }
  }

  async handleIncomingAudio(companyId, audioBuffer, onTranscript) {
    try {
      let stream = this.assemblyClients.get(companyId);

      // If no stream, but a startup is in progress, wait for it
      if (!stream && this.assemblyStartupInProgress.has(companyId)) {
        console.log(`⏳ Waiting for ongoing Assembly stream to finish startup for ${companyId}`);
        try {
          await this.assemblyStartupInProgress.get(companyId);
          stream = this.assemblyClients.get(companyId);
        } catch (err) {
          console.error(`❌ Assembly stream startup failed for ${companyId}:`, err);
          this.assemblyStartupInProgress.delete(companyId);
          // Continue to retry below
        }
      }

      // If still no stream, initiate startup
      if (!stream) {
        console.log(`🔧 No Assembly stream found for ${companyId}, starting one now...`);
        const startupPromise = this.startAssemblyStream(companyId, onTranscript);
        this.assemblyStartupInProgress.set(companyId, startupPromise);
        
        try {
          await startupPromise;
          stream = this.assemblyClients.get(companyId);
        } catch (err) {
          console.error(`❌ Failed to start Assembly stream for ${companyId}:`, err);
          return; // Exit early as we couldn't get a stream
        }
      }

      // If stream is now available, send audio
      if (stream) {
        try {
          stream.sendAudio(Buffer.from(audioBuffer));
        } catch (err) {
          console.error(`⚠️ Error sending audio for ${companyId}:`, err);
          // If sending fails, close and clear the stream for retry next time
          this.stopAssemblyStream(companyId);
        }
      }
    } catch (err) {
      console.error(`🔴 Unexpected error in handleIncomingAudio for ${companyId}:`, err);
      this.stopAssemblyStream(companyId);
    }
  }

  stopAssemblyStream(companyId) {
    const stream = this.assemblyClients.get(companyId);
    if (stream) {
      try {
        stream.close();
      } catch (err) {
        console.error(`⚠️ Error closing Assembly stream for ${companyId}:`, err);
      } finally {
        this.assemblyClients.delete(companyId);
        console.log(`🛑 Closed and removed Assembly stream for ${companyId}`);
      }
    }
  }
}

export default SpeechRecognitionService;