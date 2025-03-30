import Brevo from '@getbrevo/brevo';

export default class BrevoService {
    constructor() {
        if (!process.env.BREVO_API_KEY) {
            throw new Error('BREVO_API_KEY is not configured');
        }

        // Initialize the API client
        const defaultClient = Brevo.ApiClient.instance;
        this.apiKey = defaultClient.authentications['api-key'];
        this.apiKey.apiKey = process.env.BREVO_API_KEY;

        this.apiInstance = new Brevo.TransactionalEmailsApi();
    }

    /**
     * Sends bulk emails with individual passwords to candidates.
     * @param {string[]} emails - List of recipient emails.
     * @param {string[]} passwords - Corresponding list of passwords.
     * @param {string} url - Interview link to include in the email.
     * @returns {Promise<Object>} - API response from Brevo.
     */
    async sendBulkEmailsWithPasswords(emails, passwords, url, companyName, roleName) {
        try {
            if (!emails || !Array.isArray(emails)) {
                throw new Error('Emails must be a valid array');
            }
    
            if (!passwords || !Array.isArray(passwords)) {
                throw new Error('Passwords must be a valid array');
            }
    
            if (!url) {
                throw new Error('URL is required');
            }
    
            if (emails.length !== passwords.length) {
                throw new Error('Emails and passwords arrays must have the same length.');
            }
    
            const sendSmtpEmail = {
                sender: {
                    email: 'stealth.mvp@gmail.com',
                    name: 'Job Bolt'
                },
                subject: `${companyName} Has Invited You to an Interview!`,
                htmlContent: '', // This will be overridden by `messageVersions`
                messageVersions: emails.map((email, index) => {
                    const urlWithParams = new URL(url);
                    urlWithParams.searchParams.append('email', encodeURIComponent(email));
    
                    return {
                        to: [{ email }],
                        subject: `${companyName} Has Invited You to an Interview!`,
                        htmlContent: `
                            <p>Hello,</p>
    
                            <p><strong>${companyName}</strong> has invited you to complete an interview for ${roleName} role. Below, you'll find your unique interview link.</p>
    
                            <p><strong>Your Interview Link: </strong><br>
                            <a href="${urlWithParams.toString()}">${urlWithParams.toString()}</a></p>
    
                            <p>This interview will be conducted by an AI Interviewer, designed to function just like a live interviewer. Please treat this interview professionally and engage naturally, just as you would in any other job interview.</p>
    
                            <p><strong>How the Interview Works:</strong><br>
                            - The AI Interviewer can see and hear you, so interact as you would in a face-to-face interview.<br>
                            - After the AI asks a question, your microphone will turn on automatically.<br>
                            - Once you've finished answering, you must click the 'Done Talking' button to submit your response before moving on to the next question. Please make sure you are in a quiet area for your interview.</p>
    
                            <p><strong>Before You Begin:</strong><br>
                            1. Grant access to your microphone and camera.<br>
                            2. Enter your name and the password included in this email.<br>
                            3. You will need to review and accept the Terms & Conditions and Privacy Policy.</p>
    
                            <p><strong>Password: </strong> ${passwords[index]}</p>
    
                            <p><strong>Need Help?</strong><br>
                            If you experience any issues within the first few minutes of your interview, please stop the interview and email <a href="mailto:hello@jobbolt.com">hello@jobbolt.com</a> with your full name and the interview link provided above. Please also describe the problem.</p>
    
                            <p>When you're ready, click your interview link to get started. Good luck!</p>
    
                            <p>Best,<br>
                            The Job-Bolt Team</p>
                        `
                    };
                })
            };
    
            console.log('[BREVO DEBUG] Sending request:', JSON.stringify(sendSmtpEmail, null, 2));
    
            const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('[BREVO DEBUG] Success response:', JSON.stringify(response, null, 2));
    
            return response;
        } catch (error) {
            console.error('[BREVO ERROR] Full error:', {
                message: error.message,
                response: error.response?.text,
                body: error.response?.body
            });
    
            throw new Error(`Brevo API Error: ${error.message}`);
        }
    }
    
}
