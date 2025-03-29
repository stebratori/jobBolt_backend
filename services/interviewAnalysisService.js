import ChatGptService from "../services/chatGptService.js";
import PromptService from "../services/promptService.js";

const chatGptService = new ChatGptService();

export default class InterviewAnalysisService {
  async analyzeTheInterview(jobDescription, conversation) {
    try {
      console.log("📝 [InterviewAnalysisService] Starting analysis...");
      const interviewAnalysisPrompt = PromptService.getDefaultAnalysisPrompt();

      console.log("📝 Prompt length (chars):", interviewAnalysisPrompt.length);

      // Extract Q&A pairs before sending
      const questionAnswerPairs = this.extractQuestionAnswerPairs(conversation);
      console.log(`🧠 Extracted ${questionAnswerPairs.length} question-answer pairs`);

      if (questionAnswerPairs.length === 0) {
        throw new Error("No valid Q&A pairs found in conversation.");
      }

      // Send to GPT
      const { reply } = await chatGptService.analyzeInterviewInChunks(
        jobDescription,
        questionAnswerPairs,
        interviewAnalysisPrompt
      );

      console.log("📝 Raw reply from ChatGPT:\n", reply);

      // Clean response
      const cleanResponse = reply.replace(/```json|```/g, '').trim();
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
      console.error("❌ [InterviewAnalysisService] Failed to parse response as JSON:", error);
      return { success: false, error: "Invalid response format" };
    }
  }

  extractQuestionAnswerPairs(conversation) {
    const pairs = [];

    for (let i = 0; i < conversation.length - 1; i++) {
      const current = conversation[i];
      const next = conversation[i + 1];

      if (
        current.role === 'assistant' &&
        next.role === 'user' &&
        typeof current.content === 'string' &&
        typeof next.content === 'string' &&
        current.content.trim() !== '' &&
        next.content.trim() !== ''
      ) {
        pairs.push({
          question: current.content.trim(),
          answer: next.content.trim(),
        });
        i++; // Skip the next since it's already paired
      }
    }

    return pairs;
  }
}
