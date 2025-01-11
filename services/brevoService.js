import Brevo from '@getbrevo/brevo';

export const sendBulkEmails = async (emails) => {
  try {
    console.log('[DEBUG] Starting sendBulkEmails with emails:', emails);

    // Initialize the API client
    const defaultClient = Brevo.ApiClient.instance;
    console.log('[DEBUG] Brevo API Client initialized');
    
    // Configure API key authorization
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }
    console.log('[DEBUG] API Key configured');

    const apiInstance = new Brevo.TransactionalEmailsApi();
    console.log('[DEBUG] TransactionalEmailsApi instance created');

    // Define subject and body
    const subject = 'Your Interview Invite';
    const body = `
      <p>Hello,</p>
      <p>This is a test invite for your interview on Job-Bolt.</p>
      <p>url: https://job-bolt.com/?jobID=BIBii97YBrgRrLZPae37&companyID=RWTb9Z2GGePwa4oGtOilfJeNbKZ2</p>
      <p>password: 302987</p>
      <p>Best regards,</p>
      <p>Job Bolt Team</p>
    `;

    // Create the email request
    const sendSmtpEmail = {
      sender: { email: 'stealth.mvp@gmail.com', name: 'Job Bolt' },
      to: emails.map((email) => ({ email })),
      subject: subject,
      htmlContent: body,
    };

    console.log('[DEBUG] Email request prepared:', JSON.stringify(sendSmtpEmail, null, 2));
    
    // Send the email
    console.log('[DEBUG] Attempting to send email...');
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('[DEBUG] Email sent successfully:', JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error('[BREVO ERROR] Full error object:', error);
    console.error('[BREVO ERROR] Error message:', error.message);
    console.error('[BREVO ERROR] Error response:', error.response?.data);
    console.error('[BREVO ERROR] Stack trace:', error.stack);
    
    throw new Error(`Brevo API Error: ${error.message}`);
  }
}