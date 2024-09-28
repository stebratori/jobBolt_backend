require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit'); // For rate limiting
const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

// Middleware to validate the client API key
app.use((req, res, next) => {
  const clientApiKey = req.headers['x-api-key'];
  if (clientApiKey !== process.env.CLIENT_API_KEY) {
    return res.status(403).send('Forbidden: Invalid API Key');
  }
  next();
});

// Endpoint to handle 