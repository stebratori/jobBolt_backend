import { AssemblyAI } from 'assemblyai';

class SpeechRecognitionService {
  constructor() {
    this.assemblyClients = new Map(); // Maps companyId => AssemblyAI streaming instance
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
        reject(err);
      });
  
      stream.on('close', () => {
        console.log(`🔌 AssemblyAI stream closed for ${companyId}`);
      });
  
      stream.on('open', () => {
        console.log(`🎙️ AssemblyAI WebSocket is now open for ${companyId}`);
        this.assemblyClients.set(companyId, stream);
        resolve();
      });
    });
  }
  

  async handleIncomingAudio(companyId, audioBuffer, onTranscript) {
    let stream = this.assemblyClients.get(companyId);
  
    if (!stream) {
      console.log(`🔧 No Assembly stream found for ${companyId}, starting one now...`);
      await this.startAssemblyStream(companyId, onTranscript);
      stream = this.assemblyClients.get(companyId);
    }
  
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
