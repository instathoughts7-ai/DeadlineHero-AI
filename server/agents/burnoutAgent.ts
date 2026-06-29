import { getAI } from "../ai";
import { z } from "zod";

export interface BurnoutInput {
  focusHours: number;
  sleepHours: number; // e.g. 6.5
  pendingTasksCount: number;
  meetingHours: number; // e.g. 4.0
  weeklyProductivityScore: number;
}

export interface BurnoutOutput {
  burnoutIndex: number; // 0-100
  burnoutStatus: "stable" | "caution" | "danger" | "critical";
  sleepFeedback: string;
  burnoutAnalysis: string;
  scheduleBreakRecommendations: string[]; // concrete break recommendation sentences
}

const burnoutOutputSchema = z.object({
  burnoutIndex: z.number().min(0).max(100).default(30),
  burnoutStatus: z.enum(["stable", "caution", "danger", "critical"]).default("stable"),
  sleepFeedback: z.string().default("Maintaining a consistent sleep cycle of 7-8 hours is vital for sustained cognitive precision."),
  burnoutAnalysis: z.string().default("Workload density is within standard operational parameters. Keep monitoring focus vs recovery cycles to avoid burnout accumulation."),
  scheduleBreakRecommendations: z.array(z.string()).default([])
});

export class BurnoutAgent {
  static async execute(input: BurnoutInput): Promise<BurnoutOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Burnout Monitor" agent for DeadlineHero AI.
      Your mission is to evaluate cognitive fatigue and mental energy depletion based on work trends.

      Work & Lifestyle Inputs:
      - Total Daily Focus Hours: ${input.focusHours} hours
      - Reported Nightly Sleep: ${input.sleepHours} hours
      - Pending High-Priority Tasks Count: ${input.pendingTasksCount}
      - Meeting Density: ${input.meetingHours} hours/day
      - Current Productivity Score: ${input.weeklyProductivityScore}/100

      Assess the user's cognitive state:
      1. Calculate a Burnout Index (0-100). High focus hours combined with low sleep, heavy meetings, and many tasks dramatically spike this index.
      2. Categorize the Burnout Status:
         - "stable" (0-30): Healthy work-rest boundaries
         - "caution" (31-60): Moderate fatigue, recommend quick decompression intervals
         - "danger" (61-85): High overload risk, schedule adjustments required
         - "critical" (86-100): Extreme burnout warning, emergency break mandatory
      3. Provide a clear, custom "sleepFeedback" sentence discussing their sleep constraints.
      4. Write a 2-paragraph "burnoutAnalysis" explaining the physiological and psychological impact of their current density.
      5. Formulate 3-4 highly tailored "scheduleBreakRecommendations" (e.g., "Schedule a 30-minute off-screen walking break at 3 PM", "Introduce a hard stop to all screen time after 8:30 PM").

