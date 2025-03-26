import { WebSocketServer } from 'ws';
import SpeechRecognitionService from './speechRecognitionService.js';

class WebSocketService {
    constructor(server) {
        console.log("🚀 Initializing WebSocket server...");
        this.wss = new WebSocketServer({ server });
        this.connectedClients = new Map();
        this.speechService = new SpeechRecognitionService();
        this.audioStartTimestamps = new Map(); // Track when audio is received

        this.wss.on('connection', (ws, req) => {
            console.log("✅ New WebSocket connection attempt");

            const keepAlive = setInterval(() => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: "ping" }));
                } else {
                    clearInterval(keepAlive);
                }
            }, 30000);

            this.handleConnection(ws, req);
        });

        console.log("✅ WebSocket server setup complete!");
    }

    handleConnection(ws, req) {
        if (!req.url) {
            console.error("❌ WebSocket error: Missing request URL");
            ws.close();
            return;
        }

        const params = new URLSearchParams(req.url.split('?')[1]);
        const companyId = params.get('companyId');

        if (!companyId) {
            console.error("❌ WebSocket error: Missing companyId");
            ws.close();
            return;
        }

        this.connectedClients.set(companyId, ws);
        console.log(`✅ WebSocket client connected for companyId: ${companyId}`);

        ws.on('message', async (data) => {
            if (ws.readyState === ws.OPEN) {
                const audioStart = Date.now();
                this.audioStartTimestamps.set(companyId, audioStart);
                console.log(`🎧 Audio received for ${companyId} at ${new Date(audioStart).toISOString()}`);

                await this.speechService.handleIncomingAudio(
                    companyId,
                    data,
                    this.broadcastTranscript.bind(this)
                );
            }
        });

        ws.on('close', () => {
            console.log(`🔌 WebSocket connection closed for companyId: ${companyId}`);
            this.handleDisconnect(companyId);
        });

        ws.on('error', (error) => {
            console.error(`⚠️ WebSocket error for companyId ${companyId}:`, error);
            this.handleDisconnect(companyId);
        });
    }

    handleDisconnect(companyId) {
        if (companyId) {
            this.connectedClients.delete(companyId);
            this.audioStartTimestamps.delete(companyId);
            this.speechService.stopAssemblyStream(companyId);
            console.log(`❌ WebSocket client disconnected for companyId: ${companyId}`);
        }
    }

    sendMessage(companyId, message) {
        const clientSocket = this.connectedClients.get(companyId);
        if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
            clientSocket.send(JSON.stringify(message));
            console.log(`📩 WebSocket sent to company ${companyId}:`, message.type);
        } else {
            console.error(`❌ WebSocket send failed for ${companyId} - no active connection`);
        }
    }

    broadcastTranscript(companyId, text) {
        const audioStart = this.audioStartTimestamps.get(companyId);
        const now = Date.now();
        const elapsed = audioStart ? `${now - audioStart}ms` : 'unknown';

        console.log(`📤 Sending transcript to frontend for ${companyId} after ${elapsed}: ${text}`);

        const message = {
            type: 'TRANSCRIPT',
            text,
            durationMs: audioStart ? now - audioStart : null
        };

        this.sendMessage(companyId, message);
    }
}

export default WebSocketService;
