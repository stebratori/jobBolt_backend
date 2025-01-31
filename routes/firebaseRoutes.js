// firebaseRoutes.js
import express from 'express';
import FirebaseService from '../services/firebaseService.js'; 

const router = express.Router();
const firebaseService = new FirebaseService();


router.get('/job-postings/:companyId', async (req, res, next) => {
  const { companyId } = req.params;
  try {
    const jobPostings = await firebaseService.getJobPostingsByCompanyId(companyId); 
    res.status(200).json(jobPostings);
  } catch (error) {
    next(error);
  }
});

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

export default router;
