import { useState, useEffect } from "react";
import { Task, UserStats, FocusSession, ScheduleBlock } from "../types";
import {
  fetchDailyPlan,
  fetchBurnoutIndex,
  DailyPlanResponse,
  BurnoutResponse
} from "../services/api";
import { db, auth } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  ShieldCheck,
  AlertOctagon,
  Clock,
  Sparkles,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  BrainCircuit,
  CalendarDays,
  Zap,
  Coffee,
  Brain,
  Sun,
  ShieldAlert,
  Moon,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface DashboardViewProps {
  tasks: Task[];
  userStats: UserStats;
  focusSessions: FocusSession[];
  onNavigate: (tab: string) => void;
}

export default function DashboardView({
  tasks,
  userStats,
  focusSessions,
  onNavigate
}: DashboardViewProps) {
  // Aggregate risks
  const criticalTasks = tasks.filter((t) => t.status === "pending" && t.riskLevel === "critical");
  const highRiskTasks = tasks.filter((t) => t.status === "pending" && t.riskLevel === "high");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const totalPending = tasks.filter((t) => t.status === "pending").length;

  const totalEffortPending = tasks
    .filter((t) => t.status === "pending")
    .reduce((sum, t) => sum + t.effort, 0);

  // States for Daily Planner & Burnout Monitor
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [showPlan, setShowPlan] = useState(false);

  const [burnoutData, setBurnoutData] = useState<BurnoutResponse | null>(null);
  const [loadingBurnout, setLoadingBurnout] = useState(false);
  const [sleepHours, setSleepHours] = useState(7.0);

  // Focus chart data
  const chartData = userStats.weeklyProgress || [
    { day: "Mon", hours: 1.5, completed: 1 },
    { day: "Tue", hours: 2.2, completed: 2 },
    { day: "Wed", hours: 0.8, completed: 0 },
    { day: "Thu", hours: 3.5, completed: 3 },
    { day: "Fri", hours: 1.2, completed: 1 },
    { day: "Sat", hours: 4.0, completed: 4 },
    { day: "Sun", hours: 0, completed: 0 },
  ];

  // Fetch Burnout Index on mount & when sleepHours change (debounced to avoid rate limits)
  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadBurnout() {
        setLoadingBurnout(true);
        try {
          const user = auth.currentUser;
          let mtgHrs = 2.0; // default
          if (user) {
            const blocksRef = collection(db, "users", user.uid, "scheduleBlocks");
            const snap = await getDocs(blocksRef);
            const blocks = snap.docs.map(doc => doc.data() as ScheduleBlock);
            const mtgs = blocks.filter(b => b.type === "meeting");
            mtgHrs = mtgs.length * 1.0; // assume 1 hour per meeting block
          }

          const data = await fetchBurnoutIndex(
            userStats.focusHours || 4.5,
            sleepHours,
            totalPending,
            mtgHrs || 2.0,
            userStats.productivityScore || 70
          );
          setBurnoutData(data);
        } catch (err) {
          console.error("Failed to load burnout:", err);
        } finally {
          setLoadingBurnout(false);
        }
      }
      loadBurnout();
    }, 500);

    return () => clearTimeout(timer);
  }, [userStats.focusHours, sleepHours, totalPending, userStats.productivityScore]);

  // Handle Daily Plan Generation
  const handleGenerateDailyPlan = async () => {
    setLoadingPlan(true);
    try {
      const user = auth.currentUser;
      let commitments: ScheduleBlock[] = [];
      if (user) {
        const blocksRef = collection(db, "users", user.uid, "scheduleBlocks");
        const snap = await getDocs(blocksRef);
        commitments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleBlock));
      }

      const plan = await fetchDailyPlan(tasks, commitments, userStats);
      setDailyPlan(plan);
      setShowPlan(true);
    } catch (err) {
      console.error("Failed to generate daily plan:", err);
    } finally {
      setLoadingPlan(false);
    }
  };

  // AI Recommendation list
  const getAiRecommendations = (): string[] => {
    const recommendations: string[] = [];
    if (criticalTasks.length > 0) {
      recommendations.push(
        `Critical Alert: "${criticalTasks[0].title}" requires emergency schedule rescue immediately.`
      );
    }
    if (totalEffortPending > 15) {
      recommendations.push(
        "Bandwidth Alert: Your total estimated effort exceeds 15 hours. Consider delaying low-impact tasks."
      );
    }
    if (userStats.streakDays > 2) {
      recommendations.push(
        `Superb Focus: You are on a ${userStats.streakDays}-day streak. Keep your focus blocks between 45-60 mins today.`
      );
    } else {
      recommendations.push(
        "Build Momentum: Start a 25-minute Pomodoro focus block on your easiest task to trigger momentum."
      );
    }
    if (highRiskTasks.length > 0) {
      recommendations.push(
        `High Risk Risk Warning: "${highRiskTasks[0].title}" has high completion risk. Run Planning Agent to break it down.`
      );
    }
    return recommendations;
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-950/40 border border-red-700 text-red-400 rounded px-1.5 py-0.5";
      case "high":
        return "bg-orange-950/40 border border-orange-700 text-orange-400 rounded px-1.5 py-0.5";
      case "moderate":
        return "bg-yellow-950/40 border border-yellow-700 text-yellow-400 rounded px-1.5 py-0.5";
      default:
        return "bg-green-950/40 border border-green-700 text-green-400 rounded px-1.5 py-0.5";
    }
  };

  const getBurnoutColor = (status?: string) => {
    switch (status) {
      case "critical":
        return "text-red-500 border-red-500/20 bg-red-500/5";
      case "danger":
        return "text-orange-400 border-orange-400/20 bg-orange-400/5";
      case "caution":
        return "text-yellow-400 border-yellow-400/20 bg-yellow-400/5";
      default:
        return "text-emerald-400 border-emerald-400/20 bg-emerald-400/5";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Operations Dashboard
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            COGNITIVE PRODUCTIVITY FEED • LIVE DEADLINE RISK METRICS
          </p>
        </div>
        <div className="flex gap-2">
          {criticalTasks.length > 0 || highRiskTasks.length > 0 ? (
            <button
              onClick={() => onNavigate("rescue")}
              className="px-6 py-2.5 bg-[#FF3B30] text-white rounded font-black text-xs tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,59,48,0.3)] animate-pulse cursor-pointer"
            >
              ACTIVATE RESCUE MODE
            </button>
          ) : (
            <button
              onClick={() => onNavigate("scheduler")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded flex items-center gap-2 cursor-pointer transition-all"
            >
              <CalendarDays className="h-4 w-4" />
              <span>GENERATE DAILY SCHEDULE</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Completion rate */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">Finish Rate</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">
              {userStats.completionRate}%
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {completedTasks.length} of {tasks.length} tasks completed
            </p>
          </div>
        </div>

        {/* Metric 2: StreakDays */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">Focus Streak</span>
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
              <Zap className="h-4 w-4 fill-orange-400/10" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">
              {userStats.streakDays} <span className="text-sm font-normal text-[#555]">Days</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase">Consistency score</p>
          </div>
        </div>

        {/* Metric 3: Total focus hours */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">Total Focus</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-white tracking-tight">
              {userStats.focusHours.toFixed(1)} <span className="text-sm font-normal text-[#555]">Hours</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase">Aggregated sessions</p>
          </div>
        </div>

        {/* Metric 4: Risk metrics */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#555] uppercase">Risk Level</span>
            <div className={`p-2 rounded-lg ${criticalTasks.length > 0 ? "bg-rose-500/10 text-rose-400 animate-pulse" : "bg-emerald-500/10 text-emerald-400"}`}>
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold tracking-tight ${criticalTasks.length > 0 ? "text-rose-500" : highRiskTasks.length > 0 ? "text-orange-400" : "text-white"}`}>
              {criticalTasks.length > 0
                ? "CRITICAL"
                : highRiskTasks.length > 0
                ? "HIGH RISK"
                : "STABLE"}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 font-mono uppercase">
              {criticalTasks.length + highRiskTasks.length} active risk nodes
            </p>
          </div>
        </div>
      </div>

      {/* 🌅 AUTONOMOUS DAILY PLANNER DESK */}
      <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/3 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242426] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                🌅 Autonomous Daily Planner Desk
              </h2>
              <p className="text-[9px] text-[#555] font-mono uppercase tracking-widest mt-0.5">
                Morning Priorities, Time Schedules, and Recovery Opportunities
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateDailyPlan}
            disabled={loadingPlan}
            className="px-4 py-1.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-rose-500 hover:text-white font-mono text-[10px] font-bold rounded uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
          >
            {loadingPlan ? (
              <span className="w-3 h-3 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>GENERATE MORNING PLAN</span>
          </button>
        </div>

        {showPlan && dailyPlan && (
          <div className="mt-5 space-y-6 animate-fade-in font-sans">
            <p className="text-xs text-gray-400 leading-relaxed italic border-l-2 border-[#242426] pl-3">
              "{dailyPlan.plannerExplanation}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
              {/* Priorities Card */}
              <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-3">
                <h4 className="text-[10px] font-mono font-bold text-[#FF3B30] uppercase tracking-widest flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Today's Top Priorities
                </h4>
                <ul className="space-y-2">
                  {dailyPlan.todayPriorities.map((item, idx) => (
                    <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-rose-500 shrink-0 font-mono">0{idx+1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Schedule Card */}
              <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-3">
                <h4 className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Target Schedule
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {dailyPlan.todayScheduleOutline.map((item, idx) => (
                    <div key={idx} className="text-xs flex flex-col border-b border-[#242426]/30 pb-1.5 last:border-0 last:pb-0">
                      <span className="font-mono text-[9px] text-[#555] font-bold">{item.timeSlot}</span>
                      <span className="text-gray-300 font-medium">{item.activity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decompress & Safeguard Card */}
              <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-4">
                {/* Focus Blocks */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    Recommended Focus Gaps
                  </h4>
                  <ul className="space-y-1 text-[11px] text-gray-400 list-disc list-inside">
                    {dailyPlan.suggestedFocusBlocks.map((b, idx) => <li key={idx}>{b}</li>)}
                  </ul>
                </div>

                {/* Recovery Opportunities */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Coffee className="h-3.5 w-3.5" />
                    Recovery Safeguards
                  </h4>
                  <ul className="space-y-1 text-[11px] text-gray-400 list-disc list-inside">
                    {dailyPlan.recoveryOpportunities.map((b, idx) => <li key={idx}>{b}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {dailyPlan.highRiskTasks.length > 0 && (
              <div className="p-3 bg-red-950/20 border border-red-700/30 rounded text-xs text-red-400 flex items-center gap-2 font-mono uppercase font-bold tracking-wide">
                <AlertOctagon className="h-4 w-4 text-[#FF3B30] shrink-0" />
                <span>High-Risk Milestone Checkpoints: {dailyPlan.highRiskTasks.join(", ")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid: Chart & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Productivity Flow Chart */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                PRODUCTIVITY & FOCUS TRENDS
              </h2>
              <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest mt-0.5">
                DAILY FOCUS METERS & FINISHED TASKS
              </p>
            </div>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="focusColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#242426" vertical={false} />
                <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} />
                <YAxis stroke="#555" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121214",
                    borderColor: "#242426",
                    color: "#E0E0E0",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#FF3B30"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#focusColor)"
                  name="Focus Hours"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🧠 AI BURNOUT monitor */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 flex flex-col h-full justify-between">
          <div className="space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Brain className="h-4.5 w-4.5 text-[#FF3B30] animate-pulse" />
              AI Burnout Safeguard
            </h2>
            <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest mt-0.5">
              Live Cognitive Fatigue & Sleep deficit audit
            </p>

            {loadingBurnout ? (
              <div className="py-8 text-center">
                <span className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin inline-block" />
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-2">Computing Mental Fatigue Index...</p>
              </div>
            ) : burnoutData ? (
              <div className="space-y-4 animate-fade-in">
                {/* Gauge Meter */}
                <div className={`p-4 rounded border flex items-center justify-between ${getBurnoutColor(burnoutData.burnoutStatus)}`}>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase font-bold tracking-wider">FATIGUE INDEX</span>
                    <h3 className="text-xl font-black font-sans tracking-tight">{burnoutData.burnoutIndex}%</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono uppercase font-bold tracking-wider">BOUNDARY STATUS</span>
                    <h4 className="text-xs font-black font-mono uppercase">{burnoutData.burnoutStatus}</h4>
                  </div>
                </div>

                {/* Sleep deficit slider */}
                <div className="p-3 bg-[#1A1A1C] border border-[#242426] rounded space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-[#555] uppercase">Target Nightly Sleep</span>
                    <span className="text-xs font-bold text-white font-mono">{sleepHours.toFixed(1)} hrs</span>
                  </div>
                  <input
                    type="range"
                    min="4.0"
                    max="9.0"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 bg-[#121214] border border-[#242426] h-1 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed pt-0.5">
                    {burnoutData.sleepFeedback}
                  </p>
                </div>

                {/* Break recommendations */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono font-bold text-[#555] uppercase">Break recommendations</span>
                  <ul className="space-y-1.5 text-xs text-gray-300 font-sans">
                    {burnoutData.scheduleBreakRecommendations.map((rec, index) => (
                      <li key={index} className="flex gap-2 items-start bg-[#1A1A1C] border border-[#242426] p-2.5 rounded">
                        <Coffee className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-6 text-center font-sans">No fatigue logs loaded.</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#242426]">
            <button
              onClick={() => onNavigate("coach")}
              className="w-full py-2 bg-[#1A1A1C] hover:bg-[#151517] text-blue-400 border border-[#242426] rounded text-[10px] font-bold font-mono tracking-widest uppercase transition-colors cursor-pointer text-center block"
            >
              CONSULT PRODUCTIVITY COACH
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Overdue and Immediate Priorities */}
      <div className="bg-[#121214] border border-[#242426] rounded-lg p-6">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2 mb-4">
          <CalendarDays className="h-4.5 w-4.5 text-rose-500" />
          IMMEDIATE PRIORITY DEADLINES
        </h2>

        {tasks.filter((t) => t.status === "pending").length === 0 ? (
          <div className="text-center py-8 bg-[#1A1A1C] rounded border border-dashed border-[#242426]">
            <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-[#555] font-mono uppercase font-bold">All schedules are stable</p>
            <p className="text-xs text-gray-500 mt-1">No pending deadlines. Excellent work!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#242426] text-[#555] font-mono uppercase text-[10px] font-bold">
                  <th className="py-3 px-4">Goal / Task Node</th>
                  <th className="py-3 px-4">Priority Score</th>
                  <th className="py-3 px-4">Deadline Epoch</th>
                  <th className="py-3 px-4">Risk Rating</th>
                  <th className="py-3 px-4">Action Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1C]">
                {tasks
                  .filter((t) => t.status === "pending")
                  .sort((a, b) => b.priorityScore - a.priorityScore)
                  .slice(0, 4)
                  .map((task) => (
                    <tr key={task.id} className="hover:bg-[#1A1A1C]/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#E0E0E0]">
                        <div>
                          <p className="text-xs font-semibold text-[#E0E0E0]">{task.title}</p>
                          <p className="text-[10px] text-[#555] font-mono mt-0.5 uppercase tracking-widest font-bold">
                            {task.category} • {task.subtasks.length} SUBTASKS
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-rose-500 text-xs">
                        SCORE: {task.priorityScore}
                      </td>
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-xs">
                        {new Date(task.deadline).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider ${getRiskBadge(task.riskLevel)}`}>
                          {task.riskLevel.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onNavigate("tasks")}
                          className="px-3 py-1 bg-[#1A1A1C] hover:bg-[#151517] text-gray-400 hover:text-white border border-[#242426] rounded text-[10px] font-mono uppercase transition-colors cursor-pointer font-bold"
                        >
                          Execute Breakdown
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
