import ChatGptService from "../services/chatGptService.js";
import PromptService from "../services/promptService.js";

const chatGptService = new ChatGptService();

export default class InterviewAnalysisService {
    
    async analyzeTheInterview(jobDescription, conversations) {
        try {
          console.log("📝 [InterviewAnalysisService] Starting analysis...");
          const interviewAnalysisPrompt = PromptService.analysisPrompt(jobDescription, conversations);
    
          // Log the size of the prompt, not the entire prompt if it's huge
          console.log("📝 Prompt length (chars):", interviewAnalysisPrompt.length);
          
          // (Optional) Log the first 200 characters, but not everything
          console.log("🔍 Prompt excerpt:", interviewAnalysisPrompt.slice(0, 200), "...");
    
          // Call ChatGPT
          const { reply } = await chatGptService.analyzeTheInterview(interviewAnalysisPrompt);
    
          console.log("📝 Raw reply from ChatGPT:\n", reply);
    
          // Clean the response
          const cleanResponse = reply.replace(/```json|```/g, '');
          console.log("🧼 Cleaned response:\n", cleanResponse);
    
          const parsedResponse = JSON.parse(cleanResponse);
    
          if (
            parsedResponse?.interview_feedback?.questions &&
            Array.isArray(parsedResponse.interview_feedback.questions) &&
            typeof parsedResponse.interview_feedback.overall_rating === "number" &&
            typeof parsedResponse.interview_feedback.pass_to_next_stage === "boolean" &&
            typeof parsedResponse.interview_feedback.final_feedback === "string"
          ) {
            console.log("✅ [InterviewAnalysisService] Valid interview_feedback received");
            return { success: true, interviewFeedback: parsedResponse.interview_feedback };
          } else {
            throw new Error("Unexpected response format.");
          }
        } catch (error) {
          // Log the error in detail
          console.error("❌ [InterviewAnalysisService] Failed to parse response as JSON:", error);
          return { success: false, error: "Invalid response format" };
        }
      }
}