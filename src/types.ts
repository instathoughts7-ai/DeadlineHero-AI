export interface Subtask {
  id: string;
  title: string;
  status: "pending" | "completed";
  estimatedHours: number;
}

export interface ScheduleBlock {
  id: string;
  taskId: string | null;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  type: "work" | "meeting" | "break" | "personal" | "travel";
}

export interface Reflection {
  wins: string;
  blockers: string;
  improvements: string;
  completedAt: string; // ISO string
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO string
  createdAt: string; // ISO string
  category: string;
  status: "pending" | "completed";
  priorityScore: number; // 0-100
  urgency: "low" | "medium" | "high";
  importance: "low" | "medium" | "high";
  effort: number; // estimated hours
  riskLevel: "safe" | "moderate" | "high" | "critical";
  riskExplanation: string;
  subtasks: Subtask[];
  userId: string;
  scheduleBlocks: ScheduleBlock[];
  reflection: Reflection | null;
  decisionReasoning?: {
    whyThisTask: string;
    whyNow: string;
    whatIfDelayed: string;
    expectedImpact: string;
    whatDataWasConsidered?: string;
    expectedBenefit?: string;
    confidenceScore?: number;
  };
  successProbability?: number;
  successReasoning?: string;
  remedialSuggestions?: string[];
  meetingPrep?: {
    objectives: string[];
    suggestedQuestions: string[];
    planMarkdown: string;
    prepSchedules: {
      title: string;
      durationHours: number;
      activity: string;
    }[];
  };
}

export interface FocusSession {
  id: string;
  taskId: string | null;
  duration: number; // in minutes
  completedAt: string; // ISO string
  distractionsCount: number;
  productivityRating: number; // 1-5
}

export interface CoachTip {
  id: string;
  title: string;
  content: string;
  category: "procrastination" | "focus" | "planning" | "routine";
  createdAt: string;
}

export interface RescuePlan {
  id: string;
  createdAt: string;
  originalRiskLevel: "safe" | "moderate" | "high" | "critical";
  estimatedSuccessProbability: number; // 0-100
  recoveryActions: string[];
  reorganizedBlocks: ScheduleBlock[];
  deferredTasks: string[]; // task titles to postpone
}

export interface UserStats {
  focusHours: number;
  streakDays: number;
  completionRate: number;
  productivityScore: number;
  weeklyProgress: { day: string; hours: number; completed: number }[];
}
