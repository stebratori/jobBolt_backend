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
        // Initialize Firebase Admin SDK
        admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
        });

      console.log('[Firebase] initialized');
    }

    // Firestore instance
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
      // Update the "job_postings" collection
      const jobRef = this.firestore.collection('job_postings').doc(jobId);
      const jobSnapshot = await jobRef.get();

      if (!jobSnapshot.exists) {
        throw new Error(`[Firebase] Job with ID ${jobId} does not exist`);
      }

      const jobData = jobSnapshot.data();

      // Verify that the job's companyId matches
      if (jobData.companyId !== companyId) {
        throw new Error(`[Firebase] Job's companyId (${jobData.companyId}) does not match provided companyId (${companyId})`);
      }

      // Update the job's status to "active"
      await jobRef.update({
        status: 'active',
      });

      console.log(`[Firebase] Job with ID ${jobId} successfully updated state to active`);

      // Update the "companies" collection
      const companyRef = this.firestore.collection('companies').doc(companyId);
      const companySnapshot = await companyRef.get();

      if (!companySnapshot.exists) {
        throw new Error(`[Firebase] Company with ID ${companyId} does not exist`);
      }

      const timestamp = Date.now();
      const changelogEntry = `activatedJobId=${jobId}_at:${timestamp}`;

      // Add new changelog entry to the array
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
        return []; // Return an empty array if no documents are found
      }
  
      const jobPostings = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      console.log('[Firebase] Retrieved job postings for company ID:', companyId);
      return jobPostings;
    } catch (error) {
      console.error('[Firebase] Error retrieving job postings:', {
        message: error.message,
        stack: error.stack,
      });
      throw new Error('Failed to fetch job postings'); // Rethrow the error for the route to handle
    }
  }
  
async getJobPostingByCompanyIdAndJobId(companyId, jobId) {
  try {
    // Reference the specific document using the jobId
    const jobDocRef = this.firestore.collection('job_postings').doc(jobId);
    const jobDoc = await jobDocRef.get();
    
    if (jobDoc.exists) {
      const data = jobDoc.data();
      
      // Verify that the companyId matches
      if (data.companyId === companyId) {
        const jobPosting = {
          id: jobDoc.id, // Firebase-assigned document ID
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
    
    // Generate the URL for the job posting (you can add your logic here)
    const url = URLManager.createUrlForJobPosting(jobID, jobPosting.companyId);
    
    const documentToStore = {
      jobDescription: jobPosting.jobDescription,
      jobTitle: jobPosting.jobTitle,
      questions: jobPosting.questions,
      companyId: jobPosting.companyId,
      status: 'inactive',
      interviewURL: url,
    };

    console.log("Attempting to save the job posting:", documentToStore);
    await jobDocRef.set(documentToStore); // Save the document to Firestore
    console.log("Job posting successfully stored.");
  } catch (error) {
    console.error("Error storing job posting:", error);
    throw new Error('Failed to add new job posting');
  }
}

}
