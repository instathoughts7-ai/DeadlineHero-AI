import React, { useState } from "react";
import { Task, Subtask } from "../types";
import {
  fetchTaskPlan,
  fetchTaskPriority,
  fetchMeetingPrep
} from "../services/api";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Award,
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  Zap,
  BookOpen
} from "lucide-react";

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, "id" | "createdAt" | "priorityScore" | "riskLevel" | "riskExplanation" | "subtasks" | "scheduleBlocks" | "reflection" | "userId">) => Promise<string>;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export default function TasksView({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onNavigate
}: TasksViewProps) {
  // Task form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Work");
  const [deadline, setDeadline] = useState("");
  const [importance, setImportance] = useState<"low" | "medium" | "high">("medium");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [effort, setEffort] = useState(2);

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [aiPlanningTaskId, setAiPlanningTaskId] = useState<string | null>(null);
  const [aiPrioritizingTaskId, setAiPrioritizingTaskId] = useState<string | null>(null);
  const [aiMeetingPrepTaskId, setAiMeetingPrepTaskId] = useState<string | null>(null);
  const [selectedMeetingTypes, setSelectedMeetingTypes] = useState<Record<string, "interview" | "presentation" | "exam" | "client meeting">>({});
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Quick preset deadline dates
  const setQuickDeadline = (hoursAhead: number) => {
    const target = new Date();
    target.setHours(target.getHours() + hoursAhead);
    setDeadline(target.toISOString().substring(0, 16));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    try {
      const formattedDeadline = new Date(deadline).toISOString();
      const newId = await onAddTask({
        title,
        description,
        category,
        deadline: formattedDeadline,
        importance,
        urgency,
        effort,
        status: "pending"
      });

      // Clear form
      setTitle("");
      setDescription("");
      setCategory("Work");
      setDeadline("");
      setImportance("medium");
      setUrgency("medium");
      setEffort(2);
      setIsAddingTask(false);

      // Expand newly added task
      setExpandedTaskId(newId);
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const handleAiPlanning = async (task: Task) => {
    setAiPlanningTaskId(task.id);
    try {
      const plan = await fetchTaskPlan(task.title, task.description);
      const subtasks: Subtask[] = plan.subtasks.map((sub, idx) => ({
        id: `sub-${task.id}-${idx}`,
        title: sub.title,
        status: "pending",
        estimatedHours: sub.estimatedHours
      }));

      onUpdateTask({
        ...task,
        subtasks,
        riskExplanation: plan.strategy || task.riskExplanation
      });
    } catch (err) {
      console.error("Planning agent failed:", err);
    } finally {
      setAiPlanningTaskId(null);
    }
  };

  const handleAiPrioritize = async (task: Task) => {
    setAiPrioritizingTaskId(task.id);
    try {
      const assessment = await fetchTaskPriority(
        task.title,
        task.deadline,
        task.urgency,
        task.importance,
        task.effort,
        "Current scheduled workload"
      );

      onUpdateTask({
        ...task,
        priorityScore: assessment.priorityScore,
        riskLevel: assessment.riskLevel,
        riskExplanation: assessment.riskExplanation,
        decisionReasoning: assessment.decisionReasoning,
        successProbability: assessment.successProbability,
        successReasoning: assessment.successReasoning,
        remedialSuggestions: assessment.remedialSuggestions
      });
    } catch (err) {
      console.error("Priority agent failed:", err);
    } finally {
      setAiPrioritizingTaskId(null);
    }
  };

  const handleAiMeetingPrep = async (task: Task) => {
    setAiMeetingPrepTaskId(task.id);
    const meetingType = selectedMeetingTypes[task.id] || "client meeting";
    try {
      const response = await fetchMeetingPrep(
        meetingType,
        task.title,
        task.description,
        task.deadline
      );
      onUpdateTask({
        ...task,
        meetingPrep: response
      });
    } catch (err) {
      console.error("Meeting Prep failed:", err);
    } finally {
      setAiMeetingPrepTaskId(null);
    }
  };

  const toggleSubtask = (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((sub) =>
      sub.id === subtaskId
        ? { ...sub, status: (sub.status === "pending" ? "completed" : "pending") as "pending" | "completed" }
        : sub
    );
    onUpdateTask({
      ...task,
      subtasks: updatedSubtasks
    });
  };

  const toggleTaskStatus = (task: Task) => {
    const nextStatus = task.status === "pending" ? "completed" : "pending";
    if (nextStatus === "completed") {
      onUpdateTask({
        ...task,
        status: "completed",
        reflection: {
          wins: "",
          blockers: "",
          improvements: "",
          completedAt: new Date().toISOString()
        }
      });
      // Automatically prompt reflection navigation
      onNavigate("reflections");
    } else {
      onUpdateTask({
        ...task,
        status: "pending",
        reflection: null
      });
    }
  };

  const getRiskColor = (level: string) => {
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

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Task Control Desk
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            TASK DECOMPOSITION • AI PRIORITIZATION • SUBTASK ESTIMATIONS
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="px-4 py-2 bg-[#FF3B30] text-white rounded font-mono text-xs font-bold flex items-center gap-2 tracking-widest hover:brightness-110 transition-all cursor-pointer shadow-[0_0_15px_rgba(255,59,48,0.2)]"
          >
            <Plus className="h-4 w-4" />
            <span>{isAddingTask ? "CANCEL" : "CREATE NEW GOAL"}</span>
          </button>
        </div>
      </div>

      {/* Task Creation Drawer */}
      {isAddingTask && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#121214] border border-[#242426] rounded-lg p-6 space-y-4 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 bg-[#FF3B30] h-full" />
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest mb-2">
            INITIALIZE GOAL DEPLOYMENT
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. Build Hackathon Project Front-end"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#FF3B30]/50 transition-colors font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Strategic Context</label>
                <textarea
                  placeholder="Provide context, required stack, files, or special instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-24 bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#FF3B30]/50 transition-colors resize-none font-sans"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-2 text-xs text-[#E0E0E0] focus:outline-none font-sans font-medium"
                  >
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="writing">Writing</option>
                    <option value="research">Research</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Effort (Hours)</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={effort}
                    onChange={(e) => setEffort(parseFloat(e.target.value) || 1)}
                    className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Deadline Target</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-gray-400 focus:outline-none"
                  required
                />
                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(3)}
                    className="px-2.5 py-1 bg-[#1A1A1C] hover:bg-[#151517] border border-[#242426] text-gray-400 hover:text-white text-[10px] font-mono rounded transition-colors"
                  >
                    +3 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(24)}
                    className="px-2.5 py-1 bg-[#1A1A1C] hover:bg-[#151517] border border-[#242426] text-gray-400 hover:text-white text-[10px] font-mono rounded transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline(72)}
                    className="px-2.5 py-1 bg-[#1A1A1C] hover:bg-[#151517] border border-[#242426] text-gray-400 hover:text-white text-[10px] font-mono rounded transition-colors"
                  >
                    +3 Days
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Urgency</label>
                  <div className="flex bg-[#1A1A1C] rounded border border-[#242426] p-0.5">
                    {["low", "medium", "high"].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setUrgency(level as any)}
                        className={`flex-1 py-1 text-[10px] font-mono rounded capitalize transition-all ${
                          urgency === level ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/20 font-bold" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Importance</label>
                  <div className="flex bg-[#1A1A1C] rounded border border-[#242426] p-0.5">
                    {["low", "medium", "high"].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setImportance(level as any)}
                        className={`flex-1 py-1 text-[10px] font-mono rounded capitalize transition-all ${
                          importance === level ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/20 font-bold" : "text-gray-500 hover:text-white"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#FF3B30] text-white rounded font-black text-xs tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,59,48,0.3)] cursor-pointer"
            >
              INITIALIZE GOAL SCHEDULE
            </button>
          </div>
        </form>
      )}

      {/* Tasks Lists */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-16 bg-[#121214] border border-[#242426] rounded-lg p-8">
            <CheckCircle2 className="h-12 w-12 text-[#555] mx-auto mb-3 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase font-mono tracking-wider">No active goals</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-2 leading-relaxed font-sans">
              Create an overarching goal above, or use the "Command Desk" voice assistant tab to add structured tasks naturally using AI.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            const completedSubtasks = task.subtasks.filter((s) => s.status === "completed").length;
            const percentComplete =
              task.subtasks.length > 0
                ? Math.round((completedSubtasks / task.subtasks.length) * 100)
                : task.status === "completed"
                ? 100
                : 0;

            return (
              <div
                key={task.id}
                className={`bg-[#121214] border border-[#242426] rounded-lg overflow-hidden transition-all duration-200 ${
                  task.status === "completed" ? "opacity-60" : ""
                }`}
              >
                {/* Collapsible Header */}
                <div
                  onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-[#1A1A1C]/60 transition-colors"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTaskStatus(task);
                      }}
                      className="mt-0.5 p-1 bg-[#1A1A1C] hover:bg-emerald-950/30 text-gray-500 hover:text-emerald-400 border border-[#242426] rounded transition-all"
                      title={task.status === "completed" ? "Reopen Task" : "Complete Task"}
                    >
                      <CheckCircle2
                        className={`h-4.5 w-4.5 ${
                          task.status === "completed" ? "text-emerald-400 fill-emerald-500/10" : ""
                        }`}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-semibold leading-tight truncate ${
                            task.status === "completed"
                              ? "text-gray-500 line-through font-normal"
                              : "text-white"
                          }`}
                        >
                          {task.title}
                        </h4>
                        <span className="px-2 py-0.5 bg-[#1A1A1C] text-gray-400 border border-[#242426] rounded text-[9px] uppercase font-mono tracking-wider font-bold">
                          {task.category}
                        </span>
                        {task.priorityScore > 0 && (
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded text-[9px] font-mono font-bold uppercase">
                            AI PRIORITY: {task.priorityScore}
                          </span>
                        )}
                        {task.riskLevel && (
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-wider ${getRiskColor(task.riskLevel)}`}>
                            {task.riskLevel.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-1">{task.description || "No description provided."}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 font-mono text-[10px] text-[#888] border-t sm:border-t-0 border-[#242426] pt-2 sm:pt-0">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#555]" />
                      <span className="font-bold">
                        {new Date(task.deadline).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#555]" />
                      <span className="font-bold">{task.effort}H</span>
                    </div>

                    {/* Progress Bar Mini */}
                    <div className="hidden md:flex items-center gap-2 w-28">
                      <div className="w-full bg-[#1A1A1C] rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#FF3B30] to-blue-500 h-full"
                          style={{ width: `${percentComplete}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-400">{percentComplete}%</span>
                    </div>

                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-[#242426] bg-[#121214] space-y-5">
                    {/* Strategy and Risk Analysis Board */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 p-4 bg-[#1A1A1C] border border-[#242426] rounded space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-[#2F62FF]" />
                            <h5 className="text-[10px] font-mono text-gray-300 uppercase tracking-widest font-bold">
                              AI Tactical Strategy
                            </h5>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed font-sans">
                            {task.riskExplanation ||
                              "Click 'Analyze Priority' or 'Decompose Goal' to let Google Gemini formulate a custom tactical execution blueprint."}
                          </p>
                        </div>

                        {/* SUCCESS PROBABILITY ENGINE DISPLAY */}
                        {(task.successProbability !== undefined || task.successReasoning) && (
                          <div className="pt-3 border-t border-[#242426]/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Award className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider font-bold">
                                  AI Success Probability Engine
                                </span>
                              </div>
                              <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                                (task.successProbability || 0) >= 80 ? "text-emerald-400 bg-emerald-500/10" :
                                (task.successProbability || 0) >= 50 ? "text-amber-400 bg-amber-500/10" : "text-rose-400 bg-rose-500/10"
                              }`}>
                                {task.successProbability || 0}% Probability
                              </span>
                            </div>
                            <div className="w-full bg-[#121214] h-1.5 rounded-full overflow-hidden border border-[#242426]">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  (task.successProbability || 0) >= 80 ? "bg-emerald-500" :
                                  (task.successProbability || 0) >= 50 ? "bg-amber-500" : "bg-rose-500"
                                }`}
                                style={{ width: `${task.successProbability || 0}%` }}
                              />
                            </div>
                            {task.successReasoning && (
                              <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                                <strong className="text-gray-300">Analysis:</strong> {task.successReasoning}
                              </p>
                            )}
                            {task.remedialSuggestions && task.remedialSuggestions.length > 0 && (
                              <div className="bg-[#121214] p-2 border border-[#242426] rounded space-y-1">
                                <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                                  Remedial Corrective Recommendations:
                                </span>
                                <ul className="list-disc list-inside text-[10px] text-gray-400 space-y-0.5 font-sans">
                                  {task.remedialSuggestions.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* DECISION ENGINE DISPLAY */}
                        {task.decisionReasoning && (
                          <div className="pt-3 border-t border-[#242426]/60 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 border-b border-[#242426]/40 pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <BrainCircuit className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-[10px] font-mono text-gray-300 uppercase tracking-wider font-bold">
                                  AI Decision Engine Diagnostics
                                </span>
                              </div>
                              {task.decisionReasoning.confidenceScore !== undefined && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Confidence:</span>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-16 bg-[#1A1A1C] h-1 rounded-full overflow-hidden border border-[#242426]">
                                      <div 
                                        className="bg-emerald-500 h-full rounded-full" 
                                        style={{ width: `${task.decisionReasoning.confidenceScore}%` }}
                                      />
                                    </div>
                                    <span className="text-[9.5px] font-mono font-bold text-emerald-400">{task.decisionReasoning.confidenceScore}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-sans">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono text-gray-500 uppercase font-bold tracking-wider">WHY THIS TASK:</span>
                                <p className="text-gray-400 leading-normal">{task.decisionReasoning.whyThisTask}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono text-gray-500 uppercase font-bold tracking-wider">WHY NOW:</span>
                                <p className="text-gray-400 leading-normal">{task.decisionReasoning.whyNow}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono text-rose-500 uppercase font-bold tracking-wider">WHAT IF DELAYED (RISK):</span>
                                <p className="text-gray-400 leading-normal">{task.decisionReasoning.whatIfDelayed}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-wider">EXPECTED COMPLETED IMPACT:</span>
                                <p className="text-gray-400 leading-normal">{task.decisionReasoning.expectedImpact}</p>
                              </div>
                              {task.decisionReasoning.whatDataWasConsidered && (
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-mono text-blue-400 uppercase font-bold tracking-wider">DATA POINTS CONSIDERED:</span>
                                  <p className="text-gray-400 leading-normal">{task.decisionReasoning.whatDataWasConsidered}</p>
                                </div>
                              )}
                              {task.decisionReasoning.expectedBenefit && (
                                <div className="space-y-0.5">
                                  <span className="text-[9px] font-mono text-purple-400 uppercase font-bold tracking-wider">EXPECTED BENEFIT:</span>
                                  <p className="text-gray-400 leading-normal">{task.decisionReasoning.expectedBenefit}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* MEETING PREPARATION BLUEPRINT */}
                        {task.meetingPrep && (
                          <div className="pt-3 border-t border-[#242426]/60 space-y-3">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                                AI Meeting Preparation Agent Blueprint
                              </span>
                            </div>
                            <div className="bg-[#121214] p-3 border border-[#242426] rounded space-y-3">
                              <div className="prose prose-invert prose-xs text-xs text-gray-300 max-w-none">
                                <div className="font-mono text-[9px] text-gray-500 uppercase mb-1 tracking-wider">Preparation Playbook:</div>
                                <div className="whitespace-pre-line leading-relaxed font-sans text-[11px] text-gray-400">
                                  {task.meetingPrep.planMarkdown}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-[#242426]">
                                <div className="space-y-1">
                                  <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Meeting Objectives:</div>
                                  <ul className="list-disc list-inside text-[10px] text-gray-400 space-y-0.5 font-sans">
                                    {task.meetingPrep.objectives.map((o, idx) => (
                                      <li key={idx}>{o}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-[9px] font-mono text-amber-400 uppercase tracking-wider font-bold">Core Discussion / Mock Questions:</div>
                                  <ul className="list-disc list-inside text-[10px] text-gray-400 space-y-0.5 font-sans">
                                    {task.meetingPrep.suggestedQuestions.map((q, idx) => (
                                      <li key={idx}>{q}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-[#242426] space-y-1.5">
                                <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider font-bold">Proposed Prep Blocks Schedule:</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {task.meetingPrep.prepSchedules.map((block, idx) => (
                                    <div key={idx} className="p-2 bg-[#1A1A1C] border border-[#242426]/80 rounded text-[10px]">
                                      <div className="flex justify-between font-mono font-bold text-gray-300">
                                        <span>{block.title}</span>
                                        <span className="text-emerald-400">{block.durationHours}h</span>
                                      </div>
                                      <p className="text-gray-500 text-[9px] mt-0.5 font-sans">{block.activity}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-[#1A1A1C] border border-[#242426] rounded flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <BrainCircuit className="h-4 w-4 text-rose-500 animate-pulse" />
                            <h5 className="text-[10px] font-mono text-gray-300 uppercase tracking-widest font-bold">
                              AI Intelligence Actions
                            </h5>
                          </div>
                          <div className="space-y-1.5 mt-2">
                            <button
                              onClick={() => handleAiPlanning(task)}
                              disabled={aiPlanningTaskId === task.id}
                              className="w-full py-2 bg-[#121214] hover:bg-[#151517] disabled:opacity-50 text-rose-500 hover:text-white text-[10px] font-mono rounded transition-all border border-[#242426] uppercase tracking-wider font-bold cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {aiPlanningTaskId === task.id ? (
                                <span className="w-3.5 h-3.5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3" />
                                  <span>Decompose Goal</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleAiPrioritize(task)}
                              disabled={aiPrioritizingTaskId === task.id}
                              className="w-full py-2 bg-[#121214] hover:bg-[#151517] disabled:opacity-50 text-blue-400 hover:text-white text-[10px] font-mono rounded transition-all border border-[#242426] uppercase tracking-wider font-bold cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              {aiPrioritizingTaskId === task.id ? (
                                <span className="w-3.5 h-3.5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Award className="h-3 w-3" />
                                  <span>Analyze Priority</span>
                                </>
                              )}
                            </button>

                            {/* MEETING PREPARATION INPUTS */}
                            <div className="pt-2.5 border-t border-[#242426] space-y-1.5 mt-2">
                              <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider font-bold block">
                                Meeting Prep Type:
                              </label>
                              <select
                                value={selectedMeetingTypes[task.id] || "client meeting"}
                                onChange={(e) => setSelectedMeetingTypes({
                                  ...selectedMeetingTypes,
                                  [task.id]: e.target.value as any
                                })}
                                className="w-full text-[10px] font-mono bg-[#121214] border border-[#242426] text-gray-300 rounded px-2 py-1 outline-none cursor-pointer"
                              >
                                <option value="client meeting">Client Meeting</option>
                                <option value="interview">Interview</option>
                                <option value="presentation">Presentation</option>
                                <option value="exam">Exam</option>
                              </select>
                              <button
                                onClick={() => handleAiMeetingPrep(task)}
                                disabled={aiMeetingPrepTaskId === task.id}
                                className="w-full py-2 bg-[#121214] hover:bg-[#151517] disabled:opacity-50 text-emerald-400 hover:text-white text-[10px] font-mono rounded transition-all border border-[#242426] uppercase tracking-wider font-bold cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                {aiMeetingPrepTaskId === task.id ? (
                                  <span className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Zap className="h-3 w-3" />
                                    <span>Run Meeting Prep</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 text-right">
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="text-[10px] text-gray-500 hover:text-rose-500 font-mono transition-colors flex items-center justify-end gap-1 ml-auto cursor-pointer font-bold uppercase tracking-wider"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Purge Goal</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Checklists Workspace */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          <h5 className="text-[10px] font-mono text-gray-300 uppercase tracking-widest font-bold">
                            Decomposed Milestones Checklist ({completedSubtasks}/{task.subtasks.length})
                          </h5>
                        </div>
                      </div>

                      {task.subtasks.length === 0 ? (
                        <div className="text-center py-6 bg-[#1A1A1C] border border-dashed border-[#242426] rounded">
                          <BrainCircuit className="h-6 w-6 text-[#555] mx-auto mb-1.5" />
                          <p className="text-[10px] font-mono text-[#555] uppercase font-bold tracking-wider">Milestones Unmapped</p>
                          <p className="text-[10px] text-gray-500 mt-1 font-sans">
                            Click 'Decompose Goal' above. Gemini will instantly compile realistic milestone steps.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#1A1A1C] p-4 rounded border border-[#242426]">
                          {task.subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              onClick={() => toggleSubtask(task, subtask.id)}
                              className="flex items-center justify-between p-2.5 bg-[#121214] border border-[#242426] hover:border-gray-700 rounded cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={subtask.status === "completed"}
                                  readOnly
                                  className="h-3.5 w-3.5 accent-[#FF3B30] rounded border-[#242426] bg-[#1A1A1C]"
                                />
                                <span
                                  className={`text-xs truncate ${
                                    subtask.status === "completed"
                                      ? "text-gray-500 line-through font-normal"
                                      : "text-gray-300 font-medium"
                                  }`}
                                >
                                  {subtask.title}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1 shrink-0 ml-1 font-bold">
                                <Clock className="h-3 w-3 text-[#555]" />
                                {subtask.estimatedHours}H
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
