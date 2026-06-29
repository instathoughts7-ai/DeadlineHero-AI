import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getAI } from "./server/ai";

// Import Agents
import { PlanningAgent } from "./server/agents/planningAgent";
import { RiskPredictionAgent } from "./server/agents/riskPredictionAgent";
import { SchedulingAgent } from "./server/agents/schedulingAgent";
import { RescueAgent } from "./server/agents/rescueAgent";
import { ProductivityCoachAgent } from "./server/agents/productivityCoachAgent";
import { BurnoutAgent } from "./server/agents/burnoutAgent";
import { ReflectionAgent } from "./server/agents/reflectionAgent";

// Import New Hackathon Agent Subsystems
import { MeetingPrepAgent } from "./server/agents/meetingPrepAgent";
import { DecisionEngineAgent } from "./server/agents/decisionEngineAgent";
import { SuccessProbabilityEngine } from "./server/agents/successProbabilityEngine";
import { ContextMemoryAgent } from "./server/agents/contextMemoryAgent";
import { EmailDigestAgent } from "./server/agents/emailDigestAgent";
import { AdaptiveGoalOptimizer } from "./server/agents/adaptiveGoalOptimizer";

const app = express();
const PORT = 3000;

app.use(express.json());

// ----------------------------------------------------
// GLOBAL IN-MEMORY CACHE FOR GEMINI API CALLS
// Prevents rapid repetitive quota exhaustion under heavy testing
// ----------------------------------------------------
const apiCache = new Map<string, { data: any; expiry: number }>();

function cacheMiddleware(durationMinutes = 15) {
  return (req: any, res: any, next: any) => {
    if (req.method !== "POST" || !req.path.startsWith("/api/gemini")) {
      return next();
    }
    
    // Sort keys of req.body to have a deterministic cache key
    const sortedBody = Object.keys(req.body || {})
      .sort()
      .reduce((acc: any, k) => {
        acc[k] = req.body[k];
        return acc;
      }, {});
      
    const key = `${req.path}_${JSON.stringify(sortedBody)}`;
    const cached = apiCache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      console.log(`[Cache Hit] Serving cached response for ${req.path}`);
      return res.json(cached.data);
    }
    
    const originalJson = res.json;
    res.json = function (body: any) {
      if (res.statusCode === 200 && body && !body.error) {
        apiCache.set(key, {
          data: body,
          expiry: Date.now() + durationMinutes * 60 * 1000,
        });
      }
      return originalJson.call(this, body);
    };
    
    next();
  };
}

app.use(cacheMiddleware(15));

// ----------------------------------------------------
// AI AGENT 1: PLANNING AGENT
// ----------------------------------------------------
app.post("/api/gemini/plan", async (req, res) => {
  try {
    const { title, description, category, deadline, effort } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const plan = await PlanningAgent.execute({
      title,
      description,
      category,
      deadline: deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      effort: effort || 2.0,
    });
    res.json(plan);
  } catch (error: any) {
    console.error("Planning Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to generate plan" });
  }
});

// ----------------------------------------------------
// AI AGENT 2: PRIORITY & RISK AGENT
// ----------------------------------------------------
app.post("/api/gemini/prioritize", async (req, res) => {
  try {
    const { title, deadline, urgency, importance, effort, currentSchedulesSummary } = req.body;
    if (!title || !deadline) {
      return res.status(400).json({ error: "Title and Deadline are required" });
    }

    const assessment = await RiskPredictionAgent.execute({
      title,
      deadline,
      urgency: urgency || "medium",
      importance: importance || "medium",
      effort: effort || 2.0,
      currentWorkloadSummary: currentSchedulesSummary,
    });
    res.json(assessment);
  } catch (error: any) {
    console.error("Priority Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to prioritize task" });
  }
});

// ----------------------------------------------------
// AI AGENT 3: SCHEDULING AGENT
// ----------------------------------------------------
app.post("/api/gemini/schedule", async (req, res) => {
  try {
    const { tasks, currentEvents, startTime, endTime, travelConstraints, focusPreferences } = req.body;

    const schedule = await SchedulingAgent.execute({
      tasks,
      currentEvents,
      startTime,
      endTime,
      travelConstraints,
      focusPreferences,
    });
    res.json(schedule);
  } catch (error: any) {
    console.error("Scheduling Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to schedule" });
  }
});

