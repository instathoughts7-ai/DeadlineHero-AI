import { useState } from "react";
import { Task, ScheduleBlock, RescuePlan } from "../types";
import { fetchRescuePlan } from "../services/api";
import {
  AlertTriangle,
  Sparkles,
  Zap,
  Coffee,
  CheckCircle,
  XCircle,
  TrendingUp,
  BrainCircuit,
  CalendarDays,
  ShieldAlert
} from "lucide-react";

interface RescueViewProps {
  tasks: Task[];
  scheduleBlocks: ScheduleBlock[];
  onCommitRescueBlocks: (blocks: ScheduleBlock[], deferredTaskNames: string[]) => void;
}

export default function RescueView({
  tasks,
  scheduleBlocks,
  onCommitRescueBlocks
}: RescueViewProps) {
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("medium");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [rescuePlan, setRescuePlan] = useState<RescuePlan | null>(null);

  // Filter out pending high-risk tasks to show why rescue is needed
  const highRiskTasks = tasks.filter(
    (t) => t.status === "pending" && (t.riskLevel === "critical" || t.riskLevel === "high")
  );
  const allPendingTasks = tasks.filter((t) => t.status === "pending");

  const triggerRescueMode = async () => {
    if (allPendingTasks.length === 0) {
      alert("No pending tasks to rescue. You are in a safe state!");
      return;
    }

    setLoading(true);
    try {
      const plan = await fetchRescuePlan(allPendingTasks, scheduleBlocks, energyLevel, notes);
      setRescuePlan(plan);
    } catch (err) {
      console.error("Rescue mode trigger failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitPlan = () => {
    if (!rescuePlan) return;
    onCommitRescueBlocks(rescuePlan.reorganizedBlocks, rescuePlan.deferredTasks);
    alert("Rescue Plan committed successfully! Non-critical tasks deferred and emergency focus blocks applied to your schedule.");
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 80) return "text-emerald-400 border-[#242426] bg-[#121214]";
    if (prob >= 50) return "text-yellow-400 border-[#242426] bg-[#121214]";
    return "text-[#FF3B30] border-[#242426] bg-[#121214]";
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Deadline Rescue Station
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            EMERGENCY DEFERRAL • SCHEDULING CONTINGENCY • SUCCESS CAPABILITY
          </p>
        </div>
      </div>

      {!rescuePlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Rescue Form Box */}
          <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 lg:col-span-2 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex items-center gap-3.5 border-b border-[#242426] pb-4">
              <div className="p-2.5 bg-red-950/40 border border-red-700 text-[#FF3B30] rounded-lg animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                  Initialize Rescue Mode
                </h3>
                <p className="text-[9px] text-[#555] font-mono mt-0.5 font-bold uppercase tracking-wider">OVERLOAD BUFFER CONTROLLER</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Feeling swamped, behind, or facing calendar conflicts? The <strong>Rescue Mode Agent</strong> compiles an emergency strategy: deferring non-urgent work, skipping clutter, and mapping tight, optimized work sessions to save your goals.
              </p>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#555] mb-2 uppercase tracking-wider">
                  Current Energy Level Capacity
                </label>
                <div className="grid grid-cols-3 gap-3 bg-[#1A1A1C] p-1 rounded border border-[#242426]">
                  {[
                    { id: "high", label: "High Focus", icon: Zap, color: "text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/20" },
                    { id: "medium", label: "Medium", icon: TrendingUp, color: "text-blue-400 bg-blue-500/10 border border-blue-500/20" },
                    { id: "low", label: "Low Bandwidth", icon: Coffee, color: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" }
                  ].map((lvl) => {
                    const Icon = lvl.icon;
                    const isSelected = energyLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setEnergyLevel(lvl.id as any)}
                        className={`py-2 px-3 rounded flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                          isSelected ? `${lvl.color} font-bold` : "text-gray-500 hover:text-white"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-mono capitalize">{lvl.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#555] mb-2 uppercase tracking-wider">
                  What is the blocker or disruption? (Context for AI)
                </label>
                <textarea
                  placeholder="e.g. My morning flight got delayed by 4 hours. Or, I am feeling totally overwhelmed and stuck starting this dashboard."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-24 bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#FF3B30]/50 resize-none font-sans"
                />
              </div>

              <button
                onClick={triggerRescueMode}
                disabled={loading || allPendingTasks.length === 0}
                className="w-full py-3 bg-[#FF3B30] hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-white font-mono text-xs font-black tracking-widest rounded flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,59,48,0.2)] cursor-pointer"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span>EXECUTE DEADLINE RESCUE PLAN</span>
              </button>
            </div>
          </div>

          {/* Right Side: Risk Stats Panel */}
          <div className="space-y-4">
            <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                Pending Risk Analysis
              </h3>

              {highRiskTasks.length === 0 ? (
                <div className="py-4 text-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-[10px] font-mono text-emerald-500 uppercase font-bold tracking-wider">Schedules Stable</p>
                  <p className="text-xs text-gray-500 mt-1 font-sans">No critical risks currently detected.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {highRiskTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-[#1A1A1C] border border-[#242426] rounded space-y-1.5"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">{t.title}</span>
                        <span className="px-1.5 py-0.5 bg-red-950/40 border border-red-700 text-red-400 text-[8px] font-black font-mono uppercase shrink-0 rounded">
                          {t.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono">
                        Target: {new Date(t.deadline).toLocaleDateString()} ({t.effort} Hrs required)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Rescue Plan Active Presentation View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Success probability meter */}
            <div className={`p-6 border rounded-lg flex flex-col justify-between items-center text-center ${getProbabilityColor(rescuePlan.estimatedSuccessProbability)}`}>
              <div>
                <h3 className="text-[10px] font-bold font-mono uppercase tracking-widest text-gray-400 mb-1">
                  Rescue Success Chance
                </h3>
                <p className="text-[9px] font-mono text-[#555] uppercase font-bold tracking-widest">PROBABILITY CONSTRAINTS MODEL</p>
              </div>

              <div className="my-5 relative flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-[#242426] flex items-center justify-center">
                  <h2 className="text-4xl font-black tracking-tight font-sans text-white">
                    {rescuePlan.estimatedSuccessProbability}%
                  </h2>
                </div>
              </div>

              <p className="text-xs text-gray-400 font-medium font-sans">
                {rescuePlan.estimatedSuccessProbability >= 80
                  ? "Highly viable path. Follow this structure immediately."
                  : rescuePlan.estimatedSuccessProbability >= 50
                  ? "Moderate feasibility. Requires absolute focus buffers."
                  : "Tight deadline mismatch. Further goal pruning recommended."}
              </p>
            </div>

            {/* Strategic recovery actions */}
            <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 md:col-span-2 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2 mb-3">
                  <BrainCircuit className="h-4 w-4 text-blue-500 animate-pulse" />
                  Tactical Recovery Steps
                </h3>

                <div className="space-y-2.5">
                  {rescuePlan.recoveryActions.map((act, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 bg-[#1A1A1C] border border-[#242426] rounded"
                    >
                      <div className="p-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded h-fit shrink-0 font-mono text-[10px] font-bold w-5 h-5 flex items-center justify-center">
                        {index + 1}
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed font-sans">{act}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-[#242426]">
                <button
                  onClick={() => setRescuePlan(null)}
                  className="px-4 py-2 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-gray-400 hover:text-white font-mono text-xs font-bold rounded cursor-pointer"
                >
                  RE-CALCULATE PLAN
                </button>
                <button
                  onClick={handleCommitPlan}
                  className="px-4 py-2 bg-[#FF3B30] hover:brightness-110 text-white font-mono text-xs font-bold rounded cursor-pointer shadow-[0_0_15px_rgba(255,59,48,0.2)]"
                >
                  APPLY EMERGENCY AGENDA
                </button>
              </div>
            </div>
          </div>

          {/* Grid: Deferred Tasks & Reorganized blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Deferred list */}
            <div className="bg-[#121214] border border-[#242426] rounded-lg p-6">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2 mb-3">
                <XCircle className="h-4.5 w-4.5 text-[#FF3B30]" />
                Deferred Bandwidth (Hold list)
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4 font-sans">
                The Rescue Agent recommends putting these low-impact goals or tasks on temporary ice to secure immediate high-risk targets:
              </p>

              <div className="space-y-2">
                {rescuePlan.deferredTasks.map((tName, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-950/20 border border-red-700/30 text-red-400 rounded flex items-center gap-3 text-xs font-medium font-sans"
                  >
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{tName}</span>
                  </div>
                ))}
                {rescuePlan.deferredTasks.length === 0 && (
                  <p className="text-[9px] text-[#555] font-mono uppercase font-bold py-4 text-center tracking-wider">No task deferrals needed!</p>
                )}
              </div>
            </div>

            {/* Reorganized Timeline blocks */}
            <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 lg:col-span-2">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2 mb-3">
                <CalendarDays className="h-4.5 w-4.5 text-blue-500" />
                Emergency Timeline Realignment
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed mb-4 font-sans">
                Your next 24-48 hours have been reorganized with high-impact, non-overlapping work slots tailored to maximize deadline safety:
              </p>

              <div className="space-y-2">
                {rescuePlan.reorganizedBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-blue-500/5 border border-blue-500/10 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="font-semibold text-blue-300 font-sans">{b.title}</div>
                    <div className="font-mono text-[10px] text-gray-500 flex items-center gap-1.5 shrink-0">
                      <Zap className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
                      <span className="font-bold">
                        {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                        -{" "}
                        {new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
