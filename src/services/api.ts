import { Task, ScheduleBlock, RescuePlan, CoachTip, UserStats, FocusSession } from "../types";

export interface PlanResponse {
  subtasks: { title: string; estimatedHours: number; dependencies?: string[] }[];
  strategy: string;
  estimatedCompletionTime?: string;
  successProbability?: number;
  criticalDependencies?: string[];
}

export interface PrioritizeResponse {
  priorityScore: number;
  riskLevel: "safe" | "moderate" | "high" | "critical";
  riskExplanation: string;
  successProbability?: number;
  highRiskAreas?: string[];
  decisionReasoning?: {
    whyThisTask: string;
    whyNow: string;
    whatIfDelayed: string;
    expectedImpact: string;
    whatDataWasConsidered?: string;
    expectedBenefit?: string;
    confidenceScore?: number;
  };
  successReasoning?: string;
  remedialSuggestions?: string[];
}

export interface ScheduleResponse {
  scheduleBlocks: {
    id: string;
    taskId: string | null;
    title: string;
    startTime: string;
    endTime: string;
    type: "work" | "meeting" | "break" | "personal" | "travel";
  }[];
  optimizationNotes?: string;
}

export interface VoiceResponse {
  title: string;
  description: string;
  category: string;
  urgency: "low" | "medium" | "high";
  importance: "low" | "medium" | "high";
  effort: number;
  deadline: string;
  subtasksBreakdown: string[];
}

export interface CoachResponse {
  coachMessage: string;
  tips: {
    title: string;
    content: string;
    category: "procrastination" | "focus" | "planning" | "routine";
  }[];
  smallestNextAction?: string;
  procrastinationAnalysis?: string;
  accountabilityPrompt?: string;
}

export interface BurnoutResponse {
  burnoutIndex: number;
  burnoutStatus: "stable" | "caution" | "danger" | "critical";
  sleepFeedback: string;
  burnoutAnalysis: string;
  scheduleBreakRecommendations: string[];
}

export interface DailyPlanResponse {
  todayPriorities: string[];
  todayScheduleOutline: { timeSlot: string; activity: string }[];
  suggestedFocusBlocks: string[];
  recoveryOpportunities: string[];
  highRiskTasks: string[];
  plannerExplanation: string;
}

export interface WeeklyReviewResponse {
  achievements: string[];
  missedGoals: string[];
  productivityScore: number;
  improvementAreas: string[];
  nextWeekPlan: string[];
  weeklySummaryMarkdown: string;
}

export async function fetchTaskPlan(title: string, description: string): Promise<PlanResponse> {
  const res = await fetch("/api/gemini/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) throw new Error("Failed to fetch AI subtask breakdown");
  return res.json();
}

export async function fetchTaskPriority(
  title: string,
  deadline: string,
  urgency: "low" | "medium" | "high",
  importance: "low" | "medium" | "high",
  effort: number,
  currentSchedulesSummary: string
): Promise<PrioritizeResponse> {
  const res = await fetch("/api/gemini/prioritize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, deadline, urgency, importance, effort, currentSchedulesSummary }),
  });
  if (!res.ok) throw new Error("Failed to assess task priority");
  return res.json();
}

export async function fetchAiSchedule(
  tasks: Task[],
  currentEvents: ScheduleBlock[],
  startTime?: string,
  endTime?: string
): Promise<ScheduleResponse> {
  const res = await fetch("/api/gemini/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, currentEvents, startTime, endTime }),
  });
  if (!res.ok) throw new Error("Failed to generate intelligent schedule");
  return res.json();
}

export async function fetchRescuePlan(
  tasks: Task[],
  currentSchedules: ScheduleBlock[],
  energyLevel: "high" | "medium" | "low",
  notes: string
): Promise<RescuePlan> {
  const res = await fetch("/api/gemini/rescue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, currentSchedules, energyLevel, notes }),
  });
  if (!res.ok) throw new Error("Failed to trigger Rescue Mode");
  return res.json();
}

export async function fetchCoaching(
  userStats: UserStats,
  activeBlocker: string,
  chatHistory: { role: "user" | "model"; text: string }[],
  tasks: Task[] = []
): Promise<CoachResponse> {
  const res = await fetch("/api/gemini/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userStats, activeBlocker, chatHistory, tasks }),
  });
  if (!res.ok) throw new Error("Failed to fetch coaching insights");
  return res.json();
}

