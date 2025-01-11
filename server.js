import 'dotenv/config';
import express from 'express';
import chatGptRoutes from './routes/chatGptRoutes.js';
import brevoRoutes from './routes/brevoRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Routes
app.use('/api/chatgpt', chatGptRoutes);
app.use('/api/brevo', brevoRoutes);

// Global error handler with detailed error information
app.use((err, req, res, next) => {
  console.error('Detailed Error:', {
    message: err.message,
    stack: err.stack,
    details: err.response?.data || err.response || err
  });

  // Send detailed error in development
  res.status(500).json({
    error: 'An internal server error occurred.',
    details: err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      response: err.response?.data
    })
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Brevo API Key exists:', !!process.env.BREVO_API_KEY);
});