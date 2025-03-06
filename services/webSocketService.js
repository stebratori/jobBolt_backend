import { WebSocketServer } from 'ws';

class WebSocketService {
    constructor(server) {
        console.log("🚀 Initializing WebSocket server..."); // Debug log
        this.wss = new WebSocketServer({ server });
        this.connectedClients = new Map(); // Stores companyId -> WebSocket instance

        this.wss.on('connection', (ws, req) => {
            console.log("✅ New WebSocket connection attempt");

            // ✅ Keep connection alive by sending pings
            const keepAlive = setInterval(() => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify({ type: "ping" }));
                } else {
                    clearInterval(keepAlive);
                }
            }, 50000);

            // ✅ Call handleConnection to register the client
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

        ws.on('close', () => this.handleDisconnect(companyId));
        ws.on('error', (error) => console.error(`⚠️ WebSocket error for companyId ${companyId}:`, error));
    }

    handleDisconnect(companyId) {
        if (companyId) {
            this.connectedClients.delete(companyId);
            console.log(`❌ WebSocket client disconnected for companyId: ${companyId}`);
        }
    }

    sendMessage(companyId, message) {
        const clientSocket = this.connectedClients.get(companyId);
        if (clientSocket && clientSocket.readyState === clientSocket.OPEN) {
            clientSocket.send(JSON.stringify(message));
            console.log(`📩 WebSocket sent to company ${companyId}:`, message);
        } else {
            console.error(`❌ WebSocket send failed for ${companyId} - no active connection`);
        }
    }
}

export default WebSocketService;
