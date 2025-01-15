import axios from 'axios';

export default class HeyGenService {
  constructor() {
    this.apiKey = process.env.HEYGEN_API_KEY;
    this.apiUrl = 'https://api.heygen.com/v1/streaming.create_token';

    if (!this.apiKey) {
      throw new Error('HEYGEN_API_KEY is not defined in the environment variables');
    }
  }

  async generateToken() {
    try {
      const response = await axios.post(this.apiUrl, {}, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;

      if (!data || !data.data || !data.data.token) {
        throw new Error('Token not found in response');
      }

      return data.data.token;
    } catch (error) {
      console.error('[HeyGenService] Error generating token:', error.message);
      throw error;
    }
  }
}
