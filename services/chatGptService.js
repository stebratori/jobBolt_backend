import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export default class ChatGptService {
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
      console.log("Usage object:", JSON.stringify(response.data?.usage, null, 2));

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
      console.log("Usage object:", JSON.stringify(response.data?.usage, null, 2));
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

  async regenerateQuestion(allQuestions, questionToRegenerate, rejectedQuestions) {
    try {
      // Generate the prompt using PromptService (without jobDescription)
      const prompt = PromptService.regenerationPrompt(allQuestions, questionToRegenerate, rejectedQuestions);
  
      // Send request to the AI API (e.g., OpenAI GPT)
      const response = await this.api.post('/chat/completions', {
        model: this.model,
        messages: [{ role: 'system', content: prompt }],
      });
  
      // Extract the generated question
      const newQuestion = response.data.choices[0].message.content.trim();
  
      return { newQuestion };
    } catch (error) {
      console.error('Error regenerating interview question:', error.response?.data || error.message);
      throw error;
    }
  }

  async regenerateQuestion(startingPrompt, jobDescription, allQuestions, questionToRegenerate, rejectedQuestions) {
    const regenerationPrompt = `
    You are an expert interviewer. Based on the following job description, generate a unique interview question that has not been generated before. The new question should not be the same as any of the previously generated questions or any rejected question.

    ### Job Description:
    ${jobDescription}

    ### Previously Generated Questions:
    ${allQuestions.map((q, index) => `${index + 1}. ${q}`).join("\n")}

    ### Question to Replace:
    ${questionToRegenerate}

    ### Previously Rejected Questions:
    ${rejectedQuestions.length > 0 ? rejectedQuestions.map((q, index) => `${index + 1}. ${q}`).join("\n") : "None"}

    ### Instructions:
    - Ensure the new question is unique.
    - Keep it relevant to the job description.
    - The question should be clear, professional, and suitable for an interview.
    - Do not repeat any of the previously generated or rejected questions.

    Generate **one** new interview question.
        `;

    const message = { role: 'system', content: regenerationPrompt };
    try {
        const response = await this.api.post('/chat/completions', {
            model: this.model,
            messages: [message],
        });

        console.log("Usage object:", JSON.stringify(response.data?.usage, null, 2));

        const newQuestion = response.data.choices[0].message.content.trim();
        
        return {
            newQuestion,
            completion_tokens: response.data?.usage.completion_tokens || null,
            prompt_tokens: response.data?.usage.prompt_tokens || null
        };
    } catch (error) {
        console.error('Error regenerating interview question:', error.response?.data || error.message);
        throw error;
    }
}


  async analyzeTheInterview(interviewAnalysisPrompt) {
    try {
      const message = { role: 'system', content: interviewAnalysisPrompt };
      const response = await this.api.post('/chat/completions', {
        model: this.model,
        messages: [message],
      });
      console.log("Usage object:", JSON.stringify(response.data?.usage, null, 2));

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
}