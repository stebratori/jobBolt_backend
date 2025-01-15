import 'dotenv/config';
import express from 'express';
import cors from 'cors'; 
import chatGptRoutes from './routes/chatGptRoutes.js';
import brevoRoutes from './routes/brevoRoutes.js';
import StripeService from './services/stripeService.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://job-bolt.com', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5555'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  credentials: true // Allow cookies and credentials
}));

// Stripe webhook setup
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeEndpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const stripe = new StripeService(stripeSecretKey, stripeEndpointSecret);

// Configure middleware based on route
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Routes
app.use('/api/chatgpt', chatGptRoutes);
app.use('/api/brevo', brevoRoutes);

// Middleware to conditionally apply JSON parsing
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next(); // Skip JSON body parsing for the webhook route
  } else {
    express.json()(req, res, next); // Parse JSON for all other routes
  }
});

// Stripe webhook route - must come before other routes that use express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  stripe.handleWebhook(req, res);
});

app.post('/create-checkout-session', async (req, res) => {
  try {
    const session = await stripe.createCheckoutSession(req.body);
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// Default route for "/"
app.get('/', (req, res) => {
  res.send('Welcome to the Job Bolt API <3');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Ljubav svima <3`);
});