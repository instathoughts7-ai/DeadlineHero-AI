import { getAI } from "../ai";
import { z } from "zod";

export interface SchedulingInput {
  tasks: any[];
  currentEvents: any[];
  startTime?: string;
  endTime?: string;
  travelConstraints?: boolean;
  focusPreferences?: string; // e.g. "morning-heavy", "afternoon-heavy"
}

export interface ScheduledBlock {
  id: string;
  taskId: string | null;
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
  type: "work" | "meeting" | "break" | "personal" | "travel";
}

export interface SchedulingOutput {
  scheduleBlocks: ScheduledBlock[];
  optimizationNotes: string;
}

const scheduledBlockSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable().default(null),
  title: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: z.enum(["work", "meeting", "break", "personal", "travel"]).default("work")
});

const schedulingOutputSchema = z.object({
  scheduleBlocks: z.array(scheduledBlockSchema).default([]),
  optimizationNotes: z.string().default("Daily blocks aligned based on focus guidelines and personal commitments.")
});

export class SchedulingAgent {
  static async execute(input: SchedulingInput): Promise<SchedulingOutput> {
    const ai = getAI();
    const prompt = `
      You are the "Scheduling Agent" for DeadlineHero AI.
      Create an intelligent, optimized work schedule of focus blocks, breaks, and optional travel time.
      
      Tasks to fit:
      ${JSON.stringify(input.tasks || [])}

      Existing calendar commitments/meetings (DO NOT OVERLAP THESE):
      ${JSON.stringify(input.currentEvents || [])}

      Scheduling Range:
      Start: ${input.startTime || new Date().toISOString()}
      End: ${input.endTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}

      Focus Preference: "${input.focusPreferences || "balanced"}"
      Include Travel Buffer: ${input.travelConstraints || false}

      Rules:
      1. Every work block must be between 45 and 120 minutes.
      2. Insert 10-15 minute break blocks between consecutive work sessions.
      3. Allocate time slots ONLY within the free spaces between existing commitments.
      4. Assign a unique generated ID (string) to each schedule block.
      5. Link taskId to the specific task if it's a work block; otherwise taskId must be null.
      6. If travel buffers are needed before or after meetings/personal slots, insert "travel" type blocks of 30 mins.
      7. Provide "optimizationNotes" explaining how the schedule was aligned.

      Return a JSON object conforming exactly to this schema:
      {
        "scheduleBlocks": [
          {
            "id": "block-1",
            "taskId": "task-id-or-null",
            "title": "Work Session: UI Prototyping",
            "startTime": "2026-06-28T10:00:00Z",
            "endTime": "2026-06-28T11:30:00Z",
            "type": "work"
          }
        ],
        "optimizationNotes": "Explanation of daily alignment..."
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
      const validated = schedulingOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as SchedulingOutput;
      } else {
        console.warn("Zod validation failed for SchedulingAgent, using fallback:", validated.error);
        return {
          scheduleBlocks: Array.isArray(rawJson.scheduleBlocks) ? rawJson.scheduleBlocks.map((b: any, idx: number) => ({
            id: b.id || `schedule-fallback-${idx}`,
            taskId: b.taskId || null,
            title: b.title || "Focus Block",
            startTime: b.startTime || new Date().toISOString(),
            endTime: b.endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            type: ["work", "meeting", "break", "personal", "travel"].includes(b.type) ? b.type : "work"
          })) : [],
          optimizationNotes: rawJson.optimizationNotes || "Schedule constructed with robust alignment buffers."
        };
      }
    } catch (e: any) {
      console.warn("SchedulingAgent using fallback due to API limit/error:", e?.message || e);
      return {
        scheduleBlocks: [],
        optimizationNotes: "Adaptive scheduling offline, scheduling fallback active."
      };
    }
  }
}