      Return a JSON object conforming exactly to this schema:
      {
        "burnoutIndex": 45,
        "burnoutStatus": "stable" | "caution" | "danger" | "critical",
        "sleepFeedback": "Your 6.5 hours of sleep is below the 7.5-hour cognitive baseline...",
        "burnoutAnalysis": "Analysis paragraph...",
        "scheduleBreakRecommendations": [
          "Break recommendation 1...",
          "Break recommendation 2..."
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
      const rawJson = JSON.parse(text);
      const validated = burnoutOutputSchema.safeParse(rawJson);

      if (validated.success) {
        return validated.data as BurnoutOutput;
      } else {
        console.warn("Zod validation failed for BurnoutAgent, using fallback:", validated.error);
        return {
          burnoutIndex: typeof rawJson.burnoutIndex === "number" ? rawJson.burnoutIndex : 40,
          burnoutStatus: ["stable", "caution", "danger", "critical"].includes(rawJson.burnoutStatus) ? rawJson.burnoutStatus : "caution",
          sleepFeedback: rawJson.sleepFeedback || "Ensure you prioritize sleep to maintain cognitive focus and logical performance.",
          burnoutAnalysis: rawJson.burnoutAnalysis || "High operational density increases systemic strain. It is highly advised to restructure work blocks with larger buffers.",
          scheduleBreakRecommendations: Array.isArray(rawJson.scheduleBreakRecommendations) ? rawJson.scheduleBreakRecommendations : []
        };
      }
    } catch (e: any) {
      console.warn("BurnoutAgent using fallback due to API limit/error:", e?.message || e);
      
      // Calculate a highly accurate, dynamic fallback representation of the burnout index
      let sleepPoints = 0;
      if (input.sleepHours < 5) {
        sleepPoints = (7 - input.sleepHours) * 15 + 10;
      } else if (input.sleepHours < 7) {
        sleepPoints = (7 - input.sleepHours) * 15;
      } else if (input.sleepHours >= 8) {
        sleepPoints = -5;
      }

      let focusPoints = 0;
      if (input.focusHours > 8) {
        focusPoints = (input.focusHours - 8) * 10;
        if (input.focusHours > 12) {
          focusPoints += 15;
        }
      }

      const meetingPoints = input.meetingHours > 3 ? (input.meetingHours - 3) * 8 : 0;
      const taskPoints = input.pendingTasksCount > 5 ? Math.min((input.pendingTasksCount - 5) * 3, 20) : 0;
      const productivityPoints = (input.weeklyProductivityScore > 85 && input.focusHours > 8) ? 10 : 0;

      const totalScore = Math.min(Math.max(Math.round(30 + sleepPoints + focusPoints + meetingPoints + taskPoints + productivityPoints), 0), 100);

      let calculatedStatus: "stable" | "caution" | "danger" | "critical" = "stable";
      if (totalScore > 85) {
        calculatedStatus = "critical";
      } else if (totalScore > 60) {
        calculatedStatus = "danger";
      } else if (totalScore > 30) {
        calculatedStatus = "caution";
      }

      let calculatedSleepFeedback = "";
      if (input.sleepHours < 5) {
        calculatedSleepFeedback = `At only ${input.sleepHours} hours of sleep, you are in a severe sleep deficit. Your brain is struggling with cognitive repair and memory consolidation.`;
      } else if (input.sleepHours < 7) {
        calculatedSleepFeedback = `With ${input.sleepHours} hours of sleep, you are slightly below the recommended 7.5-hour threshold, which can decrease concentration over consecutive days.`;
      } else if (input.sleepHours >= 7 && input.sleepHours <= 9) {
        calculatedSleepFeedback = `Your sleep duration (${input.sleepHours}h) is within the healthy recovery range. Keep this up to sustain peak logical reasoning.`;
      } else {
        calculatedSleepFeedback = `You recorded ${input.sleepHours} hours of sleep. While plenty of sleep is restful, excessive sleep can sometimes indicate physical exhaustion.`;
      }

      let calculatedBurnoutAnalysis = "";
      if (calculatedStatus === "critical") {
        calculatedBurnoutAnalysis = `Your current daily load of ${input.focusHours} focus hours combined with ${input.meetingHours}h of meetings and a severe sleep deficit puts you at extreme risk of cognitive exhaustion. Systemic overload is imminent, and neurological productivity will rapidly degrade without immediate intervention. Under these conditions, your brain's executive functioning is compromised. It is highly recommended to reschedule at least 30% of your non-urgent meetings and delegate or snooze tasks.`;
      } else if (calculatedStatus === "danger") {
        calculatedBurnoutAnalysis = `You are operating at high density. Juggling ${input.pendingTasksCount} pending tasks with ${input.focusHours}h of intense daily focus is pushing your cognitive stamina to its limit. Signs of fatigue are accumulating, and performance speed is likely declining. To optimize your output, continue incorporating structured rest intervals. Maintaining a consistent sleep pattern is your highest-leverage asset to avoid sudden deadline panic.`;
      } else if (calculatedStatus === "caution") {
        calculatedBurnoutAnalysis = `You are in a moderate operational phase. Juggling focus hours (${input.focusHours}h) and meeting loads (${input.meetingHours}h) requires deliberate pacing. Mindful boundary setting will keep you from sliding into higher stress zones. Try to introduce consistent interval-based resting buffers between focus sessions.`;
      } else {
        calculatedBurnoutAnalysis = `Your current schedule shows excellent balance. Your workload, meeting density, and sleep cycles are well-proportioned, allowing your prefrontal cortex to recover fully and maintain consistent focus. No elevated burnout risks were detected.`;
      }

      const calculatedRecommendations: string[] = [];
      if (input.sleepHours < 6.5) {
        calculatedRecommendations.push("Prioritize a strict 30-minute afternoon 'NSDR' (Non-Sleep Deep Rest) or quiet rest block to offset sleep debt.");
        calculatedRecommendations.push("Establish a wind-down routine tonight: no screens starting 45 minutes before bedtime.");
      }
      if (input.meetingHours > 3) {
        calculatedRecommendations.push("Convert at least one of your meetings into an 'audio-only' walking meeting to reduce screen fatigue.");
        calculatedRecommendations.push("Block a 15-minute 'buffer zone' directly after dense meetings to decompress.");
      }
      if (input.focusHours > 7) {
        calculatedRecommendations.push("Implement the 50/10 rule: 50 minutes of deep focus followed by 10 minutes of complete cognitive rest.");
        calculatedRecommendations.push("Step away from your workstation for a 15-minute outdoor walk to restore visual and mental acuity.");
      }
      if (input.pendingTasksCount > 6) {
        calculatedRecommendations.push("Ruthlessly deprioritize: pick only the single most critical task for today and hide the rest to reduce mental clutter.");
      }
      if (calculatedRecommendations.length < 2) {
        calculatedRecommendations.push("Keep a glass of water at your desk and take a 2-minute stretching break every 90 minutes.");
        calculatedRecommendations.push("Reflect on today's micro-wins at the end of your work day to trigger positive dopaminergic reinforcement.");
      }

      return {
        burnoutIndex: totalScore,
        burnoutStatus: calculatedStatus,
        sleepFeedback: calculatedSleepFeedback,
        burnoutAnalysis: calculatedBurnoutAnalysis,
        scheduleBreakRecommendations: calculatedRecommendations.slice(0, 4)
      };
    }
  }
}
