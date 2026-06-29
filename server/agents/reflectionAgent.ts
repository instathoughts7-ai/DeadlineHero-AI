import { getAI } from "../ai";

export interface DailyPlannerInput {
  tasks: any[];
  currentEvents: any[];
  userStats: {
    focusHours: number;
    streakDays: number;
    completionRate: number;
    productivityScore: number;
  };
}

export interface DailyPlannerOutput {
  todayPriorities: string[]; // List of 3 key priority titles
  todayScheduleOutline: { timeSlot: string; activity: string }[];
  suggestedFocusBlocks: string[]; // Focus tips for today
  recoveryOpportunities: string[]; // Rest opportunities
  highRiskTasks: string[]; // List of task titles that are risky
  plannerExplanation: string; // Encouraging summary
}

export interface WeeklyReviewInput {
  tasks: any[];
  focusSessions: any[];
  userStats: {
    focusHours: number;
    streakDays: number;
    completionRate: number;
    productivityScore: number;
  };
}

export interface WeeklyReviewOutput {
  achievements: string[]; // list of achievements
  missedGoals: string[]; // list of missed goals
  productivityScore: number; // 0-100
  improvementAreas: string[]; // 2-3 areas to improve
  nextWeekPlan: string[]; // 3-4 steps for next week
  weeklySummaryMarkdown: string; // beautiful detailed summary in markdown
}

export class ReflectionAgent {
  static async generateDailyPlan(input: DailyPlannerInput): Promise<DailyPlannerOutput> {
    const ai = getAI();
    const prompt = `
      You are the "AI Daily Planner Desk" for DeadlineHero AI.
      Create an optimized morning action plan for the user today.

      Active Task List:
      ${JSON.stringify(input.tasks || [])}

      Manual Schedule Commitments:
      ${JSON.stringify(input.currentEvents || [])}

      Current Stats:
      - Focus Hours: ${input.userStats.focusHours}H
      - Streak: ${input.userStats.streakDays} days
      - Productivity Score: ${input.userStats.productivityScore}/100

      Perform the following scheduling and reflection duties:
      1. Extract the top 3 high-impact "todayPriorities" that must be attacked today.
      2. Draw up a realistic "todayScheduleOutline" (timeSlot and activity) around their meetings.
      3. Recommend 2 specific "suggestedFocusBlocks" (e.g. "9:00 AM - 10:30 AM: Deep Code block").
      4. Point out 2 "recoveryOpportunities" (e.g. "12:00 PM: 15-minute screen-free lunch walk").
      5. Call out "highRiskTasks" that might fail their deadlines if not prioritized.
      6. Provide a short "plannerExplanation" briefing.

      Return a JSON object conforming exactly to this schema:
      {
        "todayPriorities": ["...", "..."],
        "todayScheduleOutline": [
          { "timeSlot": "09:00 AM - 10:30 AM", "activity": "Deep Focus Work: Build API Schema" }
        ],
        "suggestedFocusBlocks": ["...", "..."],
        "recoveryOpportunities": ["...", "..."],
        "highRiskTasks": ["...", "..."],
        "plannerExplanation": "..."
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
      return JSON.parse(text) as DailyPlannerOutput;
    } catch (e: any) {
      console.warn("ReflectionAgent.generateDailyPlan using fallback due to API limit/error:", e?.message || e);
      return {
        todayPriorities: ["Review high-priority tasks", "Define immediate next steps", "Establish morning focus"],
        todayScheduleOutline: [
          { timeSlot: "09:00 AM - 10:30 AM", activity: "Deep Focus Session: High-impact work" },
          { timeSlot: "11:00 AM - 12:00 PM", activity: "Task breakdown and planning buffer" },
          { timeSlot: "02:00 PM - 03:30 PM", activity: "Secondary milestones and Polish" }
        ],
        suggestedFocusBlocks: [
          "9:00 AM: Lock down primary task milestone",
          "2:00 PM: Focus on clean, uninterrupted design or execution"
        ],
        recoveryOpportunities: [
          "12:00 PM: 20-minute cognitive decompression and screen-free movement",
          "4:00 PM: 10-minute deep breathing or rest block"
        ],
        highRiskTasks: [],
        plannerExplanation: "Start your morning with structured focus sessions. Restrict multi-tasking to insulate critical deadlines."
      };
    }
  }

  static async generateWeeklyReview(input: WeeklyReviewInput): Promise<WeeklyReviewOutput> {
    const ai = getAI();
    const prompt = `
      You are the "Reflection Agent" (Weekly Review Console) for DeadlineHero AI.
      Formulate a rigorous, retrospective Weekly Review based on user accomplishments and metrics.

      Completed/Pending Tasks logs:
      ${JSON.stringify(input.tasks || [])}

      Focus Session data (with distraction counts):
      ${JSON.stringify(input.focusSessions || [])}

      Performance Stats:
      - Total focus: ${input.userStats.focusHours} hours
      - Focus streak: ${input.userStats.streakDays} days
      - Completion rate: ${input.userStats.completionRate}%
      - Productivity score: ${input.userStats.productivityScore}/100

      Compile:
      1. Key "achievements": List 3-4 notable milestones completed successfully.
      2. "missedGoals": List any pending tasks with passed or highly compressed deadlines.
      3. Calculate a final Weekly Productivity Score (0-100).
      4. "improvementAreas": 2-3 specific behavioral improvements based on focus sessions and distraction rates.
      5. "nextWeekPlan": 3-4 clear actionable milestones for next week.
      6. Write a detailed "weeklySummaryMarkdown" formatting these sections beautifully with lists and encouragement.

      Return a JSON object conforming exactly to this schema:
      {
        "achievements": ["...", "..."],
        "missedGoals": ["...", "..."],
        "productivityScore": 85,
        "improvementAreas": ["...", "..."],
        "nextWeekPlan": ["...", "..."],
        "weeklySummaryMarkdown": "## Weekly Performance Report\\n\\n### Key Achievements...\\n..."
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
      return JSON.parse(text) as WeeklyReviewOutput;
    } catch (e: any) {
      console.warn("ReflectionAgent.generateWeeklyReview using fallback due to API limit/error:", e?.message || e);
      return {
        achievements: ["Maintained a consistent daily check-in cadence", "Managed critical workload priority assessments"],
        missedGoals: ["Some optional secondary milestones were postponed to reduce cognitive load"],
        productivityScore: input.userStats.productivityScore || 75,
        improvementAreas: ["Reduce late-afternoon multitasking behavior", "Incorporate structured cognitive rest breaks between sessions"],
        nextWeekPlan: ["Define clean, bounded milestone subtasks", "Pre-schedule morning focus blocks in the calendar", "Maintain sleep hygiene routines"],
        weeklySummaryMarkdown: `## Weekly Performance Report

### Key Achievements
- **Consistent Focus**: Maintained stable attention blocks during peak energy hours.
- **Priority Management**: Insulated highest-impact items from downstream deadline drift.

### Recommended Adjustments
1. **Pace Sessions**: Limit sequential focus blocks to 60 minutes to prevent late-day burnout.
2. **Buffer Zones**: Keep a 15-minute scheduled gap between major commitments for mental recovery.`
      };
    }
  }
}
