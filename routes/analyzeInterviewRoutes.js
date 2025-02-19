import express from 'express';
import InterviewAnalysisService from '../services/interviewAnalysisService.js';
import FirebaseService from '../services/firebaseService.js';

const router = express.Router();
const interviewAnalysisService = new InterviewAnalysisService();
const firebaseService = new FirebaseService();

/**
 * Route to analyze an interview and store the result in Firebase
 */
router.post('/analyze-and-store-interview', async (req, res, next) => {
  console.log("📩 Received API request: /analyze-and-store-interview");

  try {
    const { companyID, jobID, interviewID, jobDescription, conversation } = req.body;

    console.log("   ➡️ Extracted data from request body:");
    console.log(`   ✅ companyID: ${companyID}`);
    console.log(`   ✅ jobID: ${jobID}`);
    console.log(`   ✅ interviewID: ${interviewID}`);
    console.log("   ✅ jobDescription:", jobDescription);
    console.log("   ✅ conversation:", conversation);

    if (!companyID || !jobID || !interviewID || !jobDescription || !conversation) {
      console.error("❌ Missing required fields.");
      return res.status(400).json({ error: "Missing companyID, jobID, interviewID, jobDescription, or conversation." });
    }

    // ANALYZE
    const analysisResult = await interviewAnalysisService.analyzeTheInterview(jobDescription, conversation);

    if (!analysisResult.success) {
      console.error("❌ Interview analysis failed:", analysisResult.error);
      return res.status(500).json({ success: false, error: analysisResult.error });
    }

    // STORE IN DB
    const storeResult = await firebaseService.storeInterviewAnalysis({
      companyID,
      jobID,
      interviewID,
      interviewAnalysis: analysisResult.interviewFeedback
    });
    if (!storeResult.success) {
      console.error("❌ Failed to store analysis in Firebase:", storeResult.error);
      return res.status(500).json({ success: false, error: storeResult.error });
    }

    console.log("✅ Successfully analyzed and stored the interview", interviewID);
    return res.status(200).json({ success: true });
  } 
  catch (error) {
    console.error("🔥 Error analyzing and storing interview:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
