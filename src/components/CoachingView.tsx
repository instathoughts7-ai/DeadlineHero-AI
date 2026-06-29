import { useState, useEffect } from "react";
import { UserStats, CoachTip, Task, FocusSession } from "../types";
import {
  fetchCoaching,
  fetchWeeklyReview,
  WeeklyReviewResponse,
  fetchContextMemory,
  fetchEmailDigest
} from "../services/api";
import { db, auth } from "../lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import {
  Compass,
  MessageSquare,
  Sparkles,
  Send,
  Coffee,
  Zap,
  BookOpen,
  GitCommit,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Award,
  BookMarked,
  ArrowRight,
  Brain,
  Mail
} from "lucide-react";

interface CoachingViewProps {
  userStats: UserStats;
}

export default function CoachingView({ userStats }: CoachingViewProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "tips" | "weekly">("chat");
  const [blocker, setBlocker] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

  // Chat History state
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "model"; text: string }[]>([
    {
      role: "model",
      text: "Greetings! I am your AI Productivity Coach & Procrastination Detector. I analyze your work loops, focus streaks, and cognitive sidetracks to deliver micro-steps. What is currently holding you back from crushing your deadlines today?"
    }
  ]);

  // Smallest next action state
  const [smallestNextAction, setSmallestNextAction] = useState<string>(
    "Open your project directory and create your very first index file. Just 1 line of code."
  );
  
  // Procrastination analysis text
  const [procrastinationAnalysis, setProcrastinationAnalysis] = useState<string>(
    "Paralysis usually triggers when goals are structurally opaque. Action blocks amygdala-driven threat responses."
  );

  const [coachTips, setCoachTips] = useState<CoachTip[]>([
    {
      id: "tip-1",
      title: "The 5-Minute Rule of Momentum",
      content: "When starting feels impossible, commit to working for exactly 5 minutes with zero distractions. The human brain resists transition, not the task itself. Once momentum is triggered, continuing is 80% easier.",
      category: "procrastination",
      createdAt: new Date().toISOString()
    },
    {
      id: "tip-2",
      title: "Ultradian Rhythm Focusing",
      content: "Human brains focus best in 45 to 60 minute intervals, followed by a 10-15 minute hard break (walking, breathing, coffee). Avoid stretching focus blocks to 3 hours as productivity drops off a cliff due to fatigue.",
      category: "focus",
      createdAt: new Date().toISOString()
    },
    {
      id: "tip-3",
      title: "Zero-In Workspace Setup",
      content: "Put your phone in a drawer in another room. Research shows merely seeing a phone on the desk drains cognitive resources even when face down. Keep only a single browser tab active during core work sessions.",
      category: "focus",
      createdAt: new Date().toISOString()
    },
    {
      id: "tip-4",
      title: "Decompose Until It Is Laughable",
      content: "If a task triggers procrastination, it is because it feels too large. Break it down until the first milestone is completely trivial (e.g., 'Write file name' or 'Open IDE'). Trivializing milestones bypasses the amygdala's anxiety response.",
      category: "planning",
      createdAt: new Date().toISOString()
    }
  ]);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Weekly review state
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReviewResponse | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  // AI Context Memory state
  const [contextMemory, setContextMemory] = useState<any>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);

  // Email Digest state
  const [emailsInput, setEmailsInput] = useState<string>(
    `From: jane.pm@deadlinehero.ai\nSubject: Urgent copy rewrite for the marketing page\nDate: 2026-06-28\n\nHi Team, we need to rewrite the marketing landing page copy by tomorrow morning to highlight the automated Rescue Mode and Voice Agent capabilities before our pitch. Jane.\n\n---\nFrom: william.dev@deadlinehero.ai\nSubject: Core database index optimization tasks\nDate: 2026-06-28\n\nHey guys, I noticed the query speed is dropping. We must add indexes to the user logs and the scheduleBlocks tables in Firestore to secure stable load times under peak load. Let's get this done before Friday. Best, William.`
  );
  const [emailsResult, setEmailsResult] = useState<any>(null);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [importedTaskIndexes, setImportedTaskIndexes] = useState<Record<number, boolean>>({});

  const handleFetchContextMemory = async () => {
    setLoadingMemory(true);
    try {
      const simplifiedTasks = tasks.map((t) => ({
        title: t.title,
        category: t.category,
        status: t.status,
        effort: t.effort,
        riskLevel: t.riskLevel,
        reflection: t.reflection
      }));
      const simplifiedSessions = focusSessions.map((s) => ({
        duration: s.duration,
        completedAt: s.completedAt,
        distractionsCount: s.distractionsCount,
        productivityRating: s.productivityRating
      }));
      const profile = await fetchContextMemory(simplifiedTasks, simplifiedSessions);
      setContextMemory(profile);
    } catch (err) {
      console.error("Failed to load context memory profile:", err);
    } finally {
      setLoadingMemory(false);
    }
  };

  const handleRunEmailDigest = async () => {
    setLoadingEmails(true);
    try {
      // Split raw input text into separate emails
      const lines = emailsInput.split("---");
      const emailsParsed = lines.map((block, idx) => {
        const fromMatch = block.match(/From:\s*(.+)/i);
        const subjectMatch = block.match(/Subject:\s*(.+)/i);
        const dateMatch = block.match(/Date:\s*(.+)/i);
        
        const sender = fromMatch ? fromMatch[1].trim() : "unknown@deadlinehero.ai";
        const subject = subjectMatch ? subjectMatch[1].trim() : "Project task thread";
        const date = dateMatch ? dateMatch[1].trim() : new Date().toISOString();
        
        return {
          id: `email-${idx}`,
          sender,
          subject,
          date,
          body: block.trim()
        };
      });

      const result = await fetchEmailDigest(emailsParsed);
      setEmailsResult(result);
      setImportedTaskIndexes({});
    } catch (err) {
      console.error("Failed to run email digest:", err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleImportActionableTask = async (taskData: any, idx: number) => {
    const user = auth.currentUser;
    if (!user) return;
    setImportedTaskIndexes((prev) => ({ ...prev, [idx]: true }));
    try {
      const collRef = collection(db, "users", user.uid, "tasks");
      const formattedSubtasks = (taskData.subtasks || []).map((title: string, subIdx: number) => ({
        id: `email-sub-${idx}-${subIdx}-${Date.now()}`,
        title,
        status: "pending",
        estimatedHours: Number((taskData.effort / (taskData.subtasks.length || 1)).toFixed(1))
      }));

      const newTask = {
        title: taskData.title,
        description: taskData.description,
        category: taskData.category || "Work",
        deadline: taskData.deadline,
        createdAt: new Date().toISOString(),
        status: "pending",
        priorityScore: 70,
        urgency: taskData.urgency || "medium",
        importance: taskData.importance || "medium",
        effort: taskData.effort || 2,
        riskLevel: "safe",
        riskExplanation: "Imported and prioritized automatically via the AI Email Digest Agent.",
        subtasks: formattedSubtasks,
        userId: user.uid,
        scheduleBlocks: [],
        reflection: null
      };

      await addDoc(collRef, newTask);
      // Wait a moment for UX
      setTimeout(() => {
        setImportedTaskIndexes((prev) => ({ ...prev, [idx]: false }));
        // Mark as imported by replacing with custom flag or text in UI
        alert(`Successfully imported: "${taskData.title}" into your main tasks checklist!`);
      }, 500);
    } catch (err) {
      console.error("Failed to import task:", err);
      setImportedTaskIndexes((prev) => ({ ...prev, [idx]: false }));
    }
  };

  // Load tasks & focusSessions for context
  useEffect(() => {
    async function loadData() {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const tasksSnap = await getDocs(collection(db, "users", user.uid, "tasks"));
        const tasksList = tasksSnap.docs.map(doc => doc.data() as Task);
        setTasks(tasksList);

        const focusSnap = await getDocs(collection(db, "users", user.uid, "focusSessions"));
        const focusList = focusSnap.docs.map(doc => doc.data() as FocusSession);
        setFocusSessions(focusList);
      } catch (err) {
        console.error("Failed to load context data:", err);
      }
    }
    loadData();
  }, [activeTab]);

  const preFilledBlockers = [
    "Stuck starting a massive task",
    "Feeling exhausted and sleepy",
    "Flooded by constant Slack/chat distractions",
    "Perfectionism paralysis on design phase"
  ];

  const handleSendChat = async (inputMsg?: string) => {
    const textToSend = inputMsg || blocker;
    if (!textToSend.trim()) return;

    const updatedHistory = [...chatHistory, { role: "user" as const, text: textToSend }];
    setChatHistory(updatedHistory);
    setBlocker("");
    setLoading(true);

    try {
      const response = await fetchCoaching(userStats, textToSend, updatedHistory, tasks);
      
      setChatHistory([
        ...updatedHistory,
        { role: "model" as const, text: response.coachMessage }
      ]);

      if (response.smallestNextAction) {
        setSmallestNextAction(response.smallestNextAction);
      }
      if (response.procrastinationAnalysis) {
        setProcrastinationAnalysis(response.procrastinationAnalysis);
      }

      if (response.tips && response.tips.length > 0) {
        const newTips: CoachTip[] = response.tips.map((t) => ({
          id: `ai-tip-${Math.random().toString(36).substring(2, 11)}`,
          title: t.title,
          content: t.content,
          category: t.category,
          createdAt: new Date().toISOString()
        }));
        setCoachTips((prev) => [...newTips, ...prev]);
      }
    } catch (err) {
      console.error("Coaching request failed:", err);
      setChatHistory([
        ...updatedHistory,
        { role: "model" as const, text: "I encountered an integration bottleneck, but remember: action beats preparation. Pick your smallest milestone and work for 10 minutes right now!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompileWeeklyReview = async () => {
    setLoadingWeekly(true);
    try {
      const data = await fetchWeeklyReview(tasks, focusSessions, userStats);
      setWeeklyReview(data);
    } catch (err) {
      console.error("Failed to compile weekly review:", err);
    } finally {
      setLoadingWeekly(false);
    }
  };

  const filteredTips = coachTips.filter(
    (tip) => selectedCategoryFilter === "all" || tip.category === selectedCategoryFilter
  );

  return (
    <div className="space-y-6 font-sans">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            AI Productivity Coach
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            PROCRASTINATION PSYCHOLOGY • BEHAVIOR ANALYSIS • ACTION BLUEPRINTS
          </p>
        </div>
        
        {/* Toggle tabs */}
        <div className="flex flex-wrap gap-1 bg-[#121214] rounded border border-[#242426] p-0.5 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === "chat" ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/20 font-black" : "text-gray-500 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Coach Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("tips")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === "tips" ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/20 font-black" : "text-gray-500 hover:text-white"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Strategies Library</span>
          </button>
          <button
            onClick={() => setActiveTab("weekly")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === "weekly" ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/20 font-black" : "text-gray-500 hover:text-white"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Weekly Review</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("memory");
              if (!contextMemory) handleFetchContextMemory();
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === "memory" ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/20 font-black" : "text-gray-500 hover:text-white"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>Context Memory</span>
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
              activeTab === "email" ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/20 font-black" : "text-gray-500 hover:text-white"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Digest</span>
          </button>
        </div>
      </div>

      {activeTab === "chat" ? (
        /* PRO COACH CHAT TAB WITH SIDEBARS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat pane */}
          <div className="bg-[#121214] border border-[#242426] rounded-lg flex flex-col h-[520px] justify-between lg:col-span-2 overflow-hidden relative">
            {/* Messages box */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {chatHistory.map((msg, index) => {
                const isModel = msg.role === "model";
                return (
                  <div
                    key={index}
                    className={`flex gap-3.5 max-w-[85%] ${isModel ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    <div className={`p-2 rounded h-fit border shrink-0 ${isModel ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-red-500/10 border-red-500/20 text-[#FF3B30]"}`}>
                      {isModel ? <Compass className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    </div>
                    <div className={`p-3.5 rounded text-xs leading-relaxed ${isModel ? "bg-[#1A1A1C] text-gray-300 border border-[#242426]" : "bg-[#FF3B30] text-white font-semibold"}`}>
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex gap-3 mr-auto max-w-[85%] animate-pulse">
                  <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded shrink-0">
                    <Compass className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="p-3 bg-[#1A1A1C] text-gray-400 rounded text-xs border border-[#242426] font-mono italic flex items-center gap-2">
                    <span>Coach is diagnosing distraction loops & drafting micro-steps...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input form */}
            <div className="p-4 border-t border-[#242426] bg-[#1A1A1C] flex gap-2 items-center">
              <input
                type="text"
                placeholder="Type your current struggle or focus blocker..."
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) handleSendChat();
                }}
                className="flex-1 bg-[#121214] border border-[#242426] rounded py-2 px-4 text-xs text-white placeholder-[#555] focus:outline-none"
                disabled={loading}
              />
              <button
                onClick={() => handleSendChat()}
                disabled={loading || !blocker.trim()}
                className="p-2.5 bg-[#FF3B30] text-white rounded transition-all cursor-pointer hover:brightness-110 disabled:opacity-45 disabled:hover:brightness-100"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Right Sidebar Widgets */}
          <div className="space-y-4">
            {/* Widget 1: Smallest Next Action (Paralysis Safeguard) */}
            <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
              <h3 className="text-xs font-bold text-[#FF3B30] uppercase font-mono tracking-widest flex items-center gap-2">
                <Zap className="h-4 w-4 animate-bounce" />
                Immediate Micro-Step
              </h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                Paralysis Safeguard (Amygdala override)
              </p>
              <div className="p-3 bg-[#1A1A1C] border border-[#242426] rounded text-xs text-slate-300 font-medium leading-relaxed">
                "{smallestNextAction}"
              </div>
            </div>

            {/* Widget 2: Procrastination Behavioral Profile */}
            <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase font-mono tracking-widest flex items-center gap-2">
                <Compass className="h-4 w-4" />
                Behavioral Analysis
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                {procrastinationAnalysis}
              </p>
            </div>

            {/* Preset Consultants */}
            <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                Quick Consult Presets
              </h3>
              <div className="space-y-2">
                {preFilledBlockers.map((blk, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(`Help me. I am currently: ${blk}`)}
                    disabled={loading}
                    className="w-full text-left p-2.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] rounded transition-colors cursor-pointer text-[11px] font-medium text-gray-300 flex items-center justify-between"
                  >
                    <span className="truncate">{blk}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-600 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "tips" ? (
        /* STRATEGY HABITS LIBRARY TAB */
        <div className="space-y-5">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All Strategies" },
              { id: "procrastination", label: "Procrastination Therapy" },
              { id: "focus", label: "Focus Techniques" },
              { id: "planning", label: "Smarter Planning" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer border shrink-0 ${
                  selectedCategoryFilter === cat.id
                    ? "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/25 font-bold"
                    : "bg-[#1A1A1C] text-gray-400 border-[#242426] hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTips.map((tip) => (
              <div
                key={tip.id}
                className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-3 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-0 left-0 w-1 bg-rose-500 h-full" />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                      {tip.category}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 font-bold">
                      {new Date(tip.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white">{tip.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{tip.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === "weekly" ? (
        /* 🏆 WEEKLY REFLECTION REVIEW TAB */
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/3 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Weekly Reflection Laboratory
                </h2>
                <p className="text-[9px] text-[#555] font-mono uppercase tracking-widest mt-0.5">
                  Achievements, Missed goals, and Cognitive Improvement roadmap
                </p>
              </div>
            </div>

            <button
              onClick={handleCompileWeeklyReview}
              disabled={loadingWeekly}
              className="px-4 py-1.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-indigo-400 hover:text-white font-mono text-[10px] font-bold rounded uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              {loadingWeekly ? (
                <span className="w-3.5 h-3.5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              )}
              <span>COMPILE RETROSPECTIVE REVIEW</span>
            </button>
          </div>

          {loadingWeekly ? (
            <div className="py-16 text-center space-y-3">
              <span className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin inline-block" />
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                Analyzing completed task backlogs, focus streaks, and cognitive blockers...
              </p>
            </div>
          ) : weeklyReview ? (
            <div className="mt-6 space-y-6 animate-fade-in">
              {/* Main Score Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-indigo-400 uppercase font-black">WEEKLY PRODUCTIVITY RATING</span>
                    <h3 className="text-2xl font-black text-white mt-1">{weeklyReview.productivityScore}%</h3>
                  </div>
                  <div className="p-3 bg-indigo-500/10 rounded text-indigo-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-rose-500 uppercase font-black">ACHIEVED MILESTONES COUNT</span>
                    <h3 className="text-2xl font-black text-white mt-1">{weeklyReview.achievements.length} Completed</h3>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded text-rose-400">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Achievements & Missed Milestones list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    Key Accomplishments
                  </h4>
                  <ul className="space-y-2">
                    {weeklyReview.achievements.map((item, idx) => (
                      <li key={idx} className="p-2.5 bg-[#1A1A1C] border border-[#242426] rounded text-xs text-gray-300">
                        {item}
                      </li>
                    ))}
                    {weeklyReview.achievements.length === 0 && (
                      <p className="text-xs text-gray-500 italic">No achievements logged this session.</p>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Missed Goals / Remaining Risks
                  </h4>
                  <ul className="space-y-2">
                    {weeklyReview.missedGoals.map((item, idx) => (
                      <li key={idx} className="p-2.5 bg-[#1A1A1C] border border-[#242426] rounded text-xs text-gray-300">
                        {item}
                      </li>
                    ))}
                    {weeklyReview.missedGoals.length === 0 && (
                      <p className="text-xs text-emerald-500 italic font-mono uppercase font-bold">Zero missed milestones! Perfect run.</p>
                    )}
                  </ul>
                </div>
              </div>

              {/* Action Plan & Improvement areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="h-4 w-4" />
                    Target Behavioral Improvements
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-400 list-disc list-inside bg-[#1A1A1C] border border-[#242426] p-3.5 rounded-lg leading-relaxed">
                    {weeklyReview.improvementAreas.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    Strategic Plan for Next Week
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-400 list-disc list-inside bg-[#1A1A1C] border border-[#242426] p-3.5 rounded-lg leading-relaxed">
                    {weeklyReview.nextWeekPlan.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Markdown summary report block */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookMarked className="h-4 w-4" />
                  Detailed Cognitive Retrospective
                </h4>
                <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg text-xs text-gray-300 font-sans leading-relaxed whitespace-pre-line">
                  {weeklyReview.weeklySummaryMarkdown}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs font-sans">
              No retrospective review compiled. Click the button above to analyze your performance logs.
            </div>
          )}
        </div>
      ) : activeTab === "memory" ? (
        /* 🧠 COGNITIVE CONTEXT MEMORY VIEW */
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/3 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Cognitive Context Memory Profile
                </h2>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">
                  Adaptive behavioral tracing • Procrastination indexing • Custom scheduler weights
                </p>
              </div>
            </div>

            <button
              onClick={handleFetchContextMemory}
              disabled={loadingMemory}
              className="px-4 py-1.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-rose-400 hover:text-white font-mono text-[10px] font-bold rounded uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              {loadingMemory ? (
                <span className="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              )}
              <span>UPDATE MEMORY DIAGNOSTICS</span>
            </button>
          </div>

          {loadingMemory ? (
            <div className="py-16 text-center space-y-3">
              <span className="w-8 h-8 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin inline-block" />
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                Rebuilding profile memory, tracing focus sessions, and evaluating velocity patterns...
              </p>
            </div>
          ) : contextMemory ? (
            <div className="mt-6 space-y-6 font-sans text-xs">
              {/* Four pillars grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                    Preferred Focus Hours:
                  </span>
                  <p className="text-gray-300 leading-relaxed font-sans">{contextMemory.preferredFocusHours}</p>
                </div>

                <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                    Real Work Completion Velocity:
                  </span>
                  <p className="text-gray-300 leading-relaxed font-sans">{contextMemory.completionSpeed}</p>
                </div>

                <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                    Procrastination Trigger Patterns:
                  </span>
                  <p className="text-gray-300 leading-relaxed font-sans">{contextMemory.procrastinationPatterns}</p>
                </div>

                <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                    Ideal Working/Focus Habits:
                  </span>
                  <p className="text-gray-300 leading-relaxed font-sans">{contextMemory.productivityHabits}</p>
                </div>
              </div>

              {/* Personalized Advice */}
              <div className="p-4 bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-[#FF3B30] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-[#FF3B30] uppercase tracking-wider">
                    Personalized Adaptive Recommendation:
                  </span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed font-sans">{contextMemory.personalizedAdvice}</p>
              </div>

              {/* Efficiency chart ranges */}
              {contextMemory.focusHourRanges && contextMemory.focusHourRanges.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">
                    Calculated Focus Efficiency Ranges:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {contextMemory.focusHourRanges.map((range: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[#1A1A1C] border border-[#242426] rounded-lg text-center space-y-1">
                        <span className="font-mono text-xs text-gray-400 block font-bold">
                          {String(range.startHour).padStart(2, "0")}:00 - {String(range.endHour).padStart(2, "0")}:00
                        </span>
                        <div className="text-lg font-mono font-black text-rose-500">
                          {range.efficiencyScore}%
                        </div>
                        <span className="text-[8px] text-gray-500 font-mono uppercase tracking-wider block">
                          Efficiency Rating
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs font-sans">
              No Context Memory profile loaded. Click the button above to let Google Gemini trace your cognitive logs.
            </div>
          )}
        </div>
      ) : (
        /* 📬 EMAIL ACTION DIGEST TAB */
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/3 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Actionable Email Digest Desk
                </h2>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">
                  Trace thread commitments • Extract structured tasks • Sync to core checklist
                </p>
              </div>
            </div>

            <button
              onClick={handleRunEmailDigest}
              disabled={loadingEmails}
              className="px-4 py-1.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-blue-400 hover:text-white font-mono text-[10px] font-bold rounded uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            >
              {loadingEmails ? (
                <span className="w-3.5 h-3.5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              )}
              <span>COMPILE INBOX DIGEST</span>
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input thread */}
            <div className="space-y-2 lg:col-span-1">
              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">
                Incoming Email Streams:
              </span>
              <textarea
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                className="w-full h-80 bg-[#1A1A1C] border border-[#242426] rounded-lg p-4 text-xs text-gray-300 font-sans focus:outline-none focus:border-blue-500/50 resize-none leading-relaxed"
                placeholder="Paste email threads here separated by ---..."
              />
              <span className="text-[9px] text-gray-600 font-mono leading-tight block">
                * Paste raw threads. Gemini automatically resolves relative deadlines (e.g. 'by Friday') and rates impact values.
              </span>
            </div>

            {/* Digest result pane */}
            <div className="lg:col-span-2 space-y-4">
              {loadingEmails ? (
                <div className="h-80 border border-[#242426] bg-[#1A1A1C]/30 rounded-lg flex flex-col justify-center items-center space-y-3">
                  <span className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-xs font-mono text-gray-400 uppercase tracking-wider animate-pulse">
                    Parsing email commits & mapping priority nodes...
                  </span>
                </div>
              ) : emailsResult ? (
                <div className="space-y-4">
                  {/* Summary card */}
                  <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-1.5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-rose-500/10 text-rose-400 font-mono text-[9px] uppercase font-bold tracking-wider rounded-bl border-l border-b border-[#242426]">
                      {emailsResult.overallInboxUrgency} urgency index
                    </div>
                    <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                      Executive Actions Overview:
                    </span>
                    <p className="text-xs text-gray-300 font-sans leading-relaxed">{emailsResult.summary}</p>
                  </div>

                  {/* Task list card */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">
                      Extracted Goal Candidates:
                    </span>

                    {emailsResult.actionableTasks && emailsResult.actionableTasks.length > 0 ? (
                      emailsResult.actionableTasks.map((t: any, idx: number) => (
                        <div key={idx} className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-3 relative">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-blue-500/10 text-blue-400 rounded uppercase tracking-wider">
                                {t.category}
                              </span>
                              <h4 className="text-xs font-bold text-white mt-1 font-sans">{t.title}</h4>
                              <p className="text-[10px] text-gray-500 mt-0.5 font-sans leading-relaxed">{t.description}</p>
                            </div>
                            <button
                              onClick={() => handleImportActionableTask(t, idx)}
                              disabled={importedTaskIndexes[idx]}
                              className="px-3 py-1.5 bg-[#FF3B30] hover:brightness-110 disabled:opacity-50 text-white font-mono text-[10px] uppercase font-black tracking-wider rounded transition-all cursor-pointer shrink-0"
                            >
                              {importedTaskIndexes[idx] ? (
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                              ) : (
                                "Import Goal"
                              )}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#242426]/60 text-[10px] font-mono">
                            <div>
                              <span className="text-gray-500">Urgency:</span>{" "}
                              <span className="text-amber-400 uppercase font-bold">{t.urgency}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Importance:</span>{" "}
                              <span className="text-indigo-400 uppercase font-bold">{t.importance}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Effort:</span>{" "}
                              <span className="text-gray-300 font-bold">{t.effort} hours</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Deadline:</span>{" "}
                              <span className="text-emerald-400 font-bold">
                                {new Date(t.deadline).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {t.subtasks && t.subtasks.length > 0 && (
                            <div className="bg-[#121214] p-2 border border-[#242426] rounded">
                              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block font-bold mb-1">
                                Generated Checklist Milestones:
                              </span>
                              <ul className="list-disc list-inside text-[10px] text-gray-400 space-y-0.5 font-sans">
                                {t.subtasks.map((sub: string, subIdx: number) => (
                                  <li key={subIdx}>{sub}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-slate-500 text-xs font-sans">
                        No tasks extracted. Adjust your email thread context.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-80 border border-[#242426]/60 border-dashed rounded-lg flex flex-col justify-center items-center text-slate-500 text-xs font-sans">
                  No active digest compilation. Paste some email streams in the left input box and compile!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
