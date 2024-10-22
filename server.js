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
        timeout: 30000,
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
        timeout: 30000,
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
        timeout: 30000,
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

// HEYGEN
// New endpoint to generate video from text
app.post('/generate-video', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: '[Heroku] Text is required to generate a video with HeyGen' });
  }
  console.log(`[Heroku][HeyGen] Generate video with text: ${text}`);

  try {
    const videoResponse = await createVideoFromText(text);
    if (!videoResponse || !videoResponse.video_id) {
      return res.status(500).json({ error: '[Heroku] Failed to create video.' });
    }
    console.log(`[Heroku][HeyGen] Video ID: ${videoResponse.video_id}`);

    const videoURL = await fetchVideoURL(videoResponse.video_id);
    if (!videoURL) {
      return res.status(500).json({ error: '[Heroku] Failed to fetch video URL.' });
    }
    console.log(`[Heroku][HeyGen] Video URL: ${videoURL}`);

    res.json({ videoURL });
  } catch (error) {
    logError('[Heroku] Generate Video', error);
    res.status(500).json({ error: '[Heroku] Error generating video.' });
  }
});

// Helper function: Create video from text
async function createVideoFromText(text) {
  try {
    const response = await axios.post(
      'https://api.heygen.com/v2/video/generate',
      {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: 'Daisy-inskirt-20220818',
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: text,
              voice_id: '2d5b0e6cf36f460aa7fc47e3eee4ba54',
            },
            background: {
              type: 'color',
              value: '#008000',
            },
          },
        ],
        dimension: { width: 1000, height: 562 },
        aspect_ratio: '16:9',
        test: true,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': process.env.HEYGEN_API_KEY,
        },
        timeout: 30000,
      }
    );
    return response.data.data;
  } catch (error) {
    logError('[Heroku] Create Video from Text', error);
    throw new Error(`[Heroku] Failed to create video with text: ${text}`);
  }
}

// Helper function: Fetch video URL by video ID with retries
// Helper function: Fetch video URL by video ID with extended retry logic
async function fetchVideoURL(videoID, retries = 30, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Heroku][HeyGen] Attempt ${i + 1} to fetch video URL for ID: ${videoID}`);
      
      // Make API call to fetch video URL
      const response = await axios.get(
        `https://api.heygen.com/v2/video_status.get?video_id=${videoID}`,
        {
          headers: {
            'X-Api-Key': process.env.HEYGEN_API_KEY,
          },
          timeout: 30000,
        }
      );

      // Check if the video URL is available
      const videoData = response.data.data;
      if (videoData && videoData.video_url) {
        console.log(`[Heroku][HeyGen] Video URL found: ${videoData.video_url}`);
        return videoData.video_url;
      } else {
        console.log(`[Heroku] Video not ready yet. Waiting for ${delay / 1000} seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay)); // Wait for the delay
      }
    } catch (error) {
      logError('[Heroku] Fetch Video URL', error);
      await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying after an error
    }
  }
  throw new Error('[Heroku] Exhausted retries. Failed to fetch video URL within the given time.');
}


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
