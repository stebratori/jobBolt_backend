import express from 'express';
import InterviewAnalysisService from '../services/interviewAnalysisService.js';
import FirebaseService from '../services/firebaseService.js';

const router = express.Router();
const interviewAnalysisService = new InterviewAnalysisService();
const firebaseService = new FirebaseService();

/**
 * Route to analyze an interview and store the result in Firebase
 */
router.post('/analyze-and-store-interview', async (req, res) => {
  console.log("📩 Received API request: /analyze-and-store-interview");

  try {
    const { 
      companyID, 
      jobID, 
      interviewID, 
      jobDescription, 
      conversation, 
      duration 
    } = req.body;

    // 1. Log the basic fields right away
    console.log("📝 Received fields:", {
      companyID,
      jobID,
      interviewID,
      jobDescription: jobDescription?.slice(0, 50) + "...", // truncated for brevity
      conversationLength: conversation?.length,
      duration
    });

    // 2. Check required fields
    if (!companyID || !jobID || !interviewID || !jobDescription || !conversation) {
      console.error("❌ Missing required fields.");
      return res.status(400).json({ error: "Missing companyID, jobID, interviewID, jobDescription, or conversation." });
    }

    // 3. Send an immediate acknowledgment to the client
    // This prevents the request from timing out on Heroku (30s limit)
    res.status(200).json({ success: true, message: "Analysis request received" });

    // 4. Continue processing after the response has been sent
    // This is a "fire and forget" approach
    (async () => {
      try {
        console.log("🧪 Starting interview analysis with GPT in background...");

        // Analyze
        const analysisResult = await interviewAnalysisService.analyzeTheInterview(
          jobDescription, conversation
        );

        if (!analysisResult.success) {
          console.error("❌ Interview analysis failed:", analysisResult.error);
          return; // End background processing
        }

        console.log("✅ Analysis successful! Storing in Firebase...");

        // Store in DB
        const storeResult = await firebaseService.storeInterviewAnalysis({
          companyID,
          jobID,
          interviewID,
          interviewAnalysis: analysisResult.interviewFeedback,
          duration
        });

        if (!storeResult.success) {
          console.error("❌ Failed to store analysis in Firebase:", storeResult.error);
          return; // End background processing
        }

        console.log("✅ Successfully analyzed and stored the interview", interviewID);
      } catch (error) {
        console.error("🔥 Background processing error:", error);
        console.error("🔥 Stack trace:", error.stack);
      }
    })().catch(err => {
      console.error("🔥 Failed to start background processing:", err);
    });
  } 
  catch (error) {
    // Only errors in the request validation phase will be caught here
    console.error("🔥 Error processing interview request:", error);
    console.error("🔥 Stack trace:", error.stack);
    
    // Only send an error response if we haven't sent a response already
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
});



export default router;
