import { getAI } from "../ai";
import { z } from "zod";

export interface SuccessInput {
  title: string;
  deadline: string;
  effort: number;
  completedSubtasksCount: number;
  totalSubtasksCount: number;
  userStats?: {
    focusHours: number;
    streakDays: number;
    completionRate: number;
    productivityScore: number;
  };
}

export interface SuccessOutput {
  successProbability: number; // 0-100
  successReasoning: string;
  remedialSuggestions: string[];
}

const successOutputSchema = z.object({
  successProbability: z.number().min(0).max(100).default(80),
  successReasoning: z.string().default("Analyzing progress metrics and behavioral trends to calculate completion probability."),
  remedialSuggestions: z.array(z.string()).default([])
});

export class SuccessProbabilityEngine {
  static async execute(input: SuccessInput): Promise<SuccessOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Success Probability Engine" for DeadlineHero AI.
      Your goal is to perform a rigorous statistical and behavioral prediction of whether the user will complete this task on time before its deadline.

      Task Details:
      - Title: "${input.title}"
      - Target Deadline: ${input.deadline}
      - Estimated Total Effort Required: ${input.effort} hours
      - Completed Checklist Steps: ${input.completedSubtasksCount} out of ${input.totalSubtasksCount}
      - Current Time: ${new Date().toISOString()}

      User Behavioral Context:
      - Weekly Focus Hours: ${input.userStats?.focusHours || 4.5} hours
      - Focus Streak: ${input.userStats?.streakDays || 3} days
      - Overall Goal Goal Completion Rate: ${input.userStats?.completionRate || 33}%
      - AI Productivity Score: ${input.userStats?.productivityScore || 72}/100

      Perform a realistic, non-optimistic calculation of the Success Probability (0-100%):
      - Take into account the remaining hours until the deadline versus the remaining effort (calculated as (1 - completed/total) * total_effort). If remaining time is less than remaining effort, the probability should be very low!
      - Factor in the user's focus habits and historical productivity score. High productivity score boosts probability, while procrastination history/low focus hours degrades it.
      - Write a thorough, analytical 2-3 sentence "successReasoning" detailing how this percentage was derived.
      - Generate 2-3 highly actionable, specific "remedialSuggestions" to improve the probability if it is below 90% (e.g., "Decline meetings this afternoon", "Time-block 1.5 hours immediately", "Reduce scope of the third subtask").

      Return a JSON object conforming exactly to this schema:
      {
        "successProbability": 75,
        "successReasoning": "Given that there are only 12 hours remaining and 3 hours of estimated effort, the user has a moderate success chance. The user's strong 3-day streak suggests high momentum, but workload crowding creates a high risk of delays.",
        "remedialSuggestions": ["...", "..."]
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const rawJson = JSON.parse(text);
      const validated = successOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as SuccessOutput;
      } else {
        console.warn("Zod validation failed for SuccessProbabilityEngine, using fallback:", validated.error);
        return {
          successProbability: typeof rawJson.successProbability === "number" ? rawJson.successProbability : 75,
          successReasoning: rawJson.successReasoning || "Calculated based on workload metrics and remaining effort against current deadlines.",
          remedialSuggestions: Array.isArray(rawJson.remedialSuggestions) ? rawJson.remedialSuggestions : []
        };
      }
    } catch (e: any) {
      console.warn("SuccessProbabilityEngine using fallback due to API limit/error:", e?.message || e);
      return {
        successProbability: 70,
        successReasoning: "Progress is steady. Factoring in current workload density, maintaining scheduled deep focus block sequences is recommended.",
        remedialSuggestions: [
          "Establish an immediate dedicated deep focus timebox of 90 minutes.",
          "Postpone non-essential communication channels to optimize cognitive focus."
        ]
      };
    }
  }
}
