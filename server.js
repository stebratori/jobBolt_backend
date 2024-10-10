//require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const axios = require('axios');
//const rateLimit = require('express-rate-limit'); // For rate limiting
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Endpoint to handle incoming messages
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    // Send the message to ChatGPT API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    // Send the ChatGPT response back to the client (e.g., curl, iOS app)
    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    if (error.response) {
      console.error('[Heroku] Error response data:', error.response.data);
    } else if (error.request) {
      console.error('[Heroku] No response received:', error.request);
    } else {
      console.error('[Heroku] Error setting up the request:', error.message);
    }
    res.status(500).send('[Heroku] Error communicating with ChatGPT');
  }
});

// New Voice Endpoint using Google Cloud TTS
app.post('/chat/voice', async (req, res) => {
  // Check if the incoming request contains an array or a single message
  const userMessages = Array.isArray(req.body.messages)
    ? req.body.messages
    : [{ role: 'user', content: req.body.message }];

  try {
    // Make the request to ChatGPT API
    const chatResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: userMessages,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const reply = chatResponse.data.choices[0].message.content;

    // Optionally make a TTS request (if you are using TTS)
    const ttsResponse = await axios.post(
      'https://texttospeech.googleapis.com/v1/text:synthesize',
      {
        input: { text: reply },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3' }
      },
      {
        params: { key: process.env.GOOGLE_TTS_API_KEY }
      }
    );

    const audioContent = ttsResponse.data.audioContent;
    res.json({ reply, audio: audioContent });

  } catch (error) {
    console.error('[Heroku] Error: ', error.message || error.response?.data || error.request);
    res.status(500).send('[Heroku] Error communicating with ChatGPT or TTS API');
  }
});

app.post('/chat/voice/completions', async (req, res) => {
  try {
    const conversationHistory = req.body.messages;

    if (!Array.isArray(conversationHistory)) {
      return res.status(400).send('Invalid request. Expected an array of messages.');
    }

    console.log(`[Heroku] Sending conversation history to OpenAI: ${JSON.stringify(conversationHistory)}`);

    // ChatGPT API call
    const chatResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: conversationHistory,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    // Log the full response in case of error
    if (chatResponse.status !== 200) {
      console.error(`[Heroku] OpenAI API returned non-200 response: ${chatResponse.status}`);
      console.error(`[Heroku] OpenAI API response data:`, chatResponse.data);
      return res.status(chatResponse.status).send('Error communicating with ChatGPT API');
    }

    const reply = chatResponse.data.choices[0].message.content;
    console.log(`[Heroku] ChatGPT Reply: ${reply}`);

    // Google TTS API call
    const ttsResponse = await axios.post(
      'https://texttospeech.googleapis.com/v1/text:synthesize',
      {
        input: { text: reply },
        voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
        audioConfig: { audioEncoding: 'MP3' }
      },
      {
        params: { key: process.env.GOOGLE_TTS_API_KEY }
      }
    );

    // Log the full response in case of error
    if (ttsResponse.status !== 200) {
      console.error(`[Heroku] Google TTS API returned non-200 response: ${ttsResponse.status}`);
      console.error(`[Heroku] Google TTS API response data:`, ttsResponse.data);
      return res.status(ttsResponse.status).send('Error communicating with Google TTS API');
    }

    const audioContent = ttsResponse.data.audioContent;

    // Send back the reply and the audio content
    res.json({ reply, audio: audioContent });

  } catch (error) {
    console.error(`[Heroku] General error: ${error.message}`);
    if (error.response) {
      console.error(`[Heroku] Response data:`, error.response.data);
    } else if (error.request) {
      console.error(`[Heroku] No response received:`, error.request);
    } else {
      console.error(`[Heroku] Error setting up the request:`, error.message);
    }
    res.status(500).send('Error communicating with ChatGPT or TTS API');
  }
});


// A function to log errors with better readability
function logError(location, error) {
    console.error(`[Heroku] Error in ${location}: ${error.message}`);
    if (error.response) {
        console.error(`[Heroku] Response data:`, error.response.data);
    } else if (error.request) {
        console.error(`[Heroku] No response received:`, error.request);
    } else {
        console.error(`[Heroku] Request setup error:`, error.message);
    }
}

// Start the server
app.listen(PORT, () => {
  console.log(`[Heroku] Server is running on port ${PORT}`);
});


// Rate limiting middleware
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // Limit each IP to 100 requests per `window` (15 minutes)
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

// // Apply the rate limiting middleware to all requests
// app.use(limiter);

// Middleware to validate the client API key
// app.use((req, res, next) => {
//   const clientApiKey = req.headers['x-api-key'];
//   if (clientApiKey !== process.env.CLIENT_API_KEY) {
//     return res.status(403).send('Forbidden: Invalid x-api-key');
//   }
//   next();
// });
