# DeadlineHero AI 🚀
### *The AI Productivity Companion That Doesn't Just Remind You — It Helps You Finish.*

---

## 🎖️ Hackathon Entry Pitch

**DeadlineHero AI** is a fully functional, production-ready full-stack productivity engine designed to secure #1 position in hackathons. Built using React, Node.js Express, Tailwind CSS, Google Firebase, and the Google GenAI SDK (Gemini 2.5), it delivers **agentic productivity management** that proactively safeguards deadlines, mitigates procrastination leaks, and guides focus loops.

Unlike static calendars or reminder notifications that merely add stress by telling you a task is due, **DeadlineHero AI acts as an active Executive Chief-of-Staff.** It calculates real-time deadline risks, splits large objectives into discrete milestones, organizes daily agendas around pre-booked meetings, and deploys **Emergency Rescue Mode** to re-sequence calendars and defer low-impact tasks when overload is detected.

---

## ⚡ Key AI Agents Architecture

DeadlineHero AI leverages six autonomous cognitive agents powered by the high-speed reasoning capabilities of **Google Gemini**:

1. **Planning Agent**: Parses core task goals and decomposes them into highly granular, sequential subtask checklists with estimated decimal hours and tailored sequencing strategies.
2. **Priority & Risk Agent**: Assesses relative urgencies and importance, correlating remaining hours against existing calendar workload to output a precise **AI Priority Score (0-100)** and a predictive **Deadline Risk Status** (Safe, Moderate, High, Critical).
3. **Scheduling Agent**: Analyzes active, unmapped milestones and pre-existing commitments (meetings or personal bookings) to build optimized focus blocks and break periods within specified time-slots.
4. **Deadline Rescue Agent**: Our flagship emergency feature. Triggered under severe overload, it calculates completion success probabilities (%), flags low-impact tasks to defer, recommends tactical recovery maneuvers, and creates an emergency timeline realignment.
5. **Productivity Coach**: Combines behavioral statistics, completion rates, and user-reported blockers (such as fatigue or paralysis) to provide supportive, highly tailored cognitive behavioral interventions.
6. **Voice Assistant**: Parses complex, dictated, or typed natural language commands into structured task models, milestones, and dates, enabling hands-free task ingestion.

---

## 📁 Technical Architecture & Schema

### Tech Stack
*   **Front-end**: React 19, TypeScript, Tailwind CSS v4 (incorporating `@tailwindcss/vite` and dynamic `@theme` variables), Recharts, Lucide Icons.
*   **Back-end**: Node.js, Express, tsx, esbuild bundling.
*   **Persistence & Sync**: Google Firebase (Firestore Database, Firebase Authentication).
*   **AI Reasoning**: Google GenAI SDK (`@google/genai` utilizing `gemini-2.5-flash`).

### Cloud Firestore Schema Blueprint
*   `users/{userId}/tasks/{taskId}`:
    *   `title` (string)
    *   `description` (string)
    *   `deadline` (ISO-8601 string)
    *   `createdAt` (ISO-8601 string)
    *   `category` (string: Work, Personal, Hackathon, Study, Health)
    *   `status` (string: pending, completed)
    *   `priorityScore` (number: 0-100)
    *   `riskLevel` (string: safe, moderate, high, critical)
    *   `riskExplanation` (string)
    *   `effort` (number)
    *   `subtasks` (array of subtask maps: `id`, `title`, `status`, `estimatedHours`)
    *   `reflection` (map: `wins`, `blockers`, `improvements`, `completedAt` or null)
*   `users/{userId}/scheduleBlocks/{blockId}`:
    *   `taskId` (string or null)
    *   `title` (string)
    *   `startTime` (ISO-8601 string)
    *   `endTime` (ISO-8601 string)
    *   `type` (string: work, meeting, break, personal)
*   `users/{userId}/focusSessions/{sessionId}`:
    *   `taskId` (string or null)
    *   `duration` (number of minutes)
    *   `completedAt` (ISO-8601 string)
    *   `distractionsCount` (number)
    *   `productivityRating` (number: 1-5)

---

## 🛠️ Security & Quality Design

*   **Secure API Proxy**: All Gemini AI interactions are routed through Express back-end endpoints to protect `GEMINI_API_KEY` from client exposure.
*   **Data Isolation**: Configured secure Firebase Firestore namespaces ensuring every authenticated user operates within their own isolated data sandbox.
*   **Fallback Seeding**: For instant evaluation, logging into the application (via secure Email-Password or one-click Anonymous Demo Sandbox) automatically seeds three high-fidelity hackathon tasks to populate the metrics dashboard and calendar, bypassing dry empty states.
*   **Responsive Ergonomics**: Fluid mobile-first layouts designed for both touch and hover environments with elegant typography pairs ("Inter" and "Space Grotesk").

---

## 🚀 Step-by-Step Setup & Development

1.  **Start Development Server**:
    The dev server is pre-configured to run full-stack using Vite middleware:
    ```bash
    npm run dev
    ```
2.  **Environment Variables**:
    Define credentials in `.env` (automatically loaded by `dotenv` inside `server.ts`):
    ```env
    GEMINI_API_KEY="YOUR_KEY"
    APP_URL="YOUR_HOST"
    ```
3.  **Compile & Build**:
    Performs production-grade client compiling and bundles our Express server as a single standalone CommonJS script under `dist/server.cjs` using `esbuild`:
    ```bash
    npm run build
    ```
4.  **Production Standalone Start**:
    ```bash
    npm run start
    ```
