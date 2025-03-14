import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import URLManager from './URLManager.js';
import { sendWebSocketMessage } from '../server.js';
//import serviceAccounts from '../job-bolt-firebase-adminsdk-8k32j-8e3328f3c8.json' with { type: "json" };

export default class FirebaseService {
  constructor() {
     if (!admin.apps.length) {
    //   if (process.env.ENVIRONMENT = "LOCAL") {
    //     admin.initializeApp({
    //       credential: admin.credential.cert(serviceAccounts),
    //     });
    //     console.log('[Firebase] initialized locally');
    //   } 
    //   else {
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
      //}
    

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

  async handleTokenPurchaseCompleted(companyId, tokenAmount) {
    try {
        console.log('[Server Stripe] update companyID:', companyId)
        const companyRef = this.firestore.collection('companies').doc(companyId);
        const companySnapshot = await companyRef.get();

        if (!companySnapshot.exists) {
            throw new Error(`[Firebase] Company with ID ${companyId} does not exist`);
        }

        // Get current date
        const now = new Date();

        // Format: DD.Month.YYYY_HH:MM
        const day = now.getDate().toString().padStart(2, '0');
        const month = now.toLocaleString('en-US', { month: 'long' }); // Full month name
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        const formattedTimestamp = `${day}.${month}.${year}_${hours}:${minutes}`;
        const changelogEntry = `purchasedTokens=${tokenAmount}_at:${formattedTimestamp}`;

        // Get existing token count or default to 0
        const companyData = companySnapshot.data();
        const currentTokens = Number(companyData.tokens) || 0;

        // Update the tokens and changelog
        await companyRef.update({
            tokens: currentTokens + tokenAmount,
            changelog: admin.firestore.FieldValue.arrayUnion(changelogEntry),
        });

        console.log(`[Firebase] Tokens updated for company ID ${companyId}. New balance: ${currentTokens + tokenAmount}`);
        // Send WebSocket notification
        sendWebSocketMessage(companyId, {
          type: 'TOKEN_UPDATE',
          companyId,
          newTokenBalance: currentTokens + tokenAmount
        });
    } catch (error) {
        console.error('[Firebase] [Error] in handleTokenPurchaseCompleted:', error.message);
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
        jobId: jobID,
        jobDescription: jobPosting.jobDescription,
        jobTitle: jobPosting.jobTitle,
        questions: jobPosting.questions,
        companyId: jobPosting.companyId,
        interviewURL: url,
        dateCreated: Date.now(),
      };
      await jobDocRef.set(documentToStore); 
      sendWebSocketMessage(jobPosting.companyId, { type: 'ADDED_NEW_JOB' });
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
          tokens: data.tokens ?? 0,
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

  async storeConversation({ companyID, jobID, interviewID, applicantID, applicantName, applicantEmail, conversation }) {
    try {
        if (!companyID || !jobID || !interviewID || !applicantID || !applicantName || !applicantEmail || !conversation) {
            throw new Error("Missing required fields");
        }
        const collectionName = `interviews_${companyID}`;
        const docID = interviewID;
        const collectionRef = this.firestore.collection(collectionName);
        const docRef = collectionRef.doc(docID);

        // Fetch document snapshot to check if it exists
        const docSnapshot = await docRef.get();
        if (!docSnapshot.exists) {
            const newDocument = {
              jobID,
              companyID,
              interviewID,
              applicantID,
              applicantName,
              applicantEmail,
              startingTime: admin.firestore.FieldValue.serverTimestamp(),
              conversation: conversation || []
            };
            await docRef.set(newDocument);
        } else {
            const updatedData = { 
              conversation: conversation
            };
            await docRef.set(updatedData, { merge: true });
        }
    } catch (error) {
        throw error;
    }
  }

  async storeInterviewAnalysis({ companyID, jobID, interviewID, interviewAnalysis, duration }) {
    try {
        if (!companyID || !jobID || !interviewID || !interviewAnalysis) {
          const missingFields = [
              !companyID && 'companyID',
              !jobID && 'jobID',
              !interviewID && 'interviewID',
              !interviewAnalysis && 'interviewAnalysis'
          ].filter(Boolean);
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        const collectionName = `interviews_${companyID}`;
        const docID = interviewID;
        const collectionRef = this.firestore.collection(collectionName);
        const docRef = collectionRef.doc(docID);
        const docSnapshot = await docRef.get();
        if (!docSnapshot.exists) {
            throw new Error(`❌ Interview document ${docID} not found in collection ${collectionName}`);
        }
        const updatedData = { 
          interviewAnalysis, 
          analysisCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          duration
        };
        await docRef.set(updatedData, { merge: true });

        // Update the jobPosting's interviewFinished field
        const jobDocRef = this.firestore.collection('job_postings').doc(jobID);
        await jobDocRef.set(
            { interviewFinished: admin.firestore.FieldValue.increment(1) }, 
            { merge: true }
        );
        
        console.log(`✅ Interview analysis stored successfully for interviewID: ${interviewID}`);
        return { success: true };
    } catch (error) {
      console.error(`🔥 Error storing interview analysis for interviewID ${interviewID}:`, error);
      // Handle specific error cases
      if (error.code === 'permission-denied') {
          return { success: false,error: 'Permission denied: Unable to access the interview document'};
      }
      if (error.code === 'resource-exhausted') {
          return { success: false,error: 'Database quota exceeded. Please try again later'};
      }
      return { success: false, error: error.message };
    }
  }

  async incrementInterviewStarted({ companyID, jobID }) {
    try {
        if (!companyID || !jobID) {
            const missingFields = [
                !companyID && 'companyID',
                !jobID && 'jobID'
            ].filter(Boolean);
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        const jobDocRef = this.firestore.collection('job_postings').doc(jobID);

        // Increment the interviewStarted field or create it if it doesn't exist
        await jobDocRef.set(
            { interviewStarted: admin.firestore.FieldValue.increment(1) },
            { merge: true }
        );

        console.log(`✅ interviewStarted field updated for jobID: ${jobID}`);
        return { success: true };
    } catch (error) {
        console.error(`🔥 Error updating interviewStarted for jobID ${jobID}:`, error);
        if (error.code === 'permission-denied') {
            return { success: false, error: 'Permission denied: Unable to update job posting' };
        }
        if (error.code === 'resource-exhausted') {
            return { success: false, error: 'Database quota exceeded. Please try again later' };
        }
        return { success: false, error: error.message };
    }
}


  async getInterviewResults(companyID, jobID) {
    try {
        if (!companyID || !jobID) {
            throw new Error("Missing required fields: companyID, jobID");
        }
        const collectionName = `interviews_${companyID}`;
        const collectionRef = this.firestore.collection(collectionName);
        const querySnapshot = await collectionRef.where("jobID", "==", jobID).get();

        if (querySnapshot.empty) {
            return { success: false, message: `No interviews found for jobID: ${jobID}` };
        }

        let interviews = [];
        querySnapshot.forEach(doc => {
            interviews.push({ id: doc.id, ...doc.data() });
        });

        return { success: true, interviews };

    } catch (error) {
        console.error(`🔥 Error retrieving interview results for jobID ${jobID}:`, error);
        return { success: false, error: error.message };
    }
  }

  async storeCandidatesInJobPosting(companyID, jobID, newCandidates) {
    try {
        if (!companyID || !jobID || !Array.isArray(newCandidates)) {
            throw new Error("Missing required fields or candidates is not an array");
        }

        const collectionRef = admin.firestore().collection('job_postings');
        const jobDocRef = collectionRef.doc(jobID);

        // Fetch document snapshot to check if it exists
        const jobDocSnapshot = await jobDocRef.get();
        if (!jobDocSnapshot.exists) {
            throw new Error(`❌ Job posting document ${jobID} not found for company ${companyID}`);
        }

        // Get existing candidates array or initialize empty array if it doesn't exist
        const jobData = jobDocSnapshot.data();
        const existingCandidates = jobData.candidates || [];

        // Simply append new candidates to existing array (or create new array if none exists)
        const updatedCandidates = [...existingCandidates, ...newCandidates];

        await jobDocRef.update({ candidates: updatedCandidates });

        sendWebSocketMessage(companyID, {
          type: 'NEW_CANDIDATES',
          jobID,
          candidates: updatedCandidates
        });

        return { success: true };
        
    } catch (error) {
        console.error(`🔥 Error storing candidates in job posting ${jobID}:`, error);
        return { success: false, error: error.message };
    }
  }



}

