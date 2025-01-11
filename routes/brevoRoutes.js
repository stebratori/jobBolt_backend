import express from 'express';
import { sendBulkEmails } from '../services/brevoService.js';

const router = express.Router();

// Route to send bulk emails
router.post('/send-emails', async (req, res, next) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Emails must be a non-empty array.' });
  }

  try {
    const response = await sendBulkEmails(emails);
    res.status(200).json({ message: 'Emails sent successfully!', response });
  } catch (error) {
    console.error('[BREVO ROUTE ERROR]:', error.message);
    next(error);
  }
});

export default router;
