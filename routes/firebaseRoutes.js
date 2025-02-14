// firebaseRoutes.js
import express from 'express';
import FirebaseService from '../services/firebaseService.js'; 
import PromptService from '../services/promptService.js'; 

const router = express.Router();
const promptService = new PromptService();
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

// Route for creating a new Job Post
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

// DEMO METHOD
// Route for getting all interview feedback
router.get('/interview-feedback', async (req, res, next) => {
    try {
      const feedbackList = await firebaseService.getAllInterviewFeedback();
      res.status(200).json(feedbackList); // Send the feedback list as a response
    } catch (error) {
      next(error);
    }
});

router.post('/store-conversation', async (req, res, next) => {
  const { companyID, jobID, interviewID, applicantID, applicantName, applicantEmail, startingTime, duration, conversation, overall_rating, feedback } = req.body;

  // Validate required fields
  if (!companyID || !jobID || !interviewID || !conversation) {
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
          startingTime: startingTime || null,
          duration: duration || null,
          overall_rating: overall_rating || null,
          feedback: feedback || null,
          conversation
      });

      res.status(201).json({ message: result});
  } catch (error) {
      next(error);  // Pass error to global error handler
  }
});

// DEMO METHOD
// Route for storing interview feedback
router.post('/interview-feedback', async (req, res, next) => {
    const feedback = req.body;
    try {
      await firebaseService.storeInterviewFeedback(feedback);
      res.status(201).json({ message: 'Interview feedback stored successfully' });
    } catch (error) {
      next(error);  // Pass the error to the global error handler
    }
});

router.post("/refresh-prompts", async (req, res) => {
  try {
    const result = await promptService.refreshPrompts();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to refresh prompts" });
  }
});

router.post("/store-interview-analysis", async (req, res) => {
  const { jobID, interviewID, analysisData } = req.body;

  if (!jobID || !interviewID || !analysisData) {
    return res.status(400).json({ error: "Missing jobID, interviewID, or analysisData." });
  }

  const result = await FirebaseService.storeInterviewAnalysis(jobID, interviewID, analysisData);
  res.status(result.success ? 200 : 500).json(result);
});

export default router;
