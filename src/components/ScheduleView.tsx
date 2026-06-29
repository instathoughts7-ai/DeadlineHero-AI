import React, { useState, useMemo } from "react";
import { Task, ScheduleBlock } from "../types";
import { fetchAiSchedule, fetchAdaptiveOptimize } from "../services/api";
import {
  connectGoogleCalendar,
  fetchGoogleCalendarEvents,
  writeEventToGoogleCalendar,
  getCachedGoogleToken
} from "../lib/googleCalendar";
import {
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  AlertOctagon,
  CheckCircle,
  Video,
  Coffee,
  Briefcase,
  BrainCircuit
} from "lucide-react";

interface ScheduleViewProps {
  tasks: Task[];
  scheduleBlocks: ScheduleBlock[];
  onAddScheduleBlock: (block: Omit<ScheduleBlock, "id">) => Promise<string>;
  onDeleteScheduleBlock: (id: string) => void;
  onSetScheduleBlocks: (blocks: ScheduleBlock[]) => void;
}

export default function ScheduleView({
  tasks,
  scheduleBlocks,
  onAddScheduleBlock,
  onDeleteScheduleBlock,
  onSetScheduleBlocks
}: ScheduleViewProps) {
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventType, setEventType] = useState<"meeting" | "personal">("meeting");
  const [isGenerating, setIsGenerating] = useState(false);

  // Google Calendar States
  const [isGcalConnected, setIsGcalConnected] = useState(!!getCachedGoogleToken());
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError] = useState<string | null>(null);
  const [gcalSuccessMessage, setGcalSuccessMessage] = useState<string | null>(null);

  // AI Adaptive Goal Optimizer state
  const [optimizationContext, setOptimizationContext] = useState(
    "Feeling slightly fatigued, need larger rest cycles between intense deep work sessions."
  );
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  const handleAdaptiveOptimize = async () => {
    setOptimizing(true);
    try {
      const simplifiedTasks = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        effort: t.effort,
        deadline: t.deadline
      }));
      const simplifiedSchedule = scheduleBlocks.map((b) => ({
        id: b.id,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        type: b.type,
        taskId: b.taskId
      }));

      const res = await fetchAdaptiveOptimize(
        simplifiedTasks,
        simplifiedSchedule,
        optimizationContext
      );
      setOptimizationResult(res);
    } catch (err) {
      console.error("Adaptive Optimization failed:", err);
      alert("Encountered an issue during schedule re-indexing. Please check task constraints.");
    } finally {
      setOptimizing(false);
    }
  };

  const handleCommitOptimization = () => {
    if (!optimizationResult || !optimizationResult.rebalancedSchedule) return;

    const remappedBlocks: ScheduleBlock[] = optimizationResult.rebalancedSchedule.map((b: any) => ({
      id: b.id || `rebalanced-${Math.random().toString(36).substr(2, 9)}`,
      taskId: b.taskId || null,
      title: b.title,
      startTime: b.startTime,
      endTime: b.endTime,
      type: b.type
    }));

    onSetScheduleBlocks(remappedBlocks);
    setOptimizationResult(null);
    alert("Rebalanced schedule applied and synchronized to Firestore successfully!");
  };

  const handleImportGoogleEvents = async () => {
    setGcalLoading(true);
    setGcalError(null);
    setGcalSuccessMessage(null);
    try {
      const token = await connectGoogleCalendar();
      setIsGcalConnected(true);
      const events = await fetchGoogleCalendarEvents(token);
      if (events.length === 0) {
        setGcalSuccessMessage("Google Calendar sync completed. No upcoming events detected for the next 7 days.");
        return;
      }

      // Merge events into current blocks
      let addedCount = 0;
      for (const evt of events) {
        const exists = scheduleBlocks.some(
          (existing) =>
            existing.title === evt.title &&
            new Date(existing.startTime).getTime() === new Date(evt.startTime).getTime()
        );
        if (!exists) {
          await onAddScheduleBlock({
            taskId: null,
            title: evt.title,
            startTime: evt.startTime,
            endTime: evt.endTime,
            type: evt.type
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        setGcalSuccessMessage(`Successfully synchronized with Google Calendar! Imported ${addedCount} upcoming events into your Timeline.`);
      } else {
        setGcalSuccessMessage("Synchronization complete. Your timeline is fully up to date with Google Calendar.");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "";
      if (errMsg.includes("admin-restricted-operation") || err.code === "auth/admin-restricted-operation") {
        setGcalError("Firebase Restricted Operation: Google Authentication has not been provisioned yet for this session. Please review and authorize the Google Calendar API access proposal in the card below to resolve this.");
      } else if (errMsg.includes("operation-not-allowed") || err.code === "auth/operation-not-allowed") {
        setGcalError("Google Sign-In integration is initializing or registering on the backend. Please wait a few seconds and try clicking 'Import Upcoming Events' again. If the issue persists, verify that the Google Calendar OAuth client setup was successfully authorized in the card below.");
      } else {
        setGcalError(errMsg || "Failed to establish synchronization with Google Calendar. Ensure OAuth scopes are authorized.");
      }
    } finally {
      setGcalLoading(false);
    }
  };

  const handleExportToGoogleCalendar = async () => {
    const workBlocks = scheduleBlocks.filter((b) => b.type === "work");
    if (workBlocks.length === 0) {
      alert("No active AI focus/work blocks found to export. Generate an AI Agenda first!");
      return;
    }

    const confirmed = window.confirm(
      `Sync Protection Prompt: This operation will write ${workBlocks.length} focus blocks directly to your primary Google Calendar. Would you like to proceed?`
    );
    if (!confirmed) return;

    setGcalLoading(true);
    setGcalError(null);
    setGcalSuccessMessage(null);
    try {
      const token = await connectGoogleCalendar();
      setIsGcalConnected(true);
      let count = 0;
      for (const block of workBlocks) {
        await writeEventToGoogleCalendar(token, block);
        count++;
      }
      setGcalSuccessMessage(`Successfully written ${count} AI Focus Blocks directly to your primary Google Calendar!`);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || "";
      if (errMsg.includes("admin-restricted-operation") || err.code === "auth/admin-restricted-operation") {
        setGcalError("Firebase Restricted Operation: Google Authentication has not been provisioned yet for this session. Please review and authorize the Google Calendar API access proposal in the card below to resolve this.");
      } else if (errMsg.includes("operation-not-allowed") || err.code === "auth/operation-not-allowed") {
        setGcalError("Google Sign-In integration is initializing or registering on the backend. Please wait a few seconds and try clicking 'Export AI Focus Blocks' again. If the issue persists, verify that the Google Calendar OAuth client setup was successfully authorized in the card below.");
      } else {
        setGcalError(errMsg || "Failed to write focus blocks to Google Calendar.");
      }
    } finally {
      setGcalLoading(false);
    }
  };

  // Quick preset starting times
  const setQuickTimes = (minutesFromNow: number, durationMinutes: number) => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + minutesFromNow);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    setStartTime(start.toISOString().substring(0, 16));
    setEndTime(end.toISOString().substring(0, 16));
  };

  // Conflict Detection: Overlap analyzing
  const conflicts = useMemo(() => {
    const list: string[] = [];
    const activeBlocks = scheduleBlocks.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (let i = 0; i < activeBlocks.length; i++) {
      const a = activeBlocks[i];
      const aStart = new Date(a.startTime).getTime();
      const aEnd = new Date(a.endTime).getTime();

      // Check overlaps with subsequent blocks
      for (let j = i + 1; j < activeBlocks.length; j++) {
        const b = activeBlocks[j];
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();

        if (aStart < bEnd && bStart < aEnd) {
          list.push(
            `Conflict: "${a.title}" overlaps with "${b.title}" (from ${new Date(
              b.startTime
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}).`
          );
        }
      }

      // Check if a work session deadline has passed or is too close
      if (a.taskId) {
        const taskObj = tasks.find((t) => t.id === a.taskId);
        if (taskObj) {
          const taskDeadline = new Date(taskObj.deadline).getTime();
          if (aEnd > taskDeadline) {
            list.push(
              `Deadline Violation: Work block for "${taskObj.title}" concludes after its deadline (${new Date(
                taskObj.deadline
              ).toLocaleDateString()}).`
            );
          }
        }
      }
    }

    return list;
  }, [scheduleBlocks, tasks]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !startTime || !endTime) return;

    try {
      await onAddScheduleBlock({
        taskId: null,
        title: eventTitle,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        type: eventType
      });

      // Reset
      setEventTitle("");
      setStartTime("");
      setEndTime("");
      setIsAddingEvent(false);
    } catch (err) {
      console.error("Failed to save calendar commitment:", err);
    }
  };

  const triggerAiScheduleGenerator = async () => {
    const pendingTasks = tasks.filter((t) => t.status === "pending");
    if (pendingTasks.length === 0) {
      alert("No pending tasks available. Please create a task first.");
      return;
    }

    setIsGenerating(true);
    try {
      // Gather currently defined manual commitments (meetings/personal blocks)
      const currentCommitments = scheduleBlocks.filter((b) => b.type === "meeting" || b.type === "personal");
      const rangeStart = new Date().toISOString();
      const rangeEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const response = await fetchAiSchedule(pendingTasks, currentCommitments, rangeStart, rangeEnd);

      // Map generated blocks with accurate fields
      const newBlocks: ScheduleBlock[] = response.scheduleBlocks.map((b) => ({
        id: b.id || `ai-${Math.random().toString(36).substr(2, 9)}`,
        taskId: b.taskId || null,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        type: b.type
      }));

      // Set combined list (preserves previous commitments, overwrites AI blocks)
      const commitmentsOnly = scheduleBlocks.filter((b) => b.type === "meeting" || b.type === "personal");
      onSetScheduleBlocks([...commitmentsOnly, ...newBlocks]);
    } catch (err) {
      console.error("AI Scheduling agent error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getBlockStyles = (type: string) => {
    switch (type) {
      case "meeting":
        return "border-l-2 border-red-500 bg-[#1A1A1C] text-red-300";
      case "personal":
        return "border-l-2 border-yellow-500 bg-[#1A1A1C] text-yellow-300";
      case "break":
        return "border-l-2 border-emerald-500 bg-[#1A1A1C] text-emerald-300";
      default:
        return "border-l-2 border-blue-500 bg-[#1A1A1C] text-blue-300";
    }
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "meeting":
        return <Video className="h-4 w-4 text-red-400 shrink-0" />;
      case "personal":
        return <Briefcase className="h-4 w-4 text-yellow-400 shrink-0" />;
      case "break":
        return <Coffee className="h-4 w-4 text-emerald-400 shrink-0" />;
      default:
        return <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            AI Calendar & Scheduling
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            CONFLICT AUDITING • WORK-BLOCK SEQUENCING • AGENDA SYNCHRONIZATION
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsAddingEvent(!isAddingEvent)}
            className="px-4 py-2 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-gray-300 font-mono text-xs font-bold rounded flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>BOOK COMMITMENT</span>
          </button>
          <button
            onClick={triggerAiScheduleGenerator}
            disabled={isGenerating}
            className="px-4 py-2 bg-[#FF3B30] text-white font-mono text-xs font-bold rounded flex items-center gap-2 cursor-pointer transition-all shadow-[0_0_15px_rgba(255,59,48,0.2)]"
          >
            {isGenerating ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>GENERATE AI AGENDA</span>
          </button>
        </div>
      </div>

      {/* GOOGLE CALENDAR CONTROL HUB */}
      <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#4285F4]/3 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242426]/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#4285F4]/10 text-[#4285F4] rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Google Calendar Synchronization Panel
              </h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">
                OAUTH CONNECTIONS • RECURRING CONFLICT AUDITS • FOCUS SYNC
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 font-mono text-[10px] shrink-0">
            <span className="text-gray-500">OAUTH STATUS:</span>
            {isGcalConnected ? (
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase tracking-wider animate-pulse">
                ● ACTIVE SESSION
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full font-bold uppercase tracking-wider">
                ● ACTION REQUIRED
              </span>
            )}
          </div>
        </div>

        {gcalSuccessMessage && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 rounded text-xs leading-relaxed font-sans flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            <p>{gcalSuccessMessage}</p>
          </div>
        )}

        {gcalError && (
          <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-300 rounded text-xs leading-relaxed font-sans flex items-start gap-2.5">
            <AlertOctagon className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <p>{gcalError}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleImportGoogleEvents}
            disabled={gcalLoading}
            className="px-4 py-2 bg-[#1A1A1C] hover:bg-[#202022] disabled:opacity-50 border border-[#242426] text-gray-300 font-mono text-xs font-bold rounded flex items-center gap-2 cursor-pointer transition-all"
          >
            {gcalLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 text-[#4285F4]" />
            )}
            <span>{gcalLoading ? "CONNECTING..." : "IMPORT UPCOMING EVENTS"}</span>
          </button>

          {scheduleBlocks.some(b => b.type === "work") && (
            <button
              onClick={handleExportToGoogleCalendar}
              disabled={gcalLoading}
              className="px-4 py-2 bg-[#4285F4]/10 hover:bg-[#4285F4]/15 disabled:opacity-50 border border-[#4285F4]/25 text-[#4285F4] font-mono text-xs font-bold rounded flex items-center gap-2 cursor-pointer transition-all animate-bounce"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>EXPORT AI FOCUS BLOCKS</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Optimization Proposal active presentation */}
      {optimizationResult && (
        <div className="p-5 bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-lg space-y-4 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF3B30]/3 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#242426] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FF3B30]/10 text-[#FF3B30] rounded-lg">
                <BrainCircuit className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Goal Optimization Proposal Active
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5 uppercase tracking-wider">
                  Adaptive rebalancing strategy calculated in response to: "{optimizationContext}"
                </p>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setOptimizationResult(null)}
                className="px-3.5 py-1.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-gray-400 hover:text-white font-mono text-[10px] font-bold rounded cursor-pointer"
              >
                DISCARD PROPOSAL
              </button>
              <button
                onClick={handleCommitOptimization}
                className="px-4 py-1.5 bg-[#FF3B30] hover:brightness-110 text-white font-mono text-[10px] font-black tracking-wider rounded cursor-pointer"
              >
                APPLY REBALANCED AGENDA
              </button>
            </div>
          </div>

          <div className="space-y-3 font-sans text-xs text-gray-300">
            <div className="p-3 bg-[#1A1A1C] border border-[#242426] rounded-lg">
              <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block mb-1">
                EXECUTIVE REPLANNING RATIONALE:
              </span>
              <p className="leading-relaxed text-gray-300 whitespace-pre-line">
                {optimizationResult.optimizerExplanation}
              </p>
            </div>

            {optimizationResult.rebalancedSchedule && optimizationResult.rebalancedSchedule.length > 0 && (
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest block">
                  Proposed Reallocated Timeline Blocks:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {optimizationResult.rebalancedSchedule.map((block: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-[#1A1A1C] border border-[#242426] rounded flex items-center justify-between gap-2.5 text-[10px]">
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{block.title}</p>
                        <span className="text-[8px] font-mono text-gray-500 uppercase font-black">
                          {block.type}
                        </span>
                      </div>
                      <div className="text-right shrink-0 font-mono text-emerald-400 font-bold">
                        {new Date(block.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conflicts Alert Banner */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-red-950/20 border border-red-700/30 rounded flex items-start gap-3.5">
          <div className="p-1.5 bg-red-500/10 text-red-400 rounded shrink-0">
            <AlertOctagon className="h-5 w-5 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold font-mono text-red-400 uppercase tracking-widest">
              Conflict Monitor Warning
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index} className="text-xs text-red-300/90 leading-relaxed font-sans">
                  {conflict}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Commitment Booker Form / Reference Board */}
        <div className="space-y-4 lg:col-span-1">
          {isAddingEvent ? (
            <form
              onSubmit={handleCreateEvent}
              className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4 shadow-xl"
            >
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                Book Calendar Commitment
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Title / Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Sync Meeting w/ Principal Dev"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Start Time</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-2 text-xs text-gray-400 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">End Time</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-2 text-xs text-gray-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setQuickTimes(5, 30)}
                    className="px-2 py-0.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-gray-400 text-[9px] font-mono rounded transition-colors shrink-0 font-bold"
                  >
                    Now (30m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTimes(120, 60)}
                    className="px-2 py-0.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-gray-400 text-[9px] font-mono rounded transition-colors shrink-0 font-bold"
                  >
                    +2h (1h)
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">Commitment Category</label>
                  <div className="flex bg-[#1A1A1C] rounded border border-[#242426] p-0.5">
                    <button
                      type="button"
                      onClick={() => setEventType("meeting")}
                      className={`flex-1 py-1.5 text-[10px] font-mono rounded uppercase tracking-wider font-bold transition-all ${
                        eventType === "meeting" ? "bg-red-500/10 text-[#FF3B30] border border-[#FF3B30]/20" : "text-gray-500 hover:text-white"
                      }`}
                    >
                      Meeting
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventType("personal")}
                      className={`flex-1 py-1.5 text-[10px] font-mono rounded uppercase tracking-wider font-bold transition-all ${
                        eventType === "personal" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" : "text-gray-500 hover:text-white"
                      }`}
                    >
                      Personal Block
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="px-3.5 py-1.5 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-gray-400 font-mono text-[10px] font-bold rounded cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#FF3B30] text-white font-mono text-[10px] font-bold rounded cursor-pointer"
                >
                  SAVE BLOCK
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                  Autonomous Scheduling Heuristics
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  DeadlineHero AI integrates your set calendars with smart task goals. Clicking <strong>'Generate AI Agenda'</strong> utilizes Gemini's constraint satisfaction algorithms to schedule:
                </p>
                <ul className="space-y-2 text-xs text-gray-400 font-sans">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Optimal deep focus blocks tailored around pre-booked meetings.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Strategic rest buffers (breaks) to counter mental burnout.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[#FF3B30] shrink-0 mt-0.5" />
                    <span>Proactive warnings if task estimated efforts spill past targets.</span>
                  </li>
                </ul>
              </div>

              {/* AI ADAPTIVE GOAL OPTIMIZER */}
              <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-3.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF3B30]/3 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4.5 w-4.5 text-[#FF3B30] shrink-0 animate-pulse" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest">
                    AI Adaptive Goal Optimizer
                  </h3>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  Dynamically adjust tasks & blocks based on sudden physiological, energy, or environmental changes.
                </p>

                <div className="space-y-1">
                  <label className="block text-[8px] font-mono font-bold text-gray-500 uppercase tracking-wider">Describe change context:</label>
                  <input
                    type="text"
                    value={optimizationContext}
                    onChange={(e) => setOptimizationContext(e.target.value)}
                    className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-white focus:outline-none focus:border-[#FF3B30]/50 font-sans"
                    placeholder="e.g. Wi-Fi down for 1 hour, feeling fatigued..."
                  />
                </div>

                <button
                  onClick={handleAdaptiveOptimize}
                  disabled={optimizing || tasks.length === 0}
                  className="w-full py-2 bg-[#FF3B30] hover:brightness-110 disabled:opacity-50 text-white font-mono text-[10px] font-black tracking-wider rounded cursor-pointer uppercase flex items-center justify-center gap-1.5 transition-all"
                >
                  {optimizing ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Rebalance Schedule</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quick Active Task band */}
          <div className="bg-[#121214] border border-[#242426] rounded-lg p-5">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest mb-3">
              Unscheduled Goals
            </h3>
            {tasks.filter((t) => t.status === "pending" && !scheduleBlocks.some((b) => b.taskId === t.id))
              .length === 0 ? (
              <p className="text-[10px] text-[#555] uppercase font-mono font-bold py-2 text-center tracking-wider">All tasks mapped!</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {tasks
                  .filter((t) => t.status === "pending" && !scheduleBlocks.some((b) => b.taskId === t.id))
                  .map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 bg-[#1A1A1C] border border-[#242426] rounded flex items-center justify-between text-xs font-medium"
                    >
                      <span className="text-gray-300 truncate font-semibold" title={task.title}>{task.title}</span>
                      <span className="text-[9px] font-mono text-blue-400 shrink-0 ml-2 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                        {task.effort} HRS
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Timeline Agenda Visualizer */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 lg:col-span-2">
          <h2 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2 mb-4">
            <Calendar className="h-4.5 w-4.5 text-[#FF3B30]" />
            Agenda Timeline
          </h2>

          {scheduleBlocks.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A1C] rounded border border-dashed border-[#242426]">
              <Clock className="h-10 w-10 text-[#555] mx-auto mb-3 animate-pulse" />
              <p className="text-xs text-gray-400 font-mono uppercase font-bold tracking-wider">Your schedule is empty</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed font-sans">
                Add structured commitments (like client syncs) on the left, or let Google Gemini map out your emergency day with AI.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
              {scheduleBlocks
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((block) => (
                  <div
                    key={block.id}
                    className={`p-3.5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 border border-[#242426] ${getBlockStyles(
                      block.type
                    )}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2 bg-[#121214] border border-[#242426] rounded">
                        {getBlockIcon(block.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight font-sans text-white">{block.title}</p>
                        <p className="text-[9px] font-mono text-gray-500 mt-1 uppercase flex items-center gap-1.5 font-bold tracking-wider">
                          <span>TYPE: {block.type}</span>
                          {block.taskId && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">SYNCED GOAL</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 font-mono text-[10px]">
                      <div className="text-gray-400 flex items-center gap-1.5 font-bold">
                        <Clock className="h-3.5 w-3.5 text-[#555]" />
                        <span>
                          {new Date(block.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(block.endTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wide">
                          ({new Date(block.startTime).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })})
                        </span>
                      </div>

                      <button
                        onClick={() => onDeleteScheduleBlock(block.id)}
                        className="text-gray-500 hover:text-red-500 p-1 rounded hover:bg-[#1A1A1C] transition-all cursor-pointer"
                        title="Delete Block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
