# DeadlineHero AI — Agentic AI Architecture

This document outlines the **Autonomous Multi-Agent AI Architecture** powering DeadlineHero AI. Rather than behaving as a simple reminder application, DeadlineHero AI deploys independent, specialized AI Agents that collaborate with each other and interact with a persistent Firebase database to proactively help users plan, prioritize, schedule, rescue, and stay accountable to their work.

---

## 🗺️ High-Level Agent Collaboration Flow

When a user interacts with the application, a coordinated orchestration of agents handles their request:

```
[User Goal / Voice Command] 
           │
           ▼
┌──────────────────────────────┐
│     Voice Parser Agent       │──► Standardized Task JSON
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│     Executive Planner        │──► Decomposed Subtasks & Hours
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Priority & Risk Prediction  │──► Priority Score & Risk Rating (Safe to Critical)
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│       Scheduling Agent       │──► Focus Work Blocks & Smart Breaks
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│     Daily Planner Agent      │──► Morning Routine & Priority Agenda
└──────────────────────────────┘
           │
   [Overload Detected]
           │
           ▼
┌──────────────────────────────┐
│      Rescue Mode Agent       │──► Deferrals, Reorganization, Recovery Actions
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Productivity Coach Agent    │──► Empathy chat, smallest next step, accountability nudge
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│     Burnout Monitor Agent    │──► Mental energy meter (0-100), schedule brake warnings
└──────────────────────────────┘
```

---

## 🤖 Detailed Agent Directory

### 1. AI Executive Planner Agent
* **File Location**: `/server/agents/planningAgent.ts`
* **Responsibility**: Understand user-authored goals or natural language descriptions, estimate task complexity, decompose goals into a sequence of actionable milestones, and estimate milestone durations.
* **Inputs**: Task Title, Task Description, Category, Deadline, Total Estimated Effort.
* **Outputs**: Array of subtasks (with titles, hour estimates, and dependencies), sequencing strategy explanation, estimated completion date/time, and success probability.
* **Reasoning Process**: Performs top-down structural breakdown using Gemini's semantic understanding to translate generic goals into structured, logically ordered subtasks.

### 2. Risk & Priority Prediction Agent
* **File Location**: `/server/agents/riskPredictionAgent.ts`
* **Responsibility**: Calculate priority scores, predict deadline risk levels (Safe, Moderate, High, Critical), and warn users of impending bottlenecks.
* **Inputs**: Task Title, Deadline Target, Urgency, Importance, Effort, Current Workload.
* **Outputs**: AI Priority Score (0-100), Risk Level, Success Probability, Risk Explanation, High-Risk Bottleneck areas.
* **Reasoning Process**: Evaluates remaining time vs. total subtask effort, penalizing overlapping bookings and high urgency/importance requests to compute a highly accurate priority score.

### 3. AI Scheduling Agent
* **File Location**: `/server/agents/schedulingAgent.ts`
* **Responsibility**: Map out focus slots, break intervals, and travel times within free gaps on the user's daily calendar.
* **Inputs**: Pending tasks, pre-booked meetings/personal blocks, timeline range, travel preferences.
* **Outputs**: Array of non-overlapping schedule blocks (work, breaks, meetings, travel), optimization rationale notes.
* **Reasoning Process**: Acts as a constraint satisfaction solver, packing focus sessions (45-120 mins) and rest gaps (10-15 mins) into empty time segments without clashing with existing calendar entries.

### 4. Daily Planner Agent
* **File Location**: `/server/agents/reflectionAgent.ts` (Method: `generateDailyPlan`)
* **Responsibility**: Deliver an actionable morning brief including priority goals, structured schedules, focus blocks, and potential risk callouts.
* **Inputs**: Current tasks list, calendar events, focus stats.
* **Outputs**: Top 3 Priorities, Today's Scheduled Outline, Suggested Focus Blocks, Recovery/Break Opportunities, High-Risk Tasks list.
* **Reasoning Process**: Synthesizes long-term goals and short-term schedules into an optimistic but achievable daily agenda on user load.

### 5. Deadline Rescue Agent
* **File Location**: `/server/agents/rescueAgent.ts`
* **Responsibility**: Intervene when a user falls behind, rebuilding schedules, deferring low-priority tasks, and suggesting emergency recovery tactics.
* **Inputs**: Delayed/high-risk tasks, existing schedules, user energy capacity, additional blocker context notes.
* **Outputs**: Estimated success probability under rescue conditions, deferred tasks (hold list), tactical recovery instructions, reorganized emergency schedule blocks.
* **Reasoning Process**: Executes dynamic pruning. It evaluates tasks that are non-critical and suggests postponing them to maximize bandwidth for immediate critical milestones.

### 6. Productivity & Accountability Coach Agent
* **File Location**: `/server/agents/productivityCoachAgent.ts`
* **Responsibility**: Detect distraction patterns and repeatedly postponed tasks, provide empathetic anti-procrastination coaching, suggest the absolute *smallest next step* to trigger focus, and issue direct, conversation-starting accountability check-ins.
* **Inputs**: User statistics (focus streak, score, completion rates), reported blocker details, recent conversation history, task board.
* **Outputs**: Empathy analysis message, tailored anti-procrastination tips, smallest next action, proactive accountability check-in script.
* **Reasoning Process**: Bypasses starting resistance (the amygdala threat response) by shrinking tasks down to ridiculously small micro-actions while monitoring pending deadlines for check-ins.

### 7. AI Burnout Monitor Agent
* **File Location**: `/server/agents/burnoutAgent.ts`
* **Responsibility**: Dynamically monitor user fatigue, computing a Burnout Index (0-100) and advising boundaries or schedule adjustments.
* **Inputs**: Daily focus hours, nightly sleep duration, pending workload count, daily meeting density.
* **Outputs**: Burnout Index (0-100), Status (Stable, Caution, Danger, Critical), Sleep Feedback, fatigue analysis paragraphs, customized break schedules.
* **Reasoning Process**: Combines workload volume, meeting loads, and focus sessions against sleep deficits to estimate cognitive fatigue.

---

## 🛡️ Database & Payload Security integration

All agents operate strictly server-side. Interactions between the client and agents are routed through full-stack secure API endpoints in `/server.ts` using the `@google/genai` SDK. State persistence is managed through secure real-time Firebase Firestore rules, ensuring zero sensitive key leakage to client browsers.
