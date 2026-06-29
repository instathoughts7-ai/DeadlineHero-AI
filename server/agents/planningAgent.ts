import { getAI } from "../ai";
import { z } from "zod";

export interface PlanningInput {
  title: string;
  description?: string;
  category?: string;
  deadline: string;
  effort: number;
}

export interface PlanningSubtask {
  title: string;
  estimatedHours: number;
  dependencies: string[];
}

export interface PlanningOutput {
  subtasks: PlanningSubtask[];
  strategy: string;
  estimatedCompletionTime: string; // ISO or human-readable
  successProbability: number; // 0-100
  criticalDependencies: string[];
}

const planningOutputSchema = z.object({
  subtasks: z.array(
    z.object({
      title: z.string(),
      estimatedHours: z.number().default(1),
      dependencies: z.array(z.string()).default([])
    })
  ).default([]),
  strategy: z.string().default("Execute milestones in structured focused intervals, securing foundational components before proceeding to visual Polish."),
  estimatedCompletionTime: z.string().default(new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()),
  successProbability: z.number().min(0).max(100).default(85),
  criticalDependencies: z.array(z.string()).default([])
});

export class PlanningAgent {
  static async execute(input: PlanningInput): Promise<PlanningOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Executive Planner" for DeadlineHero AI.
      Analyze this overarching goal:
      - Title: "${input.title}"
      - Description: "${input.description || "No description provided."}"
      - Category: "${input.category || "General"}"
      - Deadline: ${input.deadline}
      - Total Self-Estimated Effort: ${input.effort} hours
      - Current Time: ${new Date().toISOString()}

      Your goals:
      1. Understand the overarching goal and its feasibility.
      2. Split the goal into 4 to 8 highly realistic, sequenced subtasks (milestones).
      3. For each subtask, estimate the realistic effort in decimal hours and specify any other subtask title it depends on.
      4. Estimate the exact Date/Time of overall completion (estimatedCompletionTime) assuming standard focused work blocks.
      5. Estimate the overall success probability (0-100%) of finishing this task on time given the deadline.
      6. Formulate a short "strategy" sequencing blueprint (2-3 sentences).
      7. Identify any critical bottlenecks or external factors (criticalDependencies).

      Return a JSON object conforming exactly to this schema:
      {
        "subtasks": [
          { "title": "Subtask title", "estimatedHours": 1.5, "dependencies": ["Previous subtask title"] }
        ],
        "strategy": "Your sequencing strategy...",
        "estimatedCompletionTime": "YYYY-MM-DDTHH:MM:SSZ",
        "successProbability": 85,
        "criticalDependencies": ["API credentials", "Server deployment access"]
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
      const validated = planningOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as PlanningOutput;
      } else {
        console.warn("Zod validation failed for PlanningAgent, using fallback:", validated.error);
        return {
          subtasks: (rawJson.subtasks || []).map((s: any, idx: number) => ({
            title: s.title || `Milestone ${idx + 1}`,
            estimatedHours: typeof s.estimatedHours === "number" ? s.estimatedHours : 1,
            dependencies: Array.isArray(s.dependencies) ? s.dependencies : []
          })),
          strategy: rawJson.strategy || "Execute milestones in structured focused intervals, securing foundational components before proceeding to visual Polish.",
          estimatedCompletionTime: rawJson.estimatedCompletionTime || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          successProbability: typeof rawJson.successProbability === "number" ? rawJson.successProbability : 80,
          criticalDependencies: Array.isArray(rawJson.criticalDependencies) ? rawJson.criticalDependencies : []
        };
      }
    } catch (e: any) {
      console.warn("PlanningAgent using fallback due to API limit/error:", e?.message || e);
      return {
        subtasks: [
          { title: "Initialize core components", estimatedHours: 1, dependencies: [] },
          { title: "Develop backend routes & data controllers", estimatedHours: 1.5, dependencies: ["Initialize core components"] },
          { title: "Assemble responsive interface panels", estimatedHours: 1.5, dependencies: ["Develop backend routes & data controllers"] },
          { title: "Run verification tests and performance check", estimatedHours: 1, dependencies: ["Assemble responsive interface panels"] }
        ],
        strategy: "Break work down sequentially, prioritizing backend dependencies and interface structure first.",
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        successProbability: 80,
        criticalDependencies: ["Developer focus state", "Data pipeline latency"]
      };
    }
  }
}
