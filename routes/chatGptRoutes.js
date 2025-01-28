// chatgptRoutes.js
import express from 'express';
import chatGptService from '../services/chatGptService.js';

const router = express.Router();

// Route for sending messages to ChatGPT
router.post('/send-message', async (req, res, next) => {
  try {
    const { conversation } = req.body;
    const response = await chatGptService.sendMessage(conversation);
    res.json({ response });
  } catch (error) {
    next(error);
  }
});

// Route for generating interview questions
router.post('/generate-questions', async (req, res, next) => {
  try {
    const { startingPrompt, jobDescription } = req.body;
    const questions = await chatGptService.generateQuestions(startingPrompt, jobDescription);
    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

export default router;
