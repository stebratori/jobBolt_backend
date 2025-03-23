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
    async sendBulkEmailsWithPasswords(emails, passwords, url) {
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
                subject: 'Your Interview Invite',
                htmlContent: `
                    <p>Hello,</p>
                    <p>You have been invited for an interview on Job-Bolt.</p>
                    <p>Please use the following credentials to access your interview.</p>
                    <p>Best regards,</p>
                    <p>Job Bolt Team</p>
                `,
                messageVersions: emails.map((email, index) => {
                    // Construct the URL with email and password parameters
                    const urlWithParams = new URL(url);
                    urlWithParams.searchParams.append('email', encodeURIComponent(email));
                    
                    return {
                        to: [{
                            email: email
                        }],
                        subject: 'Your Interview Invite',
                        htmlContent: `
                            <p>Hello,</p>
                            <p>You have been invited for an interview on Job-Bolt.</p>
                            <p>Please use the following credentials to access your interview:</p>
                            <p>URL: <a href="${urlWithParams.toString()}">${urlWithParams.toString()}</a></p>
                            <p><strong>Password:</strong> ${passwords[index]}</p>
                            <p>Best regards,</p>
                            <p>Job Bolt Team</p>
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
