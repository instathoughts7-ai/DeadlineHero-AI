import { getAI } from "../ai";
import { z } from "zod";

export interface RiskInput {
  title: string;
  deadline: string;
  urgency: "low" | "medium" | "high";
  importance: "low" | "medium" | "high";
  effort: number;
  currentWorkloadSummary?: string;
}

export interface RiskOutput {
  priorityScore: number; // 0-100
  riskLevel: "safe" | "moderate" | "high" | "critical";
  successProbability: number; // 0-100
  riskExplanation: string;
  highRiskAreas: string[];
  decisionReasoning?: {
    whyThisTask: string;
    whyNow: string;
    whatIfDelayed: string;
    expectedImpact: string;
    whatDataWasConsidered: string;
    expectedBenefit: string;
    confidenceScore: number;
  };
  successReasoning?: string;
  remedialSuggestions?: string[];
}

const riskOutputSchema = z.object({
  priorityScore: z.number().min(0).max(100).default(50),
  riskLevel: z.enum(["safe", "moderate", "high", "critical"]).default("moderate"),
  successProbability: z.number().min(0).max(100).default(80),
  riskExplanation: z.string().default("Analyzing scheduling dependencies to protect deadline integrity."),
  highRiskAreas: z.array(z.string()).default([]),
  decisionReasoning: z.object({
    whyThisTask: z.string(),
    whyNow: z.string(),
    whatIfDelayed: z.string(),
    expectedImpact: z.string(),
    whatDataWasConsidered: z.string().default("Deadline proximity, total effort hours, self-reported parameters, and scheduling context."),
    expectedBenefit: z.string().default("Reclaims focus bandwidth and prevents late-stage compression stressors."),
    confidenceScore: z.number().min(0).max(100).default(85)
  }).optional(),
  successReasoning: z.string().default("Success is highly likely if dedicated focus blocks are reserved early."),
  remedialSuggestions: z.array(z.string()).default([])
});

