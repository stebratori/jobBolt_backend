import { AssemblyAI } from 'assemblyai';

class SpeechRecognitionService {
  constructor() {
    this.assemblyClients = new Map(); // Maps companyId => AssemblyAI stream
    this.apiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!this.apiKey) {
      console.error("❌ ASSEMBLYAI_API_KEY is not defined in your .env file");
    }
  }

  async handleIncomingAudio(companyId, audioBuffer, onTranscript) {
    try {
      // Get or create the transcriber for this company
      let transcriber = this.assemblyClients.get(companyId);
      
      // If no transcriber exists, create a new one
      if (!transcriber) {
        console.log(`🔧 Creating new AssemblyAI transcriber for ${companyId}`);
        
        // Create the client
        const client = new AssemblyAI({
          apiKey: this.apiKey
        });
        
        // Create the transcriber
        transcriber = client.realtime.transcriber({
          sampleRate: 16000,
          format: 'pcm',
          endpointing: 1000, // 1 second of silence for endpoint detection
        });
        
        // Set up event handlers
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
            // Only send final transcripts to maintain quality
            if (transcript.message_type === 'FinalTranscript') {
              console.log(`📝 Final transcript for ${companyId}:`, transcript.text);
              onTranscript(companyId, transcript.text);
            } else {
              // Log partial transcripts but don't send to client
              console.log(`🔄 Partial transcript for ${companyId}:`, transcript.text);
            }
          }
        });
        
        // Connect to the service
        console.log(`🔄 Connecting to AssemblyAI for ${companyId}...`);
        await transcriber.connect();
        
        // Store the transcriber for future use
        this.assemblyClients.set(companyId, transcriber);
      }
      
      // Send the audio data
      if (audioBuffer && audioBuffer.length > 0) {
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
        console.log(`🛑 Closed and removed AssemblyAI stream for ${companyId}`);
      }
    }
  }
}

export default SpeechRecognitionService;