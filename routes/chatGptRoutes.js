// chatgptRoutes.js
import express from 'express';
import {
  handleChatGPTMessage,
  handleChatGPTConversation
} from '../services/chatGptService.js';

const router = express.Router();

// Route for handling ChatGPT text messages
router.post('/', async (req, res, next) => {
  try {
    const response = await handleChatGPTMessage(req.body.message);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Route for handling ChatGPT conversation with history
router.post('/conversation', async (req, res, next) => {
  try {
    const response = await handleChatGPTConversation(req.body.messages);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
