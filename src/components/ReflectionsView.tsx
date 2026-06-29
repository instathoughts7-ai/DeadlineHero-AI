import { useState } from "react";
import { Task, Reflection } from "../types";
import {
  CheckCircle,
  Award,
  BookOpen,
  Sparkles
} from "lucide-react";

interface ReflectionsViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
}

export default function ReflectionsView({ tasks, onUpdateTask }: ReflectionsViewProps) {
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const [wins, setWins] = useState("");
  const [blockers, setBlockers] = useState("");
  const [improvements, setImprovements] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleSubmitReflection = (task: Task) => {
    if (!wins.trim()) {
      alert("Please record at least one win or completion detail.");
      return;
    }

    const reflection: Reflection = {
      wins,
      blockers,
      improvements,
      completedAt: new Date().toISOString()
    };

    onUpdateTask({
      ...task,
      reflection
    });

    // Clear state
    setWins("");
    setBlockers("");
    setImprovements("");
    setSelectedTaskId(null);
    alert("Reflection recorded successfully! Wisdom archived.");
  };

  const tasksPendingReflection = completedTasks.filter(
    (t) => !t.reflection || !t.reflection.wins
  );

  const tasksWithReflection = completedTasks.filter(
    (t) => t.reflection && t.reflection.wins
  );

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Wisdom Reflection Lab
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            RETROSPECTIVE EVALUATION • GAINS CHRONICLING • SYSTEMIC IMPROVEMENTS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hand: Pending Reflections Form List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2">
            <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
            Awaiting Reflection Review ({tasksPendingReflection.length})
          </h3>

          {tasksPendingReflection.length === 0 ? (
            <div className="text-center py-12 bg-[#121214] border border-[#242426] rounded-lg p-8">
              <Award className="h-10 w-10 text-gray-600 mx-auto mb-2.5 animate-bounce" />
              <p className="text-xs text-gray-400 font-mono uppercase font-bold tracking-wider">Reflections Complete</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed font-sans">
                Splendid work! You have no completed goals requiring review. Complete another target from your Task Board to trigger retrospective gains.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasksPendingReflection.map((task) => {
                const isFormActive = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4 transition-all duration-150"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[#242426] pb-2.5">
                      <div>
                        <h4 className="text-xs font-semibold text-white font-sans">{task.title}</h4>
                        <p className="text-[9px] text-gray-500 font-mono uppercase font-bold tracking-wider mt-0.5">
                          CONCLUDED ON: {new Date(task.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTaskId(isFormActive ? null : task.id)}
                        className="px-3.5 py-1 bg-[#FF3B30] hover:brightness-110 text-white font-mono text-[10px] font-bold rounded cursor-pointer"
                      >
                        {isFormActive ? "COLLAPSE" : "REFLECT GAINS"}
                      </button>
                    </div>

                    {isFormActive && (
                      <div className="space-y-4 pt-1 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">
                              What were the key wins or successes?
                            </label>
                            <textarea
                              placeholder="e.g. Delivered frontend 2 hours early, design was highly clean and praised."
                              value={wins}
                              onChange={(e) => setWins(e.target.value)}
                              className="w-full h-20 bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none resize-none font-sans"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">
                              What blockers or distractions occurred?
                            </label>
                            <textarea
                              placeholder="e.g. Got sidetracked by Twitter focus leaks. Estimated server setup took too long."
                              value={blockers}
                              onChange={(e) => setBlockers(e.target.value)}
                              className="w-full h-20 bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none resize-none font-sans"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold text-[#555] mb-1 uppercase tracking-wider">
                            Strategic adjustments for next time?
                          </label>
                          <textarea
                            placeholder="e.g. Will use 45-minute focus intervals and put phone in draw from block 1."
                            value={improvements}
                            onChange={(e) => setImprovements(e.target.value)}
                            className="w-full h-16 bg-[#1A1A1C] border border-[#242426] rounded py-2 px-3 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none resize-none font-sans"
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleSubmitReflection(task)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          >
                            ARCHIVE WISDOM BLOCK
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Hand: Past Chronicles of Wisdom */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4 h-fit">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-500" />
            Wisdom Chronicles
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-sans pb-2">
            Historical reviews aggregated from your finished work blocks. Reviewing blockers builds high-leverage habits:
          </p>

          <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
            {tasksWithReflection.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-[#1A1A1C] border border-[#242426] rounded-lg space-y-2 relative"
              >
                <div className="absolute top-3 right-3 text-blue-500">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-white font-sans leading-tight pr-5">{task.title}</h4>
                
                <div className="space-y-1.5 font-sans text-xs">
                  <div>
                    <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-wider">Wins</span>
                    <p className="text-gray-400 mt-0.5">{task.reflection?.wins}</p>
                  </div>
                  {task.reflection?.blockers && (
                    <div>
                      <span className="text-[9px] font-mono text-[#FF3B30] uppercase font-bold tracking-wider">Blockers</span>
                      <p className="text-gray-400 mt-0.5">{task.reflection?.blockers}</p>
                    </div>
                  )}
                  {task.reflection?.improvements && (
                    <div>
                      <span className="text-[9px] font-mono text-blue-400 uppercase font-bold tracking-wider">Future Adjustment</span>
                      <p className="text-gray-400 mt-0.5">{task.reflection?.improvements}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {tasksWithReflection.length === 0 && (
              <p className="text-[10px] text-[#555] uppercase font-mono font-bold py-6 text-center tracking-wider">Wisdom archives empty</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
