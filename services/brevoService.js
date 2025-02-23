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
            // Validate input length
            if (emails.length !== passwords.length) {
                throw new Error('Emails and passwords arrays must have the same length.');
            }

            // Prepare email content for each recipient
            const messageVersions = emails.map((email, index) => ({
                to: [{ email }],
                subject: 'Your Interview Invite',
                htmlContent: `
                    <p>Hello,</p>
                    <p>This is a test invite for your interview on Job-Bolt.</p>
                    <p>URL: <a href="${url}">${url}</a></p>
                    <p><strong>Password:</strong> ${passwords[index]}</p>
                    <p>Best regards,</p>
                    <p>Job Bolt Team</p>
                `,
            }));

            // Create the email request
            const sendSmtpEmail = {
                sender: { email: 'stealth.mvp@gmail.com', name: 'Job Bolt' },
                messageVersions,
            };

            console.log('[DEBUG] Email request prepared:', JSON.stringify(sendSmtpEmail, null, 2));

            // Send the email
            console.log('[DEBUG] Attempting to send email...');
            const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('[DEBUG] Email sent successfully:', JSON.stringify(response, null, 2));

            return response;
        } catch (error) {
            console.error('[BREVO ERROR] Error message:', error.message);
            console.error('[BREVO ERROR] Stack trace:', error.stack);
            throw new Error(`Brevo API Error: ${error.message}`);
        }
    }
}
