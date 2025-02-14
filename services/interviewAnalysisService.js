import FirebaseService from "../services/firebaseService.js";
import ChatGptService from "../services/chatGptService.js";
const firebaseService = new FirebaseService();
const chatGptService = new ChatGptService();

export default class InterviewAnalysisService {
    
    async analyzeInterview(jobDescription, conversations) {
        try {
            // Fetch system message from FirebaseService
            const interviewAnalysisPrompt = await firebaseService.getAnalysisPrompt(jobDescription, conversations);
            console.log("System Message:", interviewAnalysisPrompt);
        
            // Call new ChatGptService method instead of sendMessage
            const response = await chatGptService.analyzeTheInterview(interviewAnalysisPrompt);
            console.log("Response:", response);
        
            // Clean the response
            const cleanResponse = response.replace(/```json|```/g, '');
            const parsedResponse = JSON.parse(cleanResponse);
        
            if (
                parsedResponse?.interview_feedback?.questions &&
                Array.isArray(parsedResponse.interview_feedback.questions) &&
                typeof parsedResponse.interview_feedback.overall_rating === "number" &&
                typeof parsedResponse.interview_feedback.pass_to_next_stage === "boolean" &&
                typeof parsedResponse.interview_feedback.final_feedback === "string"
            ) {
                // Store the interview analysis in Firebase
                await firebaseService.storeInterviewAnalysis(parsedResponse.interview_feedback);

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
