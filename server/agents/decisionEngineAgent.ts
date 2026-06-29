import { getAI } from "../ai";
import { z } from "zod";

export interface DecisionInput {
  title: string;
  description?: string;
  deadline: string;
  urgency: "low" | "medium" | "high";
  importance: "low" | "medium" | "high";
  effort: number;
}

export interface DecisionOutput {
  whyThisTask: string;
  whyNow: string;
  whatIfDelayed: string;
  expectedImpact: string;
  whatDataWasConsidered: string;
  expectedBenefit: string;
  confidenceScore: number;
}

const decisionOutputSchema = z.object({
  whyThisTask: z.string(),
  whyNow: z.string(),
  whatIfDelayed: z.string(),
  expectedImpact: z.string(),
  whatDataWasConsidered: z.string().default("Task priority metrics, current local clock, self-reported urgency & importance parameters, and remaining effort hours."),
  expectedBenefit: z.string().default("Accelerates high-importance milestones and provides cognitive relief by reducing backlog pressure."),
  confidenceScore: z.number().min(0).max(100).default(85)
});

export class DecisionEngineAgent {
  static async execute(input: DecisionInput): Promise<DecisionOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Decision Engine" for DeadlineHero AI, providing Explainable AI (XAI) diagnostics.
      Your purpose is to explain the underlying cognitive and strategic reasoning behind prioritizing or working on a specific task node.

      Task Title: "${input.title}"
      Description: "${input.description || "No description provided."}"
      Deadline: ${input.deadline}
      Self-Reported Urgency: "${input.urgency}"
      Self-Reported Importance: "${input.importance}"
      Estimated Effort: ${input.effort} hours
      Current Time: ${new Date().toISOString()}

      Generate a highly analytical, clear, and direct explanation containing:
      1. WHY this task? (Why is this task fundamentally important to the user's high-level objectives or psychological momentum?)
      2. WHY now? (Why must this task be done in the immediate timeframe or current sequence? Highlight deadline urgency vs effort.)
      3. WHAT happens if delayed? (What is the precise cost, penalty, risk, or mental friction if this task is postponed?)
      4. Expected impact? (What positive outcome, productivity boost, relief, or alignment occurs when this task is completed successfully?)
      5. What data was considered? (List specific inputs like deadline remaining, user fatigue, category weight, etc.)
      6. Expected benefit? (Highlight quantitative and qualitative benefits of starting this task now.)
      7. Confidence score? (Provide a score between 0 and 100 on how confident you are in this prioritization suggestion.)

      Return a JSON object conforming exactly to this schema:
      {
        "whyThisTask": "Detailed reason why this task is key...",
        "whyNow": "Detailed reason why immediate action is required...",
        "whatIfDelayed": "Precise penalty or risk if delayed...",
        "expectedImpact": "High impact result of completion...",
        "whatDataWasConsidered": "Data points and variables evaluated...",
        "expectedBenefit": "Direct psychological and functional gains...",
        "confidenceScore": 95
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
      const validated = decisionOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as DecisionOutput;
      } else {
        console.warn("Zod validation failed for DecisionEngineAgent, using fallback:", validated.error);
        return {
          whyThisTask: rawJson.whyThisTask || "Crucial for psychological momentum and high-level objectives.",
          whyNow: rawJson.whyNow || "Requires prompt attention to avoid compounding timeline compression.",
          whatIfDelayed: rawJson.whatIfDelayed || "Increases downstream deadline stress and risk of burnout.",
          expectedImpact: rawJson.expectedImpact || "Boosts confidence, unblocks dependent stages, and ensures steady execution.",
          whatDataWasConsidered: "Task parameters, deadline buffer, self-reported urgency, and estimated effort.",
          expectedBenefit: "Reduces anxiety, secures critical goals, and streamlines productivity.",
          confidenceScore: 85
        };
      }
    } catch (e: any) {
      console.warn("DecisionEngineAgent using fallback due to API limit/error:", e?.message || e);
      return {
        whyThisTask: "Crucial for psychological momentum and high-level objectives.",
        whyNow: "Requires prompt attention to avoid compounding timeline compression.",
        whatIfDelayed: "Increases downstream deadline stress and risk of burnout.",
        expectedImpact: "Boosts confidence, unblocks dependent stages, and ensures steady execution.",
        whatDataWasConsidered: "Task parameters, deadline buffer, self-reported urgency, and estimated effort.",
        expectedBenefit: "Reduces anxiety, secures critical goals, and streamlines productivity.",
        confidenceScore: 80
      };
    }
  }
}
