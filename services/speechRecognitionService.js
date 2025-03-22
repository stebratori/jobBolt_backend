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

  startAssemblyStream(companyId, onTranscript) {
    const assembly = new AssemblyAI({ apiKey: this.apiKey });

    const stream = assembly.realtime.transcriber({
      sampleRate: 16000,
      format: 'pcm',
    });

    return new Promise((resolve, reject) => {
      stream.on('transcript', (msg) => {
        if (msg.text) {
          console.log(`📝 Transcript for ${companyId}:`, msg.text);
          onTranscript(companyId, msg.text);
        }
      });

      stream.on('error', (err) => {
        console.error(`🛑 AssemblyAI stream error for ${companyId}:`, err);
        this.assemblyStartupInProgress.delete(companyId);
        reject(err);
      });

      stream.on('close', () => {
        console.log(`🔌 AssemblyAI stream closed for ${companyId}`);
      });

      stream.on('open', () => {
        console.log(`🎙️ AssemblyAI WebSocket is now open for ${companyId}`);
        this.assemblyClients.set(companyId, stream);
        this.assemblyStartupInProgress.delete(companyId);
        resolve();
      });
    });
  }

  async handleIncomingAudio(companyId, audioBuffer, onTranscript) {
    let stream = this.assemblyClients.get(companyId);

    // If no stream, but a startup is in progress, wait for it
    if (!stream && this.assemblyStartupInProgress.has(companyId)) {
      console.log(`⏳ Waiting for ongoing Assembly stream to finish startup for ${companyId}`);
      await this.assemblyStartupInProgress.get(companyId);
      stream = this.assemblyClients.get(companyId);
    }

    // If still no stream, initiate startup
    if (!stream) {
      console.log(`🔧 No Assembly stream found for ${companyId}, starting one now...`);
      const startupPromise = this.startAssemblyStream(companyId, onTranscript);
      this.assemblyStartupInProgress.set(companyId, startupPromise);
      await startupPromise;
      stream = this.assemblyClients.get(companyId);
    }

    // If stream is now available, send audio
    if (stream) {
      try {
        stream.sendAudio(Buffer.from(audioBuffer));
      } catch (err) {
        console.error(`⚠️ Error sending audio for ${companyId}:`, err);
      }
    }
  }

  stopAssemblyStream(companyId) {
    const stream = this.assemblyClients.get(companyId);
    if (stream) {
      stream.close();
      this.assemblyClients.delete(companyId);
      console.log(`🛑 Closed and removed Assembly stream for ${companyId}`);
    }
  }
}

export default SpeechRecognitionService;
