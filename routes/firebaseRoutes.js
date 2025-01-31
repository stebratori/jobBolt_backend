// firebaseRoutes.js
import express from 'express';
import firebaseService from '../services/firebaseService.js'; 

const router = express.Router();

// Route for getting job postings by company ID
router.get('/job-postings/:companyId', async (req, res, next) => {
  const { companyId } = req.params;
  try {
    const jobPostings = await firebaseService.getJobPostingsByCompanyId(companyId);
    res.status(200).json(jobPostings);
  } catch (error) {
    next(error);
  }
});

// Add more Firebase routes here as needed (e.g., createJobPosting, updateJobPosting, etc.)

export default router;
