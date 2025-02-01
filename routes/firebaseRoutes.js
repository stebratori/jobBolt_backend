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

  

export default router;
