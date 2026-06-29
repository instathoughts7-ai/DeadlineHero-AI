import { getAI } from "../ai";

export interface ContextMemoryInput {
  tasks: {
    title: string;
    category: string;
    status: "pending" | "completed";
    effort: number;
    riskLevel: string;
    reflection?: { wins: string; blockers: string; improvements: string; completedAt: string } | null;
  }[];
  focusSessions: {
    duration: number;
    completedAt: string;
    distractionsCount: number;
    productivityRating: number;
  }[];
}

export interface ContextMemoryOutput {
  preferredFocusHours: string;
  completionSpeed: string;
  procrastinationPatterns: string;
  productivityHabits: string;
  personalizedAdvice: string;
  focusHourRanges: { startHour: number; endHour: number; efficiencyScore: number }[];
}

export class ContextMemoryAgent {
  static async execute(input: ContextMemoryInput): Promise<ContextMemoryOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Context Memory Agent" for DeadlineHero AI.
      Your goal is to parse historical performance data, focus sessions, and reflections to reconstruct a personalized, adaptive productivity profile for the user.

      Focus Sessions Log:
      ${JSON.stringify(input.focusSessions)}

      Tasks & Reflections Log:
      ${JSON.stringify(input.tasks)}

      Analyze these logs to extract deep, personalized insights regarding:
      1. Preferred Focus Hours: When does the user get the most focused, high-productivity work done? (Determine from focus completedAt timestamps and productivityRatings)
      2. Completion Speed: What is their actual completion velocity across different categories? Are their estimations accurate or do they experience planning fallacy?
      3. Procrastination Patterns: What triggers their procrastination? (e.g. high effort, specific categories, or certain days/times?)
      4. Productivity Habits: What working patterns (like session lengths, distraction counts, or wins in reflections) indicate high efficiency?
      5. Personalized Advice: Write a direct, highly customized 2-sentence advice block on how they should design their schedule to optimize their specific cognitive style.

      Return a JSON object conforming exactly to this schema:
      {
        "preferredFocusHours": "e.g., Early Mornings (08:00 - 11:00) based on peak focus scores...",
        "completionSpeed": "e.g., Tends to underestimate development effort by 25% but hits research deadlines accurately...",
        "procrastinationPatterns": "e.g., Paralysis triggers when task effort exceeds 6 hours without subtask breakdown...",
        "productivityHabits": "e.g., Optimal focus session length is 45 minutes with less than 2 distraction interrupts...",
        "personalizedAdvice": "Personalized scheduler configuration advice...",
        "focusHourRanges": [
          { "startHour": 9, "endHour": 12, "efficiencyScore": 92 }
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
      return JSON.parse(text) as ContextMemoryOutput;
    } catch (e: any) {
      console.warn("ContextMemoryAgent using fallback due to API limit/error:", e?.message || e);
      return {
        preferredFocusHours: "Mornings (09:00 AM - 12:00 PM) based on standard focus statistics.",
        completionSpeed: "Moderate; generally aligns with initial estimations.",
        procrastinationPatterns: "Prone to initial starting resistance for high-complexity milestones.",
        productivityHabits: "Shows consistent focus patterns with standard intervals.",
        personalizedAdvice: "Focus on starting with micro-steps during your first focus session of the day.",
        focusHourRanges: [
          { startHour: 9, endHour: 12, efficiencyScore: 85 }
        ]
      };
    }
  }
}
