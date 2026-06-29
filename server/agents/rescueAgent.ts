import { getAI } from "../ai";
import { z } from "zod";

export interface RescueInput {
  tasks: any[];
  currentSchedules: any[];
  energyLevel: "high" | "medium" | "low";
  notes?: string;
}

export interface RescueOutput {
  estimatedSuccessProbability: number; // 0-100
  deferredTasks: string[]; // list of task titles to postpone/freeze
  recoveryActions: string[]; // concrete actionable steps
  reorganizedBlocks: any[]; // reorganized schedule blocks
  reasoningExplanation: string; // deep explanation of how rescue works
}

const rescueOutputSchema = z.object({
  estimatedSuccessProbability: z.number().min(0).max(100).default(75),
  deferredTasks: z.array(z.string()).default([]),
  recoveryActions: z.array(z.string()).default([]),
  reorganizedBlocks: z.array(
    z.object({
      id: z.string(),
      taskId: z.string().nullable().default(null),
      title: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      type: z.enum(["work", "meeting", "break", "personal", "travel"]).default("work")
    })
  ).default([]),
  reasoningExplanation: z.string().default("Implementing workload triage by deferring lower-priority activities and structuring targeted focus sessions.")
});

export class RescueAgent {
  static async execute(input: RescueInput): Promise<RescueOutput> {
    const ai = getAI();
    const prompt = `
      You are the "Deadline Rescue Agent", the flagship neural rescue engine of DeadlineHero AI.
      The user is feeling overloaded, behind on milestones, or facing calendar logjams. 
      Your mission is to perform a rigorous dependency and time audit to save their goals.

      Overdue/High-Risk Tasks:
      ${JSON.stringify(input.tasks || [])}

      Current Calendar Commitments/Work Blocks:
      ${JSON.stringify(input.currentSchedules || [])}

      User Parameters:
      - Energy Level: "${input.energyLevel}" (high, medium, low)
      - Additional context notes: "${input.notes || "None"}"
      - Current Time: ${new Date().toISOString()}

      Your goals:
      1. Detect which tasks are causing the worst logjams.
      2. Identify 1 to 3 low-priority, non-essential tasks that can be deferred/postponed (deferredTasks) to free up bandwidth.
      3. Create 3 to 5 highly concrete, actionable "recoveryActions" (e.g. "Prune database schema design to a 1-hour timebox", "Decline non-essential meetings between 2PM and 5PM").
      4. Reorganize their immediate 24-48 hours by generating realistic, non-overlapping "reorganizedBlocks" of focus work and breaks.
      5. Calculate a realistic Success Probability (0-100%) if they implement this Rescue Plan.
      6. Provide a thorough "reasoningExplanation" detailing why this plan works and how it saves their deadlines.

      Return a JSON object conforming exactly to this schema:
      {
        "estimatedSuccessProbability": 75,
        "deferredTasks": ["Postpone slide styling", "Delay test coverage review"],
        "recoveryActions": [
          "Truncate design phase to 45 minutes...",
          "Lock Slack and personal devices in Focus Drawer..."
        ],
        "reorganizedBlocks": [
          {
            "id": "rescue-b1",
            "taskId": "task-id-or-null",
            "title": "Emergency Focus: [Task Title]",
            "startTime": "2026-06-28T14:00:00Z",
            "endTime": "2026-06-28T15:30:00Z",
            "type": "work"
          }
        ],
        "reasoningExplanation": "Detailed justification of schedule pruning..."
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
      const validated = rescueOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as RescueOutput;
      } else {
        console.warn("Zod validation failed for RescueAgent, using fallback:", validated.error);
        return {
          estimatedSuccessProbability: typeof rawJson.estimatedSuccessProbability === "number" ? rawJson.estimatedSuccessProbability : 70,
          deferredTasks: Array.isArray(rawJson.deferredTasks) ? rawJson.deferredTasks : [],
          recoveryActions: Array.isArray(rawJson.recoveryActions) ? rawJson.recoveryActions : [],
          reorganizedBlocks: Array.isArray(rawJson.reorganizedBlocks) ? rawJson.reorganizedBlocks.map((b: any, idx: number) => ({
            id: b.id || `rescue-fallback-${idx}`,
            taskId: b.taskId || null,
            title: b.title || "Emergency Focus",
            startTime: b.startTime || new Date().toISOString(),
            endTime: b.endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            type: ["work", "meeting", "break", "personal", "travel"].includes(b.type) ? b.type : "work"
          })) : [],
          reasoningExplanation: rawJson.reasoningExplanation || "Triage protocol triggered to stabilize your deadline security."
        };
      }
    } catch (e: any) {
      console.warn("RescueAgent using fallback due to API limit/error:", e?.message || e);
      return {
        estimatedSuccessProbability: 65,
        deferredTasks: [],
        recoveryActions: [
          "Defer non-urgent communication threads and optional synchronization loops.",
          "Establish a 90-minute strict timebox for core milestones immediately."
        ],
        reorganizedBlocks: [],
        reasoningExplanation: "Workload mitigation initialized by prioritizing critical paths."
      };
    }
  }
}
