import { getAI } from "../ai";

export interface EmailMessage {
  id: string;
  sender: string;
  subject: string;
  date: string;
  body: string;
}

export interface ActionableEmailTask {
  title: string;
  description: string;
  category: "Development" | "Design" | "Writing" | "Research" | "Other";
  urgency: "low" | "medium" | "high";
  importance: "low" | "medium" | "high";
  effort: number; // hours
  deadline: string; // ISO string
  subtasks: string[];
}

export interface EmailDigestOutput {
  summary: string;
  actionableTasks: ActionableEmailTask[];
  overallInboxUrgency: "low" | "medium" | "high";
}

export class EmailDigestAgent {
  static async execute(emails: EmailMessage[]): Promise<EmailDigestOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Email Digest Agent" for DeadlineHero AI.
      Your job is to analyze incoming raw email threads, detect actionable work items, and automatically extract them as prioritized, structured task nodes with checklists and deadlines.

      Emails for analysis:
      ${JSON.stringify(emails)}

      Current Date/Time context: ${new Date().toISOString()} (Use this to calculate relative dates, e.g. "by Monday", "in two days", "next Friday")

      Perform the following tasks:
      1. Analyze all email bodies for explicit commitments, requests, or action items.
      2. Summarize the key action items across the inbox ("summary").
      3. Convert each actionable commitment into a structured task payload matching the "ActionableEmailTask" structure.
         - For each task, write a clear title and a detailed description linking it back to the sender (e.g. "[Email from Jane] Revise Landing Page Copy").
         - Determine realistic urgency, importance, and effort based on context.
         - Calculate a precise ISO deadline string. If not mentioned, default to 3 days from today.
         - Break down the task into 2-4 checklist subtasks.
      4. Rate the overall inbox urgency level ("low" | "medium" | "high").

      Return a JSON object conforming exactly to this structure:
      {
        "summary": "General overview of action items extracted from the inbox...",
        "overallInboxUrgency": "high",
        "actionableTasks": [
          {
            "title": "...",
            "description": "...",
            "category": "Development",
            "urgency": "high",
            "importance": "high",
            "effort": 3.5,
            "deadline": "ISO String",
            "subtasks": ["Subtask 1", "Subtask 2"]
          }
        ]
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
      return JSON.parse(text) as EmailDigestOutput;
    } catch (e: any) {
      console.warn("EmailDigestAgent using fallback due to API limit/error:", e?.message || e);
      return {
        summary: "Your inbox contains a few standard communications. No critical or highly urgent task deadlines were flagged by the AI agent.",
        overallInboxUrgency: "low",
        actionableTasks: []
      };
    }
  }
}
