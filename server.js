import 'dotenv/config';
import express from 'express';
import cors from 'cors'; 
import { createServer } from 'http';
import WebSocketService from './services/webSocketService.js'; 

// Routes
import chatGptRoutes from './routes/chatGptRoutes.js';
import brevoRoutes from './routes/brevoRoutes.js';
import firebaseRoutes from './routes/firebaseRoutes.js';
import analyzeInterviewRoutes from './routes/analyzeInterviewRoutes.js';

// Services
import StripeService from './services/stripeService.js';
import HeyGenService from './services/heyGenService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Create an HTTP server for both Express and WebSocket
const server = createServer(app);
const webSocketService = new WebSocketService(server);

console.log("🚀 WebSocket server initialized!");

// Expose WebSocket messaging for other modules
export const sendWebSocketMessage = (companyId, message) => {
  webSocketService.sendMessage(companyId, message);
};

app.use(cors({
  origin: ['https://job-bolt.com', 'http://localhost:5555'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  credentials: true // Allow cookies and credentials
}));

// Stripe webhook setup
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeEndpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const stripe = new StripeService(stripeSecretKey, stripeEndpointSecret);
const heyGenService = new HeyGenService();

// Stripe webhook route - must come before other routes that use express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  console.log(`Stripe Webhook received`);
  stripe.handleWebhook(req, res);
});

// Configure middleware based on route (should come second)
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Routes (at the end)
app.use('/api/chatgpt', chatGptRoutes);
app.use('/api/brevo', brevoRoutes);
app.use('/api/firebase', firebaseRoutes);
app.use('/api/analyze', analyzeInterviewRoutes);

// Stripe
app.post('/create-checkout-session', async (req, res) => {
  console.log(`Creating checkout session...`);
  try {
    const session = await stripe.createCheckoutSession(req.body);
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hey Gen
app.get('/api/heygen/token', async (req, res) => {
  try {
    const token = await heyGenService.generateToken();
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate HeyGen token' });
  }
});

// Default route for "/"
app.get('/', (req, res) => {
  res.send('Welcome to the Job Bolt API <3');
});

// Global error handler with detailed error information
app.use((err, req, res, next) => {
  console.error('Detailed Error:', {
    message: err.message,
    stack: err.stack,
    details: err.response?.data || err.response || err
  });

  res.status(500).json({
    error: 'An internal server error occurred.',
    details: err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      response: err.response?.data
    })
  });
});

// Start the HTTP & WebSocket server
server.listen(PORT, () => {
  console.log(`Ljubav svima <3`);
});