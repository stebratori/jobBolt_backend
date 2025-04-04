// firebaseRoutes.js
import express from 'express';
import FirebaseService from '../services/firebaseService.js';

const router = express.Router();
const firebaseService = new FirebaseService();

// Route for getting all Job Posts of a company by companyID
router.get('/job-postings/:companyId', async (req, res, next) => {
  const { companyId } = req.params;
  try {
    const jobPostings = await firebaseService.getJobPostingsByCompanyId(companyId); 
    res.status(200).json(jobPostings);
  } catch (error) {
    next(error);
  }
});

// Route for getting a single Job Post by CompanyID and JobID
router.get('/job-posting/:companyId/:jobId', async (req, res, next) => {
    const { companyId, jobId } = req.params;
    try {
        const jobPosting = await firebaseService.getJobPostingByCompanyIdAndJobId(companyId, jobId); 
        if (jobPosting) {
        res.status(200).json(jobPosting);
        } else {
        res.status(404).json({ error: 'Job posting not found' });
        }
    } catch (error) {
        next(error);
    }
});

// Route for creating a new Job Post //
router.post('/job-posting', async (req, res, next) => {
    const jobPosting = req.body;
    try {
      await firebaseService.addNewJobPosting(jobPosting);
      res.status(201).json({ message: 'Job posting created successfully' });
    } catch (error) {
      next(error);
    }
});

// Route for getting company details by company ID
router.get('/company/:companyId', async (req, res, next) => {
    const { companyId } = req.params;
    try {
      const company = await firebaseService.getCompanyById(companyId);
      if (company) {
        res.status(200).json(company);
      } else {
        res.status(404).json({ error: 'Company not found' });
      }
    } catch (error) {
      next(error);
    }
});

// Route for adding a new company
router.post('/company', async (req, res, next) => {
    const company = req.body;
    try {
      await firebaseService.addNewCompany(company);
      res.status(201).json({ message: 'Company created successfully' });
    } catch (error) {
      next(error);
    }
});

router.post('/store-conversation', async (req, res, next) => {
  console.log("Received body:", JSON.stringify(req.body, null, 2)); // Log entire body

  const { companyID, jobID, interviewID, applicantID, applicantName, applicantEmail, conversation } = req.body;

  // Validate required fields
  if (!companyID || !jobID || !interviewID || !conversation) {
      console.error("Missing required fields:", { companyID, jobID, interviewID, conversation });
      return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
      const result = await firebaseService.storeConversation({
          companyID,
          jobID,
          interviewID,
          applicantID,
          applicantName,
          applicantEmail,
          conversation
      });

      res.status(201).json({ message: result });
  } catch (error) {
      console.error("Error storing conversation:", error);  // Log the actual error
      res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});


router.get('/interview-results', async (req, res, next) => {
  try {
    const { companyID, jobID } = req.query; 
    if (!companyID || !jobID) {
      return res.status(400).json({ success: false, error: "Missing required query parameters: companyID, jobID" });
    }
    const interviewResults = await firebaseService.getInterviewResults(companyID, jobID);
    if (!interviewResults.success) {
      return res.status(404).json(interviewResults); 
    }
    res.status(200).json(interviewResults);
  } catch (error) {
    next(error);
  }
});

router.post('/increment-interview-started', async (req, res, next) => {
  const { companyID, jobID, email, password } = req.body;

  // Validate required fields
  if (!companyID || !jobID || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: companyID and jobID' });
  }

  try {
    const result = await firebaseService.incrementInterviewStarted({ companyID, jobID, email, password });
    res.status(200).json({ message: 'Interview started count updated successfully', result });
  } catch (error) {
    next(error);
  }
});

// Route for deleting a job posting by CompanyID and JobID
router.delete('/delete-job', async (req, res, next) => {
  const { companyId, jobId } = req.body;

  // Validate required fields
  if (!companyId || !jobId) {
      return res.status(400).json({ error: 'Missing required fields: companyId and jobId' });
  }

  try {
      const deleteResult = await firebaseService.deleteJobPosting(companyId, jobId);

      if (deleteResult.success) {
          res.status(200).json({ message: 'Job posting deleted successfully' });
      } else {
          res.status(404).json({ error: 'Job posting not found or already deleted' });
      }
  } catch (error) {
      next(error);
  }
});

router.post('/check-user-password', async (req, res, next) => {
  const { companyID, jobID, password } = req.body;

  if (!companyID || !jobID || !password) {
    return res.status(400).json({ error: 'Missing required fields: companyID, jobID, or password' });
  }

  try {
    const isValid = await firebaseService.checkUserPassword(companyID, jobID, password);
    res.status(200).json(isValid);

  } catch (error) {
    console.error("Error in /check-user-password:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/promo-code', async (req, res) => {
  const { code, companyID } = req.body;

  if (!code || !companyID) {
    return res.status(400).json({ success: false, error: 'Missing required fields: code or companyID' });
  }

  try {
    const result = await firebaseService.redeemPromoCode(code, companyID);

    if (result.success) {
      res.status(200).json({ success: true, tokens: result.tokens });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    console.error("Error in /promo-code route:", error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


export default router;
