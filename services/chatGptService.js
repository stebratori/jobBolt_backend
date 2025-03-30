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
    const MAX_RETRIES = 3;
    let attempt = 0;
  
    while (attempt < MAX_RETRIES) {
      const start = Date.now();
      try {
        attempt++;
        const response = await this.api.post(
          '/chat/completions',
          {
            model: this.model,
            messages: conversation,
          },
          {
            timeout: 6000, // Set timeout per request
          }
        );
  
        const duration = Date.now() - start;
        console.log(`[ChatGPT] Response time (attempt ${attempt}): ${duration}ms`);
  
        const reply = response.data?.choices[0]?.message?.content;
        const completion_tokens = response.data?.usage?.completion_tokens || null;
        const prompt_tokens = response.data?.usage?.prompt_tokens || null;
  
        if (!reply) throw new Error('Empty response from ChatGPT');
        return { reply, completion_tokens, prompt_tokens };
      } catch (error) {
        const duration = Date.now() - start;
        const errorMsg = error.code === 'ECONNABORTED' ? 'Request timed out' : error.message;
        console.warn(`[ChatGPT] Attempt ${attempt} failed after ${duration}ms:`, errorMsg);
  
        if (attempt >= MAX_RETRIES) {
          throw new Error(`ChatGPT failed after ${MAX_RETRIES} attempts: ${errorMsg}`);
        }
      }
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


  async analyzeTheInterview(jobDescription, questionAnswerPairs) {
    console.log("🚀 [ChatGptService] Sending interview analysis to OpenAI...");

    try {
      const systemPrompt = PromptService.getInterviewAnalysisSystemPrompt();

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Job Description:\n${jobDescription}` },
        ...questionAnswerPairs.map((pair, index) => ({
          role: 'user',
          content: `Question ${index + 1}: ${pair.question}\nAnswer: ${pair.answer}`,
        })),
        {
          role: 'user',
          content: `Now please analyze the entire interview and return your response using the specified JSON format.`,
        },
      ];

      const response = await this.api.post('/chat/completions', {
        model: this.model,
        messages,
      });

      console.log("✅ [ChatGptService] OpenAI response data:", response.data);

      const reply = response.data?.choices?.[0]?.message?.content;
      if (!reply) throw new Error('No reply from ChatGPT');

      return { reply };

    } catch (error) {
      console.error("❌ [ChatGptService] Error:", error.message);
      throw error;
    }
  }

  async analyzeInterviewInChunks(jobDescription, questionAnswerPairs, systemPrompt) {
    console.log("🚀 [ChatGptService] Starting chunked interview analysis...");
    
    const MAX_RETRIES = 3;
    let attempt = 0;
    
    if (!Array.isArray(questionAnswerPairs) || questionAnswerPairs.length === 0) {
      throw new Error('❌ No valid question-answer pairs provided.');
    }
    
    const baseMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Job Description:\n${jobDescription}` },
    ];
    
    // Create proper conversation flow with alternating roles
    const qaMessages = [];
    questionAnswerPairs.forEach((pair) => {
      qaMessages.push({
        role: 'assistant', // Interviewer asks questions
        content: pair.question
      });
      qaMessages.push({
        role: 'user', // Candidate gives answers
        content: pair.answer
      });
    });
    
    const messages = [
      ...baseMessages,
      ...qaMessages,
      {
        role: 'user',
        content: `Now please analyze the entire interview and return your response using the specified JSON format.`
      }
    ];
    
    // Add token estimation and warning
    const estimatedTokens = messages.reduce((acc, msg) => acc + (msg.content ? msg.content.length / 4 : 0), 0);
    console.log(`📊 [ChatGptService] Estimated token count: ~${Math.round(estimatedTokens)}`);
    
    // Warning thresholds based on common model limits
    if (estimatedTokens > 15000) {
      console.warn("⚠️ [ChatGptService] CRITICAL: Request likely exceeds token limit of 16K!");
    } else if (estimatedTokens > 12000) {
      console.warn("⚠️ [ChatGptService] WARNING: Request approaching 16K token limit!");
    } else if (estimatedTokens > 7000) {
      console.warn("⚠️ [ChatGptService] CAUTION: Request may exceed 8K token limit for some models");
    }
    
    // Log the FULL request payload for debugging
    console.log("📝 [ChatGptService] FULL REQUEST PAYLOAD:");
    console.log(JSON.stringify({
      model: this.model,
      messages: messages
    }, null, 2));
    
    while (attempt < MAX_RETRIES) {
      const start = Date.now();
      try {
        attempt++;
        console.log(`🔄 Attempt ${attempt}: Sending request to ChatGPT...`);
        
        const response = await this.api.post(
          '/chat/completions',
          {
            model: this.model,
            messages,
          },
          {
            timeout: 90000, // ⏱️ 90 second timeout
          }
        );
    
        const duration = Date.now() - start;
        console.log(`[ChatGPT] Interview analysis response time (attempt ${attempt}): ${duration}ms`);
    
        const assistantReply = response.data?.choices?.[0]?.message?.content;
    
        if (!assistantReply) {
          throw new Error('❌ No reply from ChatGPT');
        }
    
        console.log("✅ Interview analysis received.");
        return { reply: assistantReply };
    
      } catch (error) {
        const duration = Date.now() - start;
        const errorMsg = error.code === 'ECONNABORTED' ? 'Request timed out' : error.message;
        console.warn(`[ChatGPT] Attempt ${attempt} failed after ${duration}ms:`, errorMsg);
        
        // Log more detailed error information
        if (error.response) {
          console.error('Error response data:', JSON.stringify(error.response.data));
          console.error('Error response status:', error.response.status);
        } else if (error.request) {
          console.error('No response received');
        }
    
        if (attempt >= MAX_RETRIES) {
          console.error("❌ [ChatGptService] Chunked analysis failed:", errorMsg);
          throw new Error(`ChatGPT failed after ${MAX_RETRIES} attempts: ${errorMsg}`);
        }
        
        // Add a small delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  
  



}