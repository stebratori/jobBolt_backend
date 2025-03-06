import { WebSocketServer } from 'ws';

class WebSocketService {
    constructor(server) {
        this.wss = new WebSocketServer({ server });
        this.connectedClients = new Map(); // Stores companyId -> WebSocket instance

        this.wss.on('connection', (ws, req) => {
            console.log(`✅ WebSocket connected!`);
            
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
        }); // ✅ Closed the on('connection') block properly
    }

    handleConnection(ws, req) {
        const params = new URLSearchParams(req.url?.split('?')[1]);
        const companyId = params.get('companyId');

        if (companyId) {
            this.connectedClients.set(companyId, ws);
            console.log(`WebSocket client connected for companyId: ${companyId}`);
        }

        ws.on('close', () => this.handleDisconnect(companyId));
        ws.on('error', (error) => console.error(`WebSocket error for companyId ${companyId}:`, error));
    }

    handleDisconnect(companyId) {
        if (companyId) {
            this.connectedClients.delete(companyId);
            console.log(`WebSocket client disconnected for companyId: ${companyId}`);
        }
    }

    sendMessage(companyId, message) {
        const clientSocket = this.connectedClients.get(companyId);
        if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify(message));
            console.log(`[WebSocket] Sent message to company ${companyId}:`, message);
        }
    }
}

export default WebSocketService;
