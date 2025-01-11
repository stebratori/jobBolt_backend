// chatgptService.js
import axios from 'axios';

// Function to handle ChatGPT text-based message
export const handleChatGPTMessage = async (message) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [{ role: 'user', content: message }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    return { reply: response.data.choices[0].message.content };
  } catch (error) {
    console.error('Error communicating with ChatGPT:', error.message);
    throw new Error('Failed to communicate with ChatGPT');
  }
};

// Function to handle ChatGPT with conversation history
export const handleChatGPTConversation = async (conversationHistory) => {
  try {
    if (!Array.isArray(conversationHistory)) {
      throw new Error('Invalid request. Expected an array of messages.');
    }

    const chatResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: conversationHistory,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const reply = chatResponse.data.choices[0].message.content;
    return { reply };
  } catch (error) {
    console.error('Error handling ChatGPT conversation:', error.message);
    throw new Error('Failed to handle ChatGPT conversation');
  }
};
