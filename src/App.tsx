import { useState, useEffect, useMemo } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  onSnapshot,
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  getDocs
} from "firebase/firestore";
import { Task, ScheduleBlock, FocusSession, UserStats } from "./types";

// Import Custom Views
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import TasksView from "./components/TasksView";
import ScheduleView from "./components/ScheduleView";
import RescueView from "./components/RescueView";
import FocusView from "./components/FocusView";
import CoachingView from "./components/CoachingView";
import VoiceView from "./components/VoiceView";
import ReflectionsView from "./components/ReflectionsView";

import { Flame, LogOut, Moon } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>({
    uid: "demo-user",
    email: "demo-user@mindmirror.ai",
    displayName: "Demo User",
    emailVerified: true
  } as any);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // State collections synchronized in real-time with Firestore
  const [tasks, setTasks] = useState<Task[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser({
          uid: "demo-user",
          email: "demo-user@mindmirror.ai",
          displayName: "Demo User",
          emailVerified: true
        } as any);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Firestore Synchronizer with Automatic Hackathon Seeding Heuristics
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setScheduleBlocks([]);
      setFocusSessions([]);
      return;
    }

    if (user.uid === "demo-user") {
      // Load from localStorage
      const localTasksStr = localStorage.getItem("demo-tasks");
      let localTasks: Task[] = [];
      if (localTasksStr) {
        try {
          localTasks = JSON.parse(localTasksStr);
        } catch (e) {
          console.error("Failed to parse local tasks", e);
        }
      }

      if (localTasks.length === 0) {
        // Seed default tasks
        const seed1: Task = {
          id: "seed-1",
          title: "Build DeadlineHero AI Core Features",
          description: "Implement Express full-stack backend with custom Gemini planning, risk prediction, voice and rescue agents, plus client views.",
          category: "Hackathon",
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          status: "pending",
          priorityScore: 92,
          urgency: "high",
          importance: "high",
          effort: 8.0,
          riskLevel: "high",
          riskExplanation: "Tomorrow target requires immediate timebox focus. Run Planning Agent to decompose milestones.",
          subtasks: [
            { id: "seed-sub-1", title: "Setup custom full-stack Express server", status: "completed", estimatedHours: 2 },
            { id: "seed-sub-2", title: "Write Gemini Planning & Priority endpoints", status: "pending", estimatedHours: 3 },
            { id: "seed-sub-3", title: "Implement interactive Frontend dashboard views", status: "pending", estimatedHours: 3 }
          ],
          userId: "demo-user",
          scheduleBlocks: [],
          reflection: null
        };

        const seed2: Task = {
          id: "seed-2",
          title: "Polish Responsive UI Theme & Styling",
          description: "Polish deep charcoal custom palette, glowing danger risk states, typography, and micro-interactions.",
          category: "Work",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          status: "pending",
          priorityScore: 78,
          urgency: "medium",
          importance: "high",
          effort: 4.0,
          riskLevel: "moderate",
          riskExplanation: "In 2 days target allows steady momentum. Focus blocks of 45 minutes recommended.",
          subtasks: [
            { id: "seed-sub-4", title: "Verify layout gutters & mobile margins", status: "pending", estimatedHours: 2 },
            { id: "seed-sub-5", title: "Configure glowing hover animations", status: "pending", estimatedHours: 2 }
          ],
          userId: "demo-user",
          scheduleBlocks: [],
          reflection: null
        };

        const seed3: Task = {
          id: "seed-3",
          title: "Record Video Walkthrough Pitch Submission",
          description: "Record 2-minute video pitch detailing the unique Rescue Mode agent and voice assistant command capabilities.",
          category: "Hackathon",
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          status: "pending",
          priorityScore: 85,
          urgency: "high",
          importance: "high",
          effort: 3.0,
          riskLevel: "safe",
          riskExplanation: "Buffer exists. Draft scripts on reflections panel once ready.",
          subtasks: [],
          userId: "demo-user",
          scheduleBlocks: [],
          reflection: null
        };

        const seeded = [seed1, seed2, seed3];
        localStorage.setItem("demo-tasks", JSON.stringify(seeded));
        setTasks(seeded);
      } else {
        setTasks(localTasks);
      }

      // Load schedule blocks
      const localBlocksStr = localStorage.getItem("demo-scheduleBlocks");
      if (localBlocksStr) {
        try {
          setScheduleBlocks(JSON.parse(localBlocksStr));
        } catch (e) {
          console.error(e);
        }
      }

      // Load focus sessions
      const localSessionsStr = localStorage.getItem("demo-focusSessions");
      if (localSessionsStr) {
        try {
          setFocusSessions(JSON.parse(localSessionsStr));
        } catch (e) {
          console.error(e);
        }
      }

      return;
    }

    // 1. Synchronize tasks & Seed initial high-fidelity goals if completely empty
    const unsubTasks = onSnapshot(collection(db, "users", user.uid, "tasks"), async (snapshot) => {
      if (snapshot.empty) {
        const collRef = collection(db, "users", user.uid, "tasks");
        
        const seed1: Omit<Task, "id"> = {
          title: "Build DeadlineHero AI Core Features",
          description: "Implement Express full-stack backend with custom Gemini planning, risk prediction, voice and rescue agents, plus client views.",
          category: "Hackathon",
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          createdAt: new Date().toISOString(),
          status: "pending",
          priorityScore: 92,
          urgency: "high",
          importance: "high",
          effort: 8.0,
          riskLevel: "high",
          riskExplanation: "Tomorrow target requires immediate timebox focus. Run Planning Agent to decompose milestones.",
          subtasks: [
            { id: "seed-sub-1", title: "Setup custom full-stack Express server", status: "completed", estimatedHours: 2 },
            { id: "seed-sub-2", title: "Write Gemini Planning & Priority endpoints", status: "pending", estimatedHours: 3 },
            { id: "seed-sub-3", title: "Implement interactive Frontend dashboard views", status: "pending", estimatedHours: 3 }
          ],
          userId: user.uid,
          scheduleBlocks: [],
          reflection: null
        };

        const seed2: Omit<Task, "id"> = {
          title: "Polish Responsive UI Theme & Styling",
          description: "Polish deep charcoal custom palette, glowing danger risk states, typography, and micro-interactions.",
          category: "Work",
          deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 Days
          createdAt: new Date().toISOString(),
          status: "pending",
          priorityScore: 78,
          urgency: "medium",
          importance: "high",
          effort: 4.0,
          riskLevel: "moderate",
          riskExplanation: "In 2 days target allows steady momentum. Focus blocks of 45 minutes recommended.",
          subtasks: [
            { id: "seed-sub-4", title: "Verify layout gutters & mobile margins", status: "pending", estimatedHours: 2 },
            { id: "seed-sub-5", title: "Configure glowing hover animations", status: "pending", estimatedHours: 2 }
          ],
          userId: user.uid,
          scheduleBlocks: [],
          reflection: null
        };

        const seed3: Omit<Task, "id"> = {
          title: "Record Video Walkthrough Pitch Submission",
          description: "Record 2-minute video pitch detailing the unique Rescue Mode agent and voice assistant command capabilities.",
          category: "Hackathon",
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 Days
          createdAt: new Date().toISOString(),
          status: "pending",
          priorityScore: 85,
          urgency: "high",
          importance: "high",
          effort: 3.0,
          riskLevel: "safe",
          riskExplanation: "Buffer exists. Draft scripts on reflections panel once ready.",
          subtasks: [],
          userId: user.uid,
          scheduleBlocks: [],
          reflection: null
        };

        await Promise.all([
          addDoc(collRef, seed1),
          addDoc(collRef, seed2),
          addDoc(collRef, seed3)
        ]);
      } else {
        const loadedTasks: Task[] = [];
        snapshot.forEach((doc) => {
          loadedTasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        setTasks(loadedTasks);
      }
    });

    // 2. Synchronize Schedule Blocks (Calendar timeline blocks)
    const unsubBlocks = onSnapshot(collection(db, "users", user.uid, "scheduleBlocks"), (snapshot) => {
      const loadedBlocks: ScheduleBlock[] = [];
      snapshot.forEach((doc) => {
        loadedBlocks.push({ id: doc.id, ...doc.data() } as ScheduleBlock);
      });
      setScheduleBlocks(loadedBlocks);
    });

    // 3. Synchronize Focus sessions
    const unsubSessions = onSnapshot(collection(db, "users", user.uid, "focusSessions"), (snapshot) => {
      const loadedSessions: FocusSession[] = [];
      snapshot.forEach((doc) => {
        loadedSessions.push({ id: doc.id, ...doc.data() } as FocusSession);
      });
      setFocusSessions(loadedSessions);
    });

    return () => {
      unsubTasks();
      unsubBlocks();
      unsubSessions();
    };
  }, [user]);

  // Dynamic user analytics & habits calculator
  const userStats = useMemo<UserStats>(() => {
    // 1. Focus duration (hours)
    const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + s.duration, 0);
    const focusHours = totalFocusMinutes / 60;

    // 2. Streak calculator
    const completedDays = Array.from(
      new Set(focusSessions.map((s) => s.completedAt.split("T")[0]))
    ).sort() as string[];
    
    let streakDays = 0;
    if (completedDays.length > 0) {
      streakDays = 1;
      for (let i = completedDays.length - 1; i > 0; i--) {
        const d1 = new Date(completedDays[i]);
        const d2 = new Date(completedDays[i - 1]);
        const diffDays = Math.ceil(Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          streakDays++;
        } else if (diffDays > 1) {
          break;
        }
      }
    }

    // 3. Completion rate
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 4. Productivity Score (0-100)
    const totalSidetracks = focusSessions.reduce((sum, s) => sum + s.distractionsCount, 0);
    let rawScore = Math.round(
      completionRate * 0.5 + focusHours * 6 + streakDays * 5 - totalSidetracks * 2
    );
    if (rawScore < 0) rawScore = 0;
    if (rawScore > 100) rawScore = 100;
    if (isNaN(rawScore)) rawScore = 0;

    // 5. Weekly progress trends mapping (XAxis Recharts)
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyProgress = daysOfWeek.map((dayName, idx) => {
      const targetDayIndex = idx === 6 ? 0 : idx + 1; // map Mon-Sun to Date.getDay()
      const daySessions = focusSessions.filter((s) => {
        const dateObj = new Date(s.completedAt);
        return dateObj.getDay() === targetDayIndex;
      });
      const hrs = daySessions.reduce((sum, s) => sum + s.duration, 0) / 60;

      const dayTasksCompleted = tasks.filter((t) => {
        if (t.status !== "completed" || !t.reflection) return false;
        const dateObj = new Date(t.reflection.completedAt);
        return dateObj.getDay() === targetDayIndex;
      }).length;

      return {
        day: dayName,
        hours: parseFloat(hrs.toFixed(1)),
        completed: dayTasksCompleted
      };
    });

    return {
      focusHours: focusHours || 4.5, // Seed minimal defaults to avoid blank charts
      streakDays: streakDays || 3,
      completionRate: completionRate || 33,
      productivityScore: rawScore || 72,
      weeklyProgress
    };
  }, [tasks, focusSessions]);

  // Firestore DB mutations
  const handleAddTask = async (taskData: any): Promise<string> => {
    if (!user) throw new Error("Unauthenticated write command");
    if (user.uid === "demo-user") {
      const newTask: Task = {
        id: `local-task-${Date.now()}`,
        ...taskData,
        createdAt: new Date().toISOString(),
        priorityScore: 0,
        riskLevel: "safe",
        riskExplanation: "",
        subtasks: [],
        scheduleBlocks: [],
        reflection: null,
        userId: "demo-user"
      };
      const updated = [...tasks, newTask];
      setTasks(updated);
      localStorage.setItem("demo-tasks", JSON.stringify(updated));
      return newTask.id;
    }
    const docRef = await addDoc(collection(db, "users", user.uid, "tasks"), {
      ...taskData,
      createdAt: new Date().toISOString(),
      priorityScore: 0,
      riskLevel: "safe",
      riskExplanation: "",
      subtasks: [],
      scheduleBlocks: [],
      reflection: null,
      userId: user.uid
    });
    return docRef.id;
  };

  const handleUpdateTask = async (task: Task) => {
    if (!user) return;
    if (user.uid === "demo-user") {
      const updated = tasks.map((t) => (t.id === task.id ? task : t));
      setTasks(updated);
      localStorage.setItem("demo-tasks", JSON.stringify(updated));
      return;
    }
    await setDoc(doc(db, "users", user.uid, "tasks", task.id), task);
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) return;
    if (user.uid === "demo-user") {
      const updated = tasks.filter((t) => t.id !== id);
      setTasks(updated);
      localStorage.setItem("demo-tasks", JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, "users", user.uid, "tasks", id));
  };

  const handleAddScheduleBlock = async (blockData: any): Promise<string> => {
    if (!user) throw new Error("Unauthenticated write command");
    if (user.uid === "demo-user") {
      const newBlock: ScheduleBlock = {
        id: `local-block-${Date.now()}`,
        ...blockData
      };
      const updated = [...scheduleBlocks, newBlock];
      setScheduleBlocks(updated);
      localStorage.setItem("demo-scheduleBlocks", JSON.stringify(updated));
      return newBlock.id;
    }
    const docRef = await addDoc(collection(db, "users", user.uid, "scheduleBlocks"), blockData);
    return docRef.id;
  };

  const handleDeleteScheduleBlock = async (id: string) => {
    if (!user) return;
    if (user.uid === "demo-user") {
      const updated = scheduleBlocks.filter((b) => b.id !== id);
      setScheduleBlocks(updated);
      localStorage.setItem("demo-scheduleBlocks", JSON.stringify(updated));
      return;
    }
    await deleteDoc(doc(db, "users", user.uid, "scheduleBlocks", id));
  };

  const handleSetScheduleBlocks = async (newBlocks: ScheduleBlock[]) => {
    if (!user) return;
    if (user.uid === "demo-user") {
      setScheduleBlocks(newBlocks);
      localStorage.setItem("demo-scheduleBlocks", JSON.stringify(newBlocks));
      return;
    }
    const collRef = collection(db, "users", user.uid, "scheduleBlocks");
    const snapshot = await getDocs(collRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    const writePromises = newBlocks.map((b) => addDoc(collRef, b));
    await Promise.all(writePromises);
  };

  const handleCommitRescueBlocks = async (rescueBlocks: ScheduleBlock[], deferredTaskNames: string[]) => {
    if (!user) return;
    if (user.uid === "demo-user") {
      setScheduleBlocks(rescueBlocks);
      localStorage.setItem("demo-scheduleBlocks", JSON.stringify(rescueBlocks));

      const updatedTasks = tasks.map((task) => {
        if (deferredTaskNames.includes(task.title)) {
          return {
            ...task,
            riskLevel: "safe" as const,
            priorityScore: Math.round(task.priorityScore * 0.5),
            riskExplanation: "Deferred temporarily via Emergency Rescue. Reorganizing bandwidth."
          };
        }
        return task;
      });
      setTasks(updatedTasks);
      localStorage.setItem("demo-tasks", JSON.stringify(updatedTasks));
      return;
    }

    // 1. Commit schedule reorganization (overwrites previous timeline blocks)
    await handleSetScheduleBlocks(rescueBlocks);

    // 2. Mark deferred tasks in tasks collection (we tag them as moderate/low priority and change risk)
    const updatePromises = tasks
      .filter((t) => deferredTaskNames.includes(t.title))
      .map((task) =>
        setDoc(doc(db, "users", user.uid, "tasks", task.id), {
          ...task,
          riskLevel: "safe",
          priorityScore: Math.round(task.priorityScore * 0.5),
          riskExplanation: "Deferred temporarily via Emergency Rescue. Reorganizing bandwidth."
        })
      );
    await Promise.all(updatePromises);
  };

  const handleAddFocusSession = async (sessionData: any) => {
    if (!user) return;
    if (user.uid === "demo-user") {
      const newSession: FocusSession = {
        id: `local-session-${Date.now()}`,
        ...sessionData,
        completedAt: new Date().toISOString()
      };
      const updated = [...focusSessions, newSession];
      setFocusSessions(updated);
      localStorage.setItem("demo-focusSessions", JSON.stringify(updated));
      return;
    }
    await addDoc(collection(db, "users", user.uid, "focusSessions"), {
      ...sessionData,
      completedAt: new Date().toISOString()
    });
  };

  const handleAddParsedTask = async (taskData: any) => {
    if (!user) return;
    const subtasks = taskData.subtasksBreakdown.map((item: string, idx: number) => ({
      id: `sub-parsed-${idx}`,
      title: item,
      status: "pending",
      estimatedHours: 1
    }));

    if (user.uid === "demo-user") {
      const newTask: Task = {
        id: `local-task-${Date.now()}`,
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        deadline: taskData.deadline,
        createdAt: new Date().toISOString(),
        status: "pending",
        priorityScore: 70,
        urgency: taskData.urgency,
        importance: taskData.importance,
        effort: taskData.effort,
        riskLevel: "moderate",
        riskExplanation: "Parsed naturally via Command Desk. Run Priority Agent to assess fully.",
        subtasks,
        userId: "demo-user",
        scheduleBlocks: [],
        reflection: null
      };
      const updated = [...tasks, newTask];
      setTasks(updated);
      localStorage.setItem("demo-tasks", JSON.stringify(updated));
      return;
    }

    await addDoc(collection(db, "users", user.uid, "tasks"), {
      title: taskData.title,
      description: taskData.description,
      category: taskData.category,
      deadline: taskData.deadline,
      createdAt: new Date().toISOString(),
      status: "pending",
      priorityScore: 70, // basic default to start
      urgency: taskData.urgency,
      importance: taskData.importance,
      effort: taskData.effort,
      riskLevel: "moderate",
      riskExplanation: "Parsed naturally via Command Desk. Run Priority Agent to assess fully.",
      subtasks,
      userId: user.uid,
      scheduleBlocks: [],
      reflection: null
    });
  };

  // Auth Guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090b11] text-slate-100 flex flex-col justify-center items-center font-sans">
        <span className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-4 tracking-wider font-mono">INITIALIZING CONSOLE INTERFACE...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={() => {}} />;
  }

  // Active View router
  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView
            tasks={tasks}
            userStats={userStats}
            focusSessions={focusSessions}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case "tasks":
        return (
          <TasksView
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case "scheduler":
        return (
          <ScheduleView
            tasks={tasks}
            scheduleBlocks={scheduleBlocks}
            onAddScheduleBlock={handleAddScheduleBlock}
            onDeleteScheduleBlock={handleDeleteScheduleBlock}
            onSetScheduleBlocks={handleSetScheduleBlocks}
          />
        );
      case "rescue":
        return (
          <RescueView
            tasks={tasks}
            scheduleBlocks={scheduleBlocks}
            onCommitRescueBlocks={handleCommitRescueBlocks}
          />
        );
      case "focus":
        return <FocusView tasks={tasks} onAddFocusSession={handleAddFocusSession} />;
      case "coach":
        return <CoachingView userStats={userStats} />;
      case "voice":
        return <VoiceView onAddParsedTask={handleAddParsedTask} />;
      case "reflections":
        return <ReflectionsView tasks={tasks} onUpdateTask={handleUpdateTask} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E0E0E0] flex selection:bg-rose-500/20 selection:text-white font-sans antialiased">
      {/* Drawer navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={user.email}
        focusHours={userStats.focusHours}
        streakDays={userStats.streakDays}
        productivityScore={userStats.productivityScore}
      />

      {/* Main console content canvas */}
      <main className="flex-1 min-w-0 pl-64 min-h-screen relative">
        {/* Glow ambient meshes */}
        <div className="absolute top-10 right-20 w-[400px] h-[400px] bg-rose-500/3 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-indigo-500/3 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-6xl mx-auto p-6 md:p-8 relative z-10">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
