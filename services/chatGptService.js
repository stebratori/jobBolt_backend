import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class ChatGptService {
  constructor() {
    this.model = 'gpt-4-turbo';
    
    // Configure axios instance with base URL and headers
    this.api = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });
  }

  async sendMessage(conversation) {
    try {
      const response = await this.api.post('/chat/completions', {
        model: this.model,
        messages: conversation,
      });
      const reply = response.data?.choices[0]?.message?.content;
      if (!reply) {
        throw new Error('Failed to retrieve a valid response from ChatGPT');
      }
      return {
        reply,
        usage: response.data?.usage || null
      };
    } catch (error) {
      console.error('Error communicating with ChatGPT API:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateQuestions(startingPrompt, jobDescription) {
    const questionGenerationPrompt = `${startingPrompt}\n\n${jobDescription}`;
    const message = { role: 'system', content: questionGenerationPrompt };
    try {
      const response = await this.api.post('/chat/completions', {
        model: this.model,
        messages: [message],
      });
      const questionsText = response.data.choices[0].message.content;
      const questionsArray = questionsText
        .split('<Q>')
        .map(question => question.trim())
        .filter(question => question.length > 0);
      return {
        questions: questionsArray,
        usage: response.data?.usage || null
      };
    } catch (error) {
      console.error('Error generating interview questions:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new ChatGptService();