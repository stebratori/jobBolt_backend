// chatgptRoutes.js
import express from 'express';
import ChatGptService from '../services/chatGptService.js';

const router = express.Router();
const chatGptService = new ChatGptService()

// Route for sending messages to ChatGPT
router.post('/send-message', async (req, res, next) => {
  try {
    const { conversation } = req.body;
    const { reply, usage } = await chatGptService.sendMessage(conversation);
    res.json({ reply, usage });
  } catch (error) {
    next(error);
  }
});

router.post('/chat/questions/regenerate', async (req, res, next) => {
  try {
    const { allQuestions, questionToRegenerate, rejectedQuestions } = req.body;
    const { newQuestion } = await chatGptService.regenerateQuestion(allQuestions, questionToRegenerate, rejectedQuestions);
    res.json({ newQuestion });
  } catch (error) {
    next(error);
  }
});

// Route for generating interview questions
router.post('/generate-questions', async (req, res, next) => {
  try {
    const { startingPrompt, jobDescription } = req.body;
    const { questions, usage } = await chatGptService.generateQuestions(startingPrompt, jobDescription);
    res.json({ questions, usage });
  } catch (error) {
    next(error);
  }
});

export default router;
