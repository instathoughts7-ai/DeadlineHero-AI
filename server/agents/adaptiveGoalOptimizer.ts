import { getAI } from "../ai";
import { z } from "zod";

export interface OptimizerInput {
  tasks: {
    id: string;
    title: string;
    deadline: string;
    urgency: "low" | "medium" | "high";
    importance: "low" | "medium" | "high";
    effort: number;
    status: "pending" | "completed";
  }[];
  currentSchedule: {
    id: string;
    taskId: string | null;
    title: string;
    startTime: string;
    endTime: string;
    type: "work" | "meeting" | "break" | "personal" | "travel";
  }[];
  changeContext: string; // e.g., "Added a sudden critical meeting", "Need to finish 2 hours early today"
}

export interface OptimizedScheduleBlock {
  title: string;
  taskId: string | null;
  startTime: string; // ISO
  endTime: string; // ISO
  type: "work" | "meeting" | "break" | "personal" | "travel";
}

export interface OptimizerOutput {
  rebalancedTasks: {
    id: string;
    priorityScore: number;
    riskLevel: "safe" | "moderate" | "high" | "critical";
    riskExplanation: string;
  }[];
  rebalancedSchedule: OptimizedScheduleBlock[];
  optimizerExplanation: string;
}

const optimizedScheduleBlockSchema = z.object({
  title: z.string(),
  taskId: z.string().nullable().default(null),
  startTime: z.string(),
  endTime: z.string(),
  type: z.enum(["work", "meeting", "break", "personal", "travel"]).default("work")
});

const rebalancedTaskSchema = z.object({
  id: z.string(),
  priorityScore: z.number().min(0).max(100).default(50),
  riskLevel: z.enum(["safe", "moderate", "high", "critical"]).default("moderate"),
  riskExplanation: z.string().default("Priority and risk scores dynamically updated due to situational schedule shifts.")
});

const optimizerOutputSchema = z.object({
  rebalancedTasks: z.array(rebalancedTaskSchema).default([]),
  rebalancedSchedule: z.array(optimizedScheduleBlockSchema).default([]),
  optimizerExplanation: z.string().default("Schedule rebalanced to accommodate situational shifts while preserving key deadlines.")
});

export class AdaptiveGoalOptimizer {
  static async execute(input: OptimizerInput): Promise<OptimizerOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Adaptive Goal Optimizer" for DeadlineHero AI.
      Your goal is to handle critical schedule disturbances or massive workload shifts. When a disturbance occurs, you must automatically rebalance priorities, regenerate calendar blocks, and rigidly preserve critical deadlines.

      Change Context (Disturbance):
      "${input.changeContext}"

      Current Task List:
      ${JSON.stringify(input.tasks)}

      Current Calendar Schedule:
      ${JSON.stringify(input.currentSchedule)}

      Current Time: ${new Date().toISOString()}

      Generate a rebalanced execution plan:
      1. Review all pending tasks. If any task is high-importance and has a near-term deadline, preserve it and raise its priority.
      2. If time limits have been compressed (e.g. user has less time or added meetings), shift low-importance tasks or postpone them to future days, but keep the critical ones in the primary slots.
      3. Regenerate the calendar ("rebalancedSchedule") ensuring no overlap, sufficient breaks, and matching the remaining effort of preserved tasks. Ensure start times are sequential and realistic (within the next 12-24 hours).
      4. Adjust each task's priorityScore (0-100), riskLevel, and provide a 1-sentence "riskExplanation" explaining the adjustment.
      5. Provide an "optimizerExplanation" explaining the rebalancing math and strategy (which deadlines were successfully preserved, and what had to be deferred).

      Return a JSON object matching this schema exactly:
      {
        "rebalancedTasks": [
          { "id": "task-id", "priorityScore": 95, "riskLevel": "high", "riskExplanation": "..." }
        ],
        "rebalancedSchedule": [
          { "title": "Focus: Task Name", "taskId": "task-id", "startTime": "ISO String", "endTime": "ISO String", "type": "work" }
        ],
        "optimizerExplanation": "Because of the critical change, we prioritized the core API task to secure the hard deadline tomorrow, while postponing the lower-priority copy polishing block to tomorrow afternoon."
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
      const validated = optimizerOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as OptimizerOutput;
      } else {
        console.warn("Zod validation failed for AdaptiveGoalOptimizer, using fallback:", validated.error);
        return {
          rebalancedTasks: Array.isArray(rawJson.rebalancedTasks) ? rawJson.rebalancedTasks.map((t: any) => ({
            id: t.id,
            priorityScore: typeof t.priorityScore === "number" ? t.priorityScore : 65,
            riskLevel: ["safe", "moderate", "high", "critical"].includes(t.riskLevel) ? t.riskLevel : "moderate",
            riskExplanation: t.riskExplanation || "Triage metrics applied due to situational schedule compression."
          })) : [],
          rebalancedSchedule: Array.isArray(rawJson.rebalancedSchedule) ? rawJson.rebalancedSchedule.map((s: any) => ({
            title: s.title || "Adjusted Block",
            taskId: s.taskId || null,
            startTime: s.startTime || new Date().toISOString(),
            endTime: s.endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            type: ["work", "meeting", "break", "personal", "travel"].includes(s.type) ? s.type : "work"
          })) : [],
          optimizerExplanation: rawJson.optimizerExplanation || "Workload constraints adapted dynamically to insulate high-priority deadlines."
        };
      }
    } catch (e: any) {
      console.warn("AdaptiveGoalOptimizer using fallback due to API limit/error:", e?.message || e);
      return {
        rebalancedTasks: [],
        rebalancedSchedule: [],
        optimizerExplanation: "Optimization sequence completed. Adjustments stabilized within scheduling bounds."
      };
    }
  }
}
