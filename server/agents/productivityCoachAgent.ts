import { getAI } from "../ai";

export interface CoachInput {
  userStats: {
    focusHours: number;
    streakDays: number;
    completionRate: number;
    productivityScore: number;
  };
  tasks: any[];
  activeBlocker?: string;
  chatHistory: { role: "user" | "model"; text: string }[];
}

export interface CoachTipItem {
  title: string;
  content: string;
  category: "procrastination" | "focus" | "planning" | "routine";
}

export interface CoachOutput {
  coachMessage: string;
  tips: CoachTipItem[];
  smallestNextAction: string; // suggest the absolute smallest step (e.g. "Create index.html and write 1 tag")
  procrastinationAnalysis: string; // deep behavior analysis
  accountabilityPrompt: string; // A direct, proactive nudge (e.g., "I noticed 'Task A' was postponed twice...")
}

export class ProductivityCoachAgent {
  static async execute(input: CoachInput): Promise<CoachOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Productivity Coach & Procrastination Detector" for DeadlineHero AI.
      You help users defeat procrastination, manage focus, build sustainable habits, and stay accountable.

      Current User Performance Stats:
      - Completion rate: ${input.userStats.completionRate}%
      - Current Focus Streak: ${input.userStats.streakDays} days
      - Total Focus Hours: ${input.userStats.focusHours} hours
      - Productivity Score: ${input.userStats.productivityScore}/100

      Active Tasks List:
      ${JSON.stringify(input.tasks || [])}

      Current Procrastination Blocker reported by user: "${input.activeBlocker || "None"}"
      
      Recent Chat History context:
      ${JSON.stringify(input.chatHistory || [])}

      Your task is to analyze these patterns and provide:
      1. An empathetic, psychology-based analysis of their blocker and habits (procrastinationAnalysis).
      2. A tailored response message (coachMessage) supporting them directly.
      3. A set of 2-3 actionable, high-impact tips (tips) with title, content, and category.
      4. Suggest the absolute "smallest next action" (smallestNextAction) to bypass starting resistance (e.g., "Open your editor and type one line of comment", "Write just the file headers").
      5. Formulate a proactive, direct "accountabilityPrompt" that acts as an initiating coach check-in based on their pending tasks (e.g., "Hey! You scheduled 'Build API' for 2 PM but are currently behind. Can we commit to completing the routing schema in the next 15 minutes?").

      Return a JSON object conforming exactly to this schema:
      {
        "coachMessage": "Empathetic, actionable coaching message...",
        "tips": [
          {
            "title": "The 5-Minute Rules of Momentum",
            "content": "Commit to working on the blocker for just 5 minutes...",
            "category": "procrastination" | "focus" | "planning" | "routine"
          }
        ],
        "smallestNextAction": "The smallest next micro-step...",
        "procrastinationAnalysis": "Psychological habit analysis...",
        "accountabilityPrompt": "Proactive accountability nudging text..."
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
      return JSON.parse(text) as CoachOutput;
    } catch (e: any) {
      console.warn("ProductivityCoachAgent using fallback due to API limit/error:", e?.message || e);
      return {
        coachMessage: "It looks like you have some high-priority milestones ahead. Let's focus on taking a small, sustainable step to build momentum.",
        tips: [
          {
            title: "The 5-Minute Rule of Momentum",
            content: "Commit to working on your highest-priority task for just 5 minutes. Starting is 90% of the friction.",
            category: "procrastination"
          },
          {
            title: "Timeboxing Deep Blocks",
            content: "Create a distraction-free 45-minute focus session followed by a strict 10-minute mental rest loop.",
            category: "focus"
          }
        ],
        smallestNextAction: "Open your active task details and write down one sentence or file definition.",
        procrastinationAnalysis: "Starting friction often stems from over-analyzing the complexity of a task. Breaking it into a singular micro-step helps bypass defensive procrastination triggers.",
        accountabilityPrompt: "Can we commit to opening your editor and writing a simple outline in the next 10 minutes?"
      };
    }
  }
}
