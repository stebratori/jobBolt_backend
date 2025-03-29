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

    console.log("🧪 Starting interview analysis with GPT...");

    // 3. Analyze
    const analysisResult = await interviewAnalysisService.analyzeTheInterview(jobDescription, conversation);

    // 4. Log result from analysis
    if (!analysisResult.success) {
      console.error("❌ Interview analysis failed:", analysisResult.error);
      return res.status(500).json({ success: false, error: analysisResult.error });
    }

    console.log("✅ Analysis successful! Storing in Firebase...");

    // 5. Store in DB
    const storeResult = await firebaseService.storeInterviewAnalysis({
      companyID,
      jobID,
      interviewID,
      interviewAnalysis: analysisResult.interviewFeedback,
      duration
    });

    // 6. Log DB write result
    if (!storeResult.success) {
      console.error("❌ Failed to store analysis in Firebase:", storeResult.error);
      return res.status(500).json({ success: false, error: storeResult.error });
    }

    console.log("✅ Successfully analyzed and stored the interview", interviewID);
    return res.status(200).json({ success: true });
  } 
  catch (error) {
    // 7. Make sure to log the **full** error
    console.error("🔥 Error analyzing and storing interview:", error);
    console.error("🔥 Stack trace:", error.stack);
    return res.status(500).json({ success: false, error: error.message });
  }
});



export default router;
