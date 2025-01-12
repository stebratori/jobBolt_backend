import 'dotenv/config';
import express from 'express';
import chatGptRoutes from './routes/chatGptRoutes.js';
import brevoRoutes from './routes/brevoRoutes.js';
import StripeWebhook from './services/stripe_webhook.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe webhook setup
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeEndpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
const stripeWebhook = new StripeWebhook(stripeSecretKey, stripeEndpointSecret);

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

// Stripe webhook route - must come before other routes that use express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  stripeWebhook.handleWebhook(req, res);
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
  res.send('Welcome to the Job Bolt API!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});