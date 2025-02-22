import Brevo from '@getbrevo/brevo';

export const sendBulkEmailsWithPasswords = async (emails, passwords, url) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }
    // Initialize the API client
    const defaultClient = Brevo.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    const apiInstance = new Brevo.TransactionalEmailsApi();

    // Validate input length
    if (emails.length !== passwords.length) {
      throw new Error('Emails and passwords arrays must have the same length.');
    }

    // Create email objects with individual passwords
    const messageVersions = emails.map((email, index) => ({
      to: [{ email }],
      subject: 'Your Interview Invite',
      htmlContent: `
        <p>Hello,</p>
        <p>This is a test invite for your interview on Job-Bolt.</p>
        <p>url: ${url}</p>
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
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[DEBUG] Email sent successfully:', JSON.stringify(response, null, 2));

    return response;
  } catch (error) {
    console.error('[BREVO ERROR] Error message:', error.message);
    console.error('[BREVO ERROR] Stack trace:', error.stack);

    throw new Error(`Brevo API Error: ${error.message}`);
  }
}