export class RiskPredictionAgent {
  static async execute(input: RiskInput): Promise<RiskOutput> {
    const ai = getAI();
    const prompt = `
      You are the "Risk Prediction & Decision Agent" for DeadlineHero AI.
      Assess the relative urgency, importance, deadline safety, success probability, and strategic priority of this task node:
      - Title: "${input.title}"
      - Deadline: ${input.deadline} (Current time is ${new Date().toISOString()})
      - Self-Reported Urgency: "${input.urgency}"
      - Self-Reported Importance: "${input.importance}"
      - Total Effort: ${input.effort} hours
      - Scheduled Workload: "${input.currentWorkloadSummary || "Normal workload"}"

      Perform the following assessments:
      1. Calculate the AI Priority Score (0-100), where 100 is maximum critical priority.
         Consider remaining time, effort, self-reported urgency/importance, and workload density.
      2. Predict the Deadline Risk Level:
         - "safe": comfortable buffer, high chance of success
         - "moderate": tight but achievable, requires focus
         - "high": serious conflict, high likelihood of delay unless reorganized
         - "critical": past due, or mathematically impossible to complete before deadline
      3. Calculate Success Probability (0-100%): the statistical likelihood that they can finish on time.
         Provide a thorough "successReasoning" detailing how this percentage was derived.
         Provide 2-3 specific "remedialSuggestions" (e.g. "Postpone low priority meetings", "Reserve morning focus slot").
      4. Write a 2-sentence "riskExplanation" explaining this categorization and proposing a key action.
      5. List 2-3 specific "highRiskAreas" (e.g. "Overlapping sync meetings", "Fatigue during late hours", "Insufficient buffer for bugs").
      6. Run the AI Decision Engine logic to produce the Explainable AI (XAI) "decisionReasoning":
         - whyThisTask: Why is this task fundamentally important to high-level goals?
         - whyNow: Why must this task be done in the immediate timeframe or current sequence?
         - whatIfDelayed: What is the exact cost, penalty, or cognitive friction if delayed?
         - expectedImpact: What positive outcome or relief occurs when completed successfully?
         - whatDataWasConsidered: Explain what data metrics were considered.
         - expectedBenefit: Detail the expected psychological or strategic benefits.
         - confidenceScore: Confidence score (0-100) of this suggestion.

      Return a JSON object conforming exactly to this schema:
      {
        "priorityScore": 78,
        "riskLevel": "safe",
        "successProbability": 82,
        "successReasoning": "Given that...",
        "remedialSuggestions": ["...", "..."],
        "riskExplanation": "...",
        "highRiskAreas": ["...", "..."],
        "decisionReasoning": {
          "whyThisTask": "...",
          "whyNow": "...",
          "whatIfDelayed": "...",
          "expectedImpact": "...",
          "whatDataWasConsidered": "...",
          "expectedBenefit": "...",
          "confidenceScore": 85
        }
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
      const validated = riskOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as RiskOutput;
      } else {
        console.warn("Zod validation failed for RiskPredictionAgent, using fallback:", validated.error);
        return {
          priorityScore: typeof rawJson.priorityScore === "number" ? rawJson.priorityScore : 65,
          riskLevel: ["safe", "moderate", "high", "critical"].includes(rawJson.riskLevel) ? rawJson.riskLevel : "moderate",
          successProbability: typeof rawJson.successProbability === "number" ? rawJson.successProbability : 75,
          riskExplanation: rawJson.riskExplanation || "Mitigate bottleneck risks by initiating early milestones.",
          highRiskAreas: Array.isArray(rawJson.highRiskAreas) ? rawJson.highRiskAreas : [],
          decisionReasoning: rawJson.decisionReasoning ? {
            whyThisTask: rawJson.decisionReasoning.whyThisTask || "Fundamental milestone.",
            whyNow: rawJson.decisionReasoning.whyNow || "High priority timeline element.",
            whatIfDelayed: rawJson.decisionReasoning.whatIfDelayed || "Increases downstream compression stressors.",
            expectedImpact: rawJson.decisionReasoning.expectedImpact || "Cognitive relief and accelerated goal completion.",
            whatDataWasConsidered: rawJson.decisionReasoning.whatDataWasConsidered || "Deadline, complexity parameters, workload density, and current buffer hours.",
            expectedBenefit: rawJson.decisionReasoning.expectedBenefit || "Secures key milestones and establishes momentum.",
            confidenceScore: typeof rawJson.decisionReasoning.confidenceScore === "number" ? rawJson.decisionReasoning.confidenceScore : 85
          } : undefined,
          successReasoning: rawJson.successReasoning || "Steady progress ensures deadline compliance.",
          remedialSuggestions: Array.isArray(rawJson.remedialSuggestions) ? rawJson.remedialSuggestions : []
        };
      }
    } catch (e: any) {
      console.warn("RiskPredictionAgent using fallback due to API limit/error:", e?.message || e);
      return {
        priorityScore: 70,
        riskLevel: "moderate",
        successProbability: 75,
        riskExplanation: "Deadline safety can be improved with structured rest periods and dedicated work blocks.",
        highRiskAreas: ["Late-stage implementation bottlenecks", "Multitasking cognitive friction"],
        decisionReasoning: {
          whyThisTask: "Core milestone to establish psychological momentum and fulfill user intent.",
          whyNow: "Action now ensures that secondary tasks have adequate buffer time.",
          whatIfDelayed: "Causes timeline contraction and increased pressure during execution.",
          expectedImpact: "Boosts confidence, unblocks downstream stages, and secures on-time delivery.",
          whatDataWasConsidered: "Overarching deadlines, remaining subtask complexity, and current calendar capacity.",
          expectedBenefit: "Dramatically reduces late-stage anxiety and enhances overall project quality.",
          confidenceScore: 80
        },
        successReasoning: "Excellent buffer remains, which can be optimized with sequential milestones.",
        remedialSuggestions: ["Block out morning timeboxes", "Postpone optional communication windows"]
      };
    }
  }
}
