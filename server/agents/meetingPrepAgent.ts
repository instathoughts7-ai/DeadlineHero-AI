import { getAI } from "../ai";

export interface MeetingPrepInput {
  meetingType: "interview" | "presentation" | "exam" | "client meeting";
  title: string;
  context?: string;
  datetime: string;
}

export interface PrepScheduleBlock {
  title: string;
  durationHours: number;
  activity: string;
}

export interface MeetingPrepOutput {
  planMarkdown: string;
  objectives: string[];
  suggestedQuestions: string[];
  prepSchedules: PrepScheduleBlock[];
}

export class MeetingPrepAgent {
  static async execute(input: MeetingPrepInput): Promise<MeetingPrepOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Meeting Preparation Agent" for DeadlineHero AI.
      Your goal is to prepare a professional, rigorous, and highly structured preparation plan and schedule for a user's upcoming high-stakes meeting.

      Meeting Type: ${input.meetingType.toUpperCase()}
      Meeting Title: "${input.title}"
      Context / Details: "${input.context || "No context provided."}"
      Scheduled Date/Time: ${input.datetime}
      Current Time: ${new Date().toISOString()}

      Generate:
      1. A comprehensive, beautifully formatted Markdown "planMarkdown" containing:
         - A tactical overview
         - Reading/Review material priorities
         - Active preparation strategies specific to the meeting type (e.g., mock interview, slide draft, quiz sessions, negotiation guidelines)
         - Checklists for 24 hours before, 1 hour before, and during the meeting.
      2. A list of 3-5 high-level "objectives" for this meeting.
      3. A list of 4-6 "suggestedQuestions" or discussion points (e.g., tough interview questions, potential client concerns, typical exam topics, presentation FAQs).
      4. A sequence of 2-4 "prepSchedules" (preparation focus sessions) that should be completed before the meeting. Each block has a "title" (concise, e.g., "Research & Deck Outlining"), "durationHours" (e.g., 1.5), and "activity" (brief details of what to focus on).

      Return a JSON object matching this schema exactly:
      {
        "planMarkdown": "Markdown-formatted preparation guide text...",
        "objectives": ["Objective 1", "Objective 2"],
        "suggestedQuestions": ["Question/Discussion point 1", "Question/Discussion point 2"],
        "prepSchedules": [
          { "title": "Prep Step Title", "durationHours": 1.5, "activity": "Specific activity description..." }
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
      return JSON.parse(text) as MeetingPrepOutput;
    } catch (e: any) {
      console.warn("MeetingPrepAgent using fallback due to API limit/error:", e?.message || e);
      return {
        planMarkdown: `## Meeting Preparation Checklist

- **Review agenda**: Familiarize yourself with the high-level goals of this meeting.
- **Decompress**: Take a 10-minute quiet screen-free breather before logging on or arriving.
- **Set up notes**: Have a clean document open for capturing actionable items.`,
        objectives: ["Establish alignment on the key topics discussed", "Define clear next steps and owner roles"],
        suggestedQuestions: [
          "What are the main timelines and blockers for this milestone?",
          "How can we support the immediate action items discussed today?"
        ],
        prepSchedules: [
          { title: "Review background material", durationHours: 0.5, activity: "Quick scan of docs and previous notes" }
        ]
      };
    }
  }
}
