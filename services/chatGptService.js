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
      console.log("Full OpenAI API Response for sendMessage:", JSON.stringify(response.data, null, 2));

      const reply = response.data?.choices[0]?.message?.content;
      const completion_tokens = response.data?.usage?.completion_tokens || null;
      const prompt_tokens = response.data?.usage?.prompt_tokens || null;

      if (!reply) {
        throw new Error('Failed to retrieve a valid response from ChatGPT');
      }
      return { reply, completion_tokens, prompt_tokens };
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
      console.log("Full OpenAI API Response for generateQuestions:", JSON.stringify(response.data, null, 2));
      const questionsText = response.data.choices[0].message.content;
      const questionsArray = questionsText
        .split('<Q>')
        .map(question => question.trim())
        .filter(question => question.length > 0);
      return {
        questions: questionsArray,
        completion_tokens: response.data?.usage.completion_tokens || null,
        prompt_tokens: response.data?.usage.prompt_tokens || null
      };
    } catch (error) {
      console.error('Error generating interview questions:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new ChatGptService();