// ----------------------------------------------------
// AI AGENT 4: DEADLINE RESCUE AGENT
// ----------------------------------------------------
app.post("/api/gemini/rescue", async (req, res) => {
  try {
    const { tasks, currentSchedules, energyLevel, notes } = req.body;

    const plan = await RescueAgent.execute({
      tasks,
      currentSchedules,
      energyLevel: energyLevel || "medium",
      notes,
    });
    res.json(plan);
  } catch (error: any) {
    console.error("Rescue Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to trigger Rescue Mode" });
  }
});

// ----------------------------------------------------
// AI AGENT 5: PRODUCTIVITY COACH
// ----------------------------------------------------
app.post("/api/gemini/coach", async (req, res) => {
  try {
    const { userStats, tasks, activeBlocker, chatHistory } = req.body;

    const response = await ProductivityCoachAgent.execute({
      userStats: userStats || { focusHours: 0, streakDays: 0, completionRate: 0, productivityScore: 50 },
      tasks: tasks || [],
      activeBlocker,
      chatHistory: chatHistory || [],
    });
    res.json(response);
  } catch (error: any) {
    console.error("Coach Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to load coaching insights" });
  }
});

// ----------------------------------------------------
// AI AGENT 6: NATURAL LANGUAGE VOICE / TEXT PARSER
// ----------------------------------------------------
app.post("/api/gemini/voice", async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: "Command text is required" });
    }

    const ai = getAI();
    const prompt = `
      You are the "Voice Assistant Agent" for DeadlineHero AI.
      Your job is to parse a natural language command (either typed or dictated via microphone) and extract structured task attributes, subtasks, and schedule recommendations.

      User Input Command: "${command}"
      Current Time Context: ${new Date().toISOString()} (Use this to calculate relative deadlines like 'tomorrow', 'Friday', 'next week')

      Extract the following parameters carefully:
      - title: A clean, concise title for the primary task
      - description: Any context or notes given in the command
      - category: A category like "Work", "Personal", "Hackathon", "Study", or "Health"
      - urgency: "low" | "medium" | "high" (infer from words like 'immediately', 'critical', 'not super urgent')
      - importance: "low" | "medium" | "high" (infer from text context)
      - effort: A realistic decimal number of hours to complete this task (infer from text, or estimate if not mentioned, default to 2.0)
      - deadline: A calculated ISO string representation of the target date/time. (e.g. if today is Sunday, and they say "by Friday", calculate Friday's date)
      - subtasksBreakdown: An array of 3-5 subtask titles that would logically make up this task.

      Return a JSON object matching this structure:
      {
        "title": "...",
        "description": "...",
        "category": "Work",
        "urgency": "medium",
        "importance": "medium",
        "effort": 2.0,
        "deadline": "ISO String",
        "subtasksBreakdown": ["...", "..."]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Voice Parser Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to parse natural language" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 7: BURNOUT MONITOR
// ----------------------------------------------------
app.post("/api/gemini/burnout", async (req, res) => {
  try {
    const { focusHours, sleepHours, pendingTasksCount, meetingHours, weeklyProductivityScore } = req.body;
    const response = await BurnoutAgent.execute({
      focusHours: focusHours || 4.5,
      sleepHours: sleepHours || 7.0,
      pendingTasksCount: pendingTasksCount || 0,
      meetingHours: meetingHours || 2.0,
      weeklyProductivityScore: weeklyProductivityScore || 70,
    });
    res.json(response);
  } catch (error: any) {
    console.error("Burnout Monitor Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to compute burnout index" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 8: DAILY PLANNER
// ----------------------------------------------------
app.post("/api/gemini/daily-plan", async (req, res) => {
  try {
    const { tasks, currentEvents, userStats } = req.body;
    const response = await ReflectionAgent.generateDailyPlan({
      tasks: tasks || [],
      currentEvents: currentEvents || [],
      userStats: userStats || { focusHours: 0, streakDays: 0, completionRate: 0, productivityScore: 50 },
    });
    res.json(response);
  } catch (error: any) {
    console.error("Daily Planner Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to generate daily plan" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 9: WEEKLY REVIEW
// ----------------------------------------------------
app.post("/api/gemini/weekly-review", async (req, res) => {
  try {
    const { tasks, focusSessions, userStats } = req.body;
    const response = await ReflectionAgent.generateWeeklyReview({
      tasks: tasks || [],
      focusSessions: focusSessions || [],
      userStats: userStats || { focusHours: 0, streakDays: 0, completionRate: 0, productivityScore: 50 },
    });
    res.json(response);
  } catch (error: any) {
    console.error("Weekly Review Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to generate weekly review" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 10: MEETING PREPARATION AGENT
// ----------------------------------------------------
app.post("/api/gemini/meeting-prep", async (req, res) => {
  try {
    const { meetingType, title, context, datetime } = req.body;
    if (!meetingType || !title || !datetime) {
      return res.status(400).json({ error: "meetingType, title, and datetime are required" });
    }
    const response = await MeetingPrepAgent.execute({ meetingType, title, context, datetime });
    res.json(response);
  } catch (error: any) {
    console.error("Meeting Prep Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to generate meeting prep plan" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 11: DECISION ENGINE
// ----------------------------------------------------
app.post("/api/gemini/decision", async (req, res) => {
  try {
    const { title, description, deadline, urgency, importance, effort } = req.body;
    if (!title || !deadline) {
      return res.status(400).json({ error: "title and deadline are required" });
    }
    const response = await DecisionEngineAgent.execute({ title, description, deadline, urgency, importance, effort });
    res.json(response);
  } catch (error: any) {
    console.error("Decision Engine error:", error);
    res.status(500).json({ error: error.message || "Failed to run Decision Engine" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 12: SUCCESS PROBABILITY ENGINE
// ----------------------------------------------------
app.post("/api/gemini/success-probability", async (req, res) => {
  try {
    const { title, deadline, effort, completedSubtasksCount, totalSubtasksCount, userStats } = req.body;
    if (!title || !deadline) {
      return res.status(400).json({ error: "title and deadline are required" });
    }
    const response = await SuccessProbabilityEngine.execute({ title, deadline, effort, completedSubtasksCount, totalSubtasksCount, userStats });
    res.json(response);
  } catch (error: any) {
    console.error("Success Probability Engine error:", error);
    res.status(500).json({ error: error.message || "Failed to run Success Probability Engine" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 13: CONTEXT MEMORY AGENT
// ----------------------------------------------------
app.post("/api/gemini/context-memory", async (req, res) => {
  try {
    const { tasks, focusSessions } = req.body;
    const response = await ContextMemoryAgent.execute({ tasks: tasks || [], focusSessions: focusSessions || [] });
    res.json(response);
  } catch (error: any) {
    console.error("Context Memory Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to run Context Memory analysis" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 14: EMAIL DIGEST AGENT
// ----------------------------------------------------
app.post("/api/gemini/email-digest", async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: "emails array is required" });
    }
    const response = await EmailDigestAgent.execute(emails);
    res.json(response);
  } catch (error: any) {
    console.error("Email Digest Agent error:", error);
    res.status(500).json({ error: error.message || "Failed to compile Email Digest" });
  }
});

// ----------------------------------------------------
// NEW AI AGENT 15: ADAPTIVE GOAL OPTIMIZER
// ----------------------------------------------------
app.post("/api/gemini/adaptive-optimize", async (req, res) => {
  try {
    const { tasks, currentSchedule, changeContext } = req.body;
    if (!tasks || !currentSchedule || !changeContext) {
      return res.status(400).json({ error: "tasks, currentSchedule, and changeContext are required" });
    }
    const response = await AdaptiveGoalOptimizer.execute({ tasks, currentSchedule, changeContext });
    res.json(response);
  } catch (error: any) {
    console.error("Adaptive Goal Optimizer error:", error);
    res.status(500).json({ error: error.message || "Failed to optimize goals" });
  }
});

// ----------------------------------------------------
// VITE DEV SERVER / STATIC SERVING
// ----------------------------------------------------
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DeadlineHero AI Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
