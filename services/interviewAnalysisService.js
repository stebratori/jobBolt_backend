import ChatGptService from "../services/chatGptService.js";
import PromptService from "../services/promptService.js";

const chatGptService = new ChatGptService();

export default class InterviewAnalysisService {
    
    async analyzeTheInterview(jobDescription, conversations) {
        try {
            // Fetch system message from PromptService
            const interviewAnalysisPrompt = PromptService.analysisPrompt(jobDescription, conversations);
            console.log("System Message:", interviewAnalysisPrompt);
        
            // Call new ChatGptService method instead of sendMessage
            const { reply } = await chatGptService.analyzeTheInterview(interviewAnalysisPrompt);
            console.log("Response:", reply);
        
            // Clean the response
            const cleanResponse = reply.replace(/```json|```/g, '');
            const parsedResponse = JSON.parse(cleanResponse);
        
            if (
                parsedResponse?.interview_feedback?.questions &&
                Array.isArray(parsedResponse.interview_feedback.questions) &&
                typeof parsedResponse.interview_feedback.overall_rating === "number" &&
                typeof parsedResponse.interview_feedback.pass_to_next_stage === "boolean" &&
                typeof parsedResponse.interview_feedback.final_feedback === "string"
            ) {
                return { success: true, interviewFeedback: parsedResponse.interview_feedback };
            } else {
                throw new Error("Unexpected response format.");
            }
        } catch (error) {
            console.error("Failed to parse response as JSON:", error);
            return { success: false, error: "Invalid response format" };
        }
    }
}