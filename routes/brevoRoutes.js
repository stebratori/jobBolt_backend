import express from 'express';
import BrevoService from '../services/brevoService.js';
import UserService from '../services/userService.js';
import {verifyToken} from "@clerk/express";

const router = express.Router();
const brevoService = new BrevoService();

// Route to send bulk emails
router.post('/send-emails',verifyToken, async (req, res, next) => {
  try {
    const { emails, companyID, jobID, } = req.body;
    // Validate required fields first
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Emails must be a non-empty array.' });
    }
    if (!companyID) {
      return res.status(400).json({ error: 'companyID is required.' });
    }
    if (!jobID) {
      return res.status(400).json({ error: 'jobID is required.' });
    }

    const url = `https://job-bolt.com/?jobID=${jobID}&companyID=${companyID}`;

    const { emailsArray, passwordsArray } = await UserService.generateUsersAndPasswordsForEmails(emails, companyID, jobID,);

    const response = await brevoService.sendBulkEmailsWithPasswords(emailsArray, passwordsArray, url);
    
    res.status(200).json({ message: 'Emails sent successfully!', response });
  } catch (error) {
    console.error('[BREVO ROUTE ERROR]:', error.message);
    next(error);
  }
});

export default router;
