import { AssemblyAI } from 'assemblyai';

class SpeechRecognitionService {
  constructor() {
    this.assemblyClients = new Map(); // Maps companyId => AssemblyAI stream
    this.apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!this.apiKey) {
      console.error("❌ ASSEMBLYAI_API_KEY is not defined in your .env file");
    }

    // Track recognition start time per company
    this.transcriptStartTime = new Map();
  }

  async handleIncomingAudio(companyId, audioBuffer, onTranscript) {
    try {
      let transcriber = this.assemblyClients.get(companyId);
  
      if (!transcriber) {
        console.log(`🔧 Creating new AssemblyAI transcriber for ${companyId}`);
        const client = new AssemblyAI({ apiKey: this.apiKey });
  
        transcriber = client.realtime.transcriber({
          sampleRate: 16000,
          format: 'pcm',
          endpointing: 500,
        });
  
        transcriber.on('open', ({ sessionId }) => {
          console.log(`🎙️ AssemblyAI session opened for ${companyId} with ID: ${sessionId}`);
        });
  
        transcriber.on('error', (error) => {
          console.error(`🛑 AssemblyAI error for ${companyId}:`, error);
          this.stopAssemblyStream(companyId);
        });
  
        transcriber.on('close', (code, reason) => {
          console.log(`🔌 AssemblyAI session closed for ${companyId}:`, code, reason);
          this.assemblyClients.delete(companyId);
        });
  
        transcriber.on('transcript', (transcript) => {
          if (transcript.text) {
            const isFinal = transcript.message_type === 'FinalTranscript';
  
            if (isFinal) {
              const startTime = this.transcriptStartTime.get(companyId);
              const duration = startTime ? `${Date.now() - startTime}ms` : 'unknown';
              console.log(`✅ Final transcript received in ${duration}:`, transcript.text);
            } else {
              console.log(`🔄 Partial transcript for ${companyId}:`, transcript.text);
            }
  
            // ✅ Send with isFinal flag
            onTranscript(companyId, transcript.text, isFinal);
          }
        });
  
        console.log(`🔄 Connecting to AssemblyAI for ${companyId}...`);
        const connectStart = Date.now();
        await transcriber.connect();
        const connectDuration = Date.now() - connectStart;
        console.log(`✅ Connected to AssemblyAI in ${connectDuration}ms`);
  
        this.assemblyClients.set(companyId, transcriber);
      }
  
      if (audioBuffer && audioBuffer.length > 0) {
        // Record start time of recognition (only once per chunk)
        this.transcriptStartTime.set(companyId, Date.now());
        transcriber.sendAudio(Buffer.from(audioBuffer));
      }
  
    } catch (err) {
      console.error(`🔴 Error in handleIncomingAudio for ${companyId}:`, err);
      this.stopAssemblyStream(companyId);
    }
  }
  

  stopAssemblyStream(companyId) {
    const transcriber = this.assemblyClients.get(companyId);
    if (transcriber) {
      try {
        transcriber.close();
      } catch (err) {
        console.error(`⚠️ Error closing AssemblyAI stream for ${companyId}:`, err);
      } finally {
        this.assemblyClients.delete(companyId);
        this.transcriptStartTime.delete(companyId);
        console.log(`🛑 Closed and removed AssemblyAI stream for ${companyId}`);
      }
    }
  }
}

export default SpeechRecognitionService;
