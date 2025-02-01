import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import URLManager from './URLManager.js';

export default class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

    // Fix double-escaped newlines in private key
    if (firebaseConfig.private_key) {
        firebaseConfig.private_key = firebaseConfig.private_key
          .replace(/\\\\n/g, '\n')  // Handle double-escaped
          .replace(/\\n/g, '\n');    // Handle single-escaped
        }
        
        admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
        });

      console.log('[Firebase] initialized');
    }

    this.firestore = admin.firestore();
  }

  /**
   * Updates a Firestore document based on metadata
   * @param {string} companyId - The company ID
   * @param {string} jobId - The job ID
   * First update the JobPosting, then update the Company changelog
   */
  async handleCheckoutSessionCompleted(companyId, jobId) {
    try {
      const jobRef = this.firestore.collection('job_postings').doc(jobId);
      const jobSnapshot = await jobRef.get();

      if (!jobSnapshot.exists) {
        throw new Error(`[Firebase] Job with ID ${jobId} does not exist`);
      }

      const jobData = jobSnapshot.data();

      if (jobData.companyId !== companyId) {
        throw new Error(`[Firebase] Job's companyId (${jobData.companyId}) does not match provided companyId (${companyId})`);
      }

      await jobRef.update({
        status: 'active',
      });
      const companyRef = this.firestore.collection('companies').doc(companyId);
      const companySnapshot = await companyRef.get();

      if (!companySnapshot.exists) {
        throw new Error(`[Firebase] Company with ID ${companyId} does not exist`);
      }

      const timestamp = Date.now();
      const changelogEntry = `activatedJobId=${jobId}_at:${timestamp}`;

      await companyRef.update({
        changelog: admin.firestore.FieldValue.arrayUnion(changelogEntry),
      });

      console.log(`[Firebase] Changelog updated for company ID ${companyId}`);
    } catch (error) {
      console.error('[Firebase] [Error] in handleCheckoutSessionCompleted:', error.message);
      throw error;
    }
  }
  
  async getJobPostingsByCompanyId(companyId) {
    try {
      const querySnapshot = await this.firestore
        .collection('job_postings')
        .where('companyId', '==', companyId)
        .get();
  
      if (querySnapshot.empty) {
        console.log('[Firebase] No job postings found for company ID:', companyId);
        return []; 
      }
  
      const jobPostings = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      return jobPostings;
    } catch (error) {
      console.error('[Firebase] Error retrieving job postings:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error('Failed to fetch job postings'); 
    }
  }
  
  async getJobPostingByCompanyIdAndJobId(companyId, jobId) {
    try {
      const jobDocRef = this.firestore.collection('job_postings').doc(jobId);
      const jobDoc = await jobDocRef.get();
      
      if (jobDoc.exists) {
        const data = jobDoc.data();
        
        if (data.companyId === companyId) {
          const jobPosting = {
            id: jobDoc.id, 
            jobDescription: data.jobDescription,
            jobTitle: data.jobTitle,
            questions: data.questions,
            companyId: data.companyId,
            interviewURL: data.interviewURL,
            status: data.status,
          };
          return jobPosting;
        } else {
          console.log(`No job posting found for company ID: ${companyId} with job ID: ${jobId}`);
          return null;
        }
      } else {
        console.log(`Job posting with ID: ${jobId} does not exist.`);
        return null;
      }
    } catch (error) {
      console.error("Error fetching job posting:", error);
      throw error;
    }
  }

  async addNewJobPosting(jobPosting) {
    try {
      const jobID = uuidv4(); // Generate a unique job ID
      const jobDocRef = this.firestore.collection('job_postings').doc(jobID);
      const url = URLManager.createUrlForJobPosting(jobID, jobPosting.companyId);
      
      const documentToStore = {
        jobDescription: jobPosting.jobDescription,
        jobTitle: jobPosting.jobTitle,
        questions: jobPosting.questions,
        companyId: jobPosting.companyId,
        status: 'inactive',
        interviewURL: url,
      };
      await jobDocRef.set(documentToStore); 
    } catch (error) {
      console.error("Error storing job posting:", error);
      throw new Error('Failed to add new job posting');
    }
  }

  async getCompanyById(companyId) {
    try {
      const docRef = this.firestore.collection('companies').doc(companyId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          email: data.email,
        };
      } else {
        console.log('No company found with ID:', companyId);
        return null;
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      throw error;
    }
  }

  async addNewCompany(company) {
    try {
      const docRef = this.firestore.collection('companies').doc(company.id);
      const formattedDate = new Date(Date.now()).toISOString();
      const documentToStore = {
        name: company.name,
        email: company.email,
        changelog: [`created_${formattedDate}`],
      };
      await docRef.set(documentToStore);
    } catch (error) {
      console.error("Error adding new company:", error);
      throw error;
    }
  }

  // DEMO ONLY Method
  async getAllInterviewFeedback() {
    try {
      const collectionRef = this.firestore.collection('interview_analysis');
      const snapshot = await collectionRef.get();

      const feedbackList = snapshot.docs.map((doc) => {
        const data = doc.data();
        console.log('Interview data:', data);
        return {
          id: doc.id,
          overall_rating: data.overall_rating,
          pass_to_next_stage: data.pass_to_next_stage,
          final_feedback: data.final_feedback,
          username: data.username,
          jobId: data.jobId || undefined,
          date: data.date,
        };
      });

      console.log('Retrieved interview feedback:', feedbackList);
      return feedbackList;
    } catch (error) {
      console.error('Error retrieving interview feedback:', error);
      throw error;
    }
  }



}