export async function fetchVoiceParsing(command: string): Promise<VoiceResponse> {
  const res = await fetch("/api/gemini/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error("Failed to parse voice command");
  return res.json();
}

// New Agent APIs
export async function fetchBurnoutIndex(
  focusHours: number,
  sleepHours: number,
  pendingTasksCount: number,
  meetingHours: number,
  weeklyProductivityScore: number
): Promise<BurnoutResponse> {
  const res = await fetch("/api/gemini/burnout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ focusHours, sleepHours, pendingTasksCount, meetingHours, weeklyProductivityScore }),
  });
  if (!res.ok) throw new Error("Failed to load burnout analysis");
  return res.json();
}

export async function fetchDailyPlan(
  tasks: Task[],
  currentEvents: ScheduleBlock[],
  userStats: UserStats
): Promise<DailyPlanResponse> {
  const res = await fetch("/api/gemini/daily-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, currentEvents, userStats }),
  });
  if (!res.ok) throw new Error("Failed to generate daily plan");
  return res.json();
}

export async function fetchWeeklyReview(
  tasks: Task[],
  focusSessions: FocusSession[],
  userStats: UserStats
): Promise<WeeklyReviewResponse> {
  const res = await fetch("/api/gemini/weekly-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, focusSessions, userStats }),
  });
  if (!res.ok) throw new Error("Failed to compile weekly review");
  return res.json();
}

export interface MeetingPrepResponse {
  planMarkdown: string;
  objectives: string[];
  suggestedQuestions: string[];
  prepSchedules: {
    title: string;
    durationHours: number;
    activity: string;
  }[];
}

export async function fetchMeetingPrep(
  meetingType: "interview" | "presentation" | "exam" | "client meeting",
  title: string,
  context: string,
  datetime: string
): Promise<MeetingPrepResponse> {
  const res = await fetch("/api/gemini/meeting-prep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetingType, title, context, datetime }),
  });
  if (!res.ok) throw new Error("Failed to fetch meeting prep plan");
  return res.json();
}

export interface OptimizedScheduleBlock {
  title: string;
  taskId: string | null;
  startTime: string;
  endTime: string;
  type: "work" | "meeting" | "break" | "personal" | "travel";
}

export interface AdaptiveOptimizeResponse {
  rebalancedTasks: {
    id: string;
    priorityScore: number;
    riskLevel: "safe" | "moderate" | "high" | "critical";
    riskExplanation: string;
  }[];
  rebalancedSchedule: OptimizedScheduleBlock[];
  optimizerExplanation: string;
}

export async function fetchAdaptiveOptimize(
  tasks: any[],
  currentSchedule: any[],
  changeContext: string
): Promise<AdaptiveOptimizeResponse> {
  const res = await fetch("/api/gemini/adaptive-optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, currentSchedule, changeContext }),
  });
  if (!res.ok) throw new Error("Failed to optimize schedule");
  return res.json();
}

export interface ActionableEmailTask {
  title: string;
  description: string;
  category: "Development" | "Design" | "Writing" | "Research" | "Other";
  urgency: "low" | "medium" | "high";
  importance: "low" | "medium" | "high";
  effort: number;
  deadline: string;
  subtasks: string[];
}

export interface EmailDigestResponse {
  summary: string;
  actionableTasks: ActionableEmailTask[];
  overallInboxUrgency: "low" | "medium" | "high";
}

export async function fetchEmailDigest(emails: { id: string; sender: string; subject: string; date: string; body: string }[]): Promise<EmailDigestResponse> {
  const res = await fetch("/api/gemini/email-digest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });
  if (!res.ok) throw new Error("Failed to process email digest");
  return res.json();
}

export interface ContextMemoryResponse {
  preferredFocusHours: string;
  completionSpeed: string;
  procrastinationPatterns: string;
  productivityHabits: string;
  personalizedAdvice: string;
  focusHourRanges: { startHour: number; endHour: number; efficiencyScore: number }[];
}

export async function fetchContextMemory(tasks: any[], focusSessions: any[]): Promise<ContextMemoryResponse> {
  const res = await fetch("/api/gemini/context-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, focusSessions }),
  });
  if (!res.ok) throw new Error("Failed to load context memory profile");
  return res.json();
}
