import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default class BrevoService {
  constructor() {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    if (!process.env.QUOTAGUARDSTATIC_URL) {
      throw new Error('QUOTAGUARDSTATIC_URL is not configured');
    }

    this.apiKey = process.env.BREVO_API_KEY;
    this.proxyAgent = new HttpsProxyAgent(process.env.QUOTAGUARDSTATIC_URL);
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
  }
    async sendBulkEmailsWithPasswords(emails, passwords, url, companyName, roleName) {
        try {
          if (!emails || !Array.isArray(emails)) {
            throw new Error('Emails must be a valid array');
          }
      
          if (!passwords || !Array.isArray(passwords)) {
            throw new Error('Passwords must be a valid array or else!');
          }
      
          if (!url) {
            throw new Error('URL is required');
          }
      
          if (emails.length !== passwords.length) {
            throw new Error('Emails and passwords arrays must have the same length.');
          }
      
          const subject = `${companyName} Has Invited You to an Interview!`;
      
          const sendSmtpEmail = {
            sender: {
              email: 'stealth.mvp@gmail.com',
              name: 'Job Bolt'
            },
            subject,
            htmlContent: '<p>This is a multi-version email.</p>', // required fallback
            messageVersions: emails.map((email, index) => {
              const urlWithParams = new URL(url);
              urlWithParams.searchParams.append('email', encodeURIComponent(email));
      
              return {
                to: [{ email }],
                subject,
                htmlContent: `
                  <p>Hello,</p>
                  <br>
                  <p><strong>${companyName}</strong> has invited you to complete an interview for <strong>${roleName}</strong>. Below, you'll find your unique interview link.</p>
                  <br>
                  <p><strong>Your Interview Link:</strong><br>
                  <a href="${urlWithParams.toString()}">${urlWithParams.toString()}</a></p>
                  <br>
                  <p><strong>Password:</strong> ${passwords[index]}</p>
                  <br><br>
                  <p>This interview will be conducted by an AI Interviewer, designed to function just like a live interviewer. Please treat this interview professionally and engage naturally, just as you would in any other job interview.</p>
                  <br>
                  <p><strong>How the Interview Works:</strong><br>
                  - The AI Interviewer will use your camera and microphone to simulate a real-time conversation.<br>
                  - After the AI asks a question, your microphone will turn on automatically.<br>
                  - Once you've finished answering, you must click the 'Done Talking' button to submit your response before moving on to the next question.<br>
                  - Please make sure you are in a quiet area for your interview.</p>
                  <br>
                  <p><strong>Before You Begin:</strong><br>
                  1. Grant access to your microphone and camera.<br>
                  2. Enter your name and the password included in this email.<br>
                  3. You will need to review and accept the Terms & Conditions and Privacy Policy.</p>
                  <br>
                  Important: Device & Browser Requirements
                  To ensure a smooth experience, please do not use a mobile phone for this interview.
                  You should use:
                    •	A laptop running Chrome or Safari
                    •	Or an iPad Pro using Chrome or Safari
                  <br>
                  <p><strong>Need Help?</strong><br>
                  If you experience any issues within the first few minutes of your interview, please stop the interview and email 
                  <a href="mailto:hello@job-bolt.com">hello@job-bolt.com</a> with your full name and the interview link provided above. Please also describe the problem.</p>
                  <br>
                  <p>When you're ready, click your interview link to get started. Good luck!</p>
                  <br>
                  <p>Best,<br>
                  The Job-Bolt Team</p>
                `
              };
            })
          };
      
      
          const response = await axios.post(this.apiUrl, sendSmtpEmail, {
            headers: {
              'Content-Type': 'application/json',
              'api-key': this.apiKey
            },
            httpsAgent: this.proxyAgent
          });
          console.log('[BREVO DEBUG] Success response:', {
            status: response.status,
            data: response.data
          });
      
          return response;
        } catch (error) {
          console.error('[BREVO ERROR] Full error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
      
          throw new Error(`Brevo API Error: ${error.message}`);
        }
      }
      
    
}
