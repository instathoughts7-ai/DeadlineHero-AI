import { useState, useEffect, useRef } from "react";
import { Task } from "../types";
import {
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  Sparkles,
  ShieldAlert,
  Clock,
  Volume2,
  VolumeX
} from "lucide-react";

interface FocusViewProps {
  tasks: Task[];
  onAddFocusSession: (session: {
    taskId: string | null;
    duration: number;
    distractionsCount: number;
    productivityRating: number;
  }) => Promise<void>;
}

export default function FocusView({ tasks, onAddFocusSession }: FocusViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [timerPreset, setTimerPreset] = useState<25 | 45 | 60>(25);

  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [productivityRating, setProductivityRating] = useState(4);
  const [isMuted, setIsMuted] = useState(true);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // sound play (simulate visual/synthetic audio trigger)
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      countdownIntervalRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (seconds === 0) {
          if (minutes > 0) {
            setMinutes(minutes - 1);
            setSeconds(59);
          } else {
            // Timer expired!
            handleTimerComplete();
          }
        }
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isActive, minutes, seconds]);

  const handleTimerComplete = () => {
    setIsActive(false);
    triggerAudioBeep();

    if (!isBreak) {
      setSessionCompleted(true);
    } else {
      alert("Break complete! Time to tackle your next focus target.");
      resetTimer(timerPreset, false);
    }
  };

  const triggerAudioBeep = () => {
    setSoundFeedback("BEEP BEEP! Timer Concluded!");
    setTimeout(() => setSoundFeedback(null), 5000);
  };

  const startPauseTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = (newMinutes: 25 | 45 | 60 = timerPreset, breakMode = false) => {
    setIsActive(false);
    setIsBreak(breakMode);
    setMinutes(breakMode ? (newMinutes === 25 ? 5 : 10) : newMinutes);
    setSeconds(0);
    setDistractions(0);
    setSessionCompleted(false);
  };

  const handleSaveSession = async () => {
    try {
      const activeMinutes = timerPreset - minutes;
      await onAddFocusSession({
        taskId: selectedTaskId || null,
        duration: activeMinutes > 0 ? activeMinutes : timerPreset,
        distractionsCount: distractions,
        productivityRating: productivityRating
      });

      // Reset
      setSessionCompleted(false);
      resetTimer(timerPreset, false);
      alert("Focus block logged successfully! Great work staying locked in.");
    } catch (err) {
      console.error("Logging session failed:", err);
    }
  };

  const selectedTaskObj = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Deep Focus Engine
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            POMODORO LOOPS • DISTRACTION COUNTERS • ULTRADIAN BIORHYTHMS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Pomodoro Timer Board */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 lg:col-span-2 space-y-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />

          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest font-bold">
              {isBreak ? "Rest & Restore Buffer" : "Active Focus Block"}
            </span>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 bg-[#1A1A1C] hover:bg-[#202022] text-gray-400 hover:text-white border border-[#242426] rounded transition-all cursor-pointer"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {soundFeedback && (
            <div className="mx-auto max-w-sm py-2 px-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded font-mono text-xs animate-bounce font-bold tracking-wide">
              {soundFeedback}
            </div>
          )}

          {/* Clock Visual Representation */}
          <div className="py-8 flex flex-col items-center">
            <div className="w-56 h-56 rounded-full border-4 border-[#242426] flex flex-col justify-center items-center shadow-inner relative bg-[#1A1A1C]">
              <div className="absolute inset-2 rounded-full border border-dashed border-gray-800" />
              <h1 className="text-6xl font-black tracking-tighter text-white font-mono leading-none">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </h1>
              {selectedTaskObj && (
                <p className="text-[9px] text-[#FF3B30] font-mono truncate max-w-[160px] uppercase tracking-widest mt-2 font-bold">
                  {selectedTaskObj.title}
                </p>
              )}
            </div>
          </div>

          {/* Quick presets controller */}
          {!isActive && !sessionCompleted && (
            <div className="flex justify-center gap-2">
              {[25, 45, 60].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setTimerPreset(preset as any);
                    resetTimer(preset as any, false);
                  }}
                  className={`px-4 py-2 rounded text-xs font-mono transition-all cursor-pointer border ${
                    timerPreset === preset
                      ? "bg-[#FF3B30]/15 text-[#FF3B30] border-[#FF3B30]/25 font-bold"
                      : "bg-[#1A1A1C] text-gray-500 border-[#242426] hover:text-white"
                  }`}
                >
                  {preset} MIN
                </button>
              ))}
            </div>
          )}

          {/* Complete form panel overlay */}
          {sessionCompleted ? (
            <div className="bg-[#1A1A1C] p-5 rounded border border-[#242426] space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-center gap-2.5 text-[#FF3B30]">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-widest">
                  Complete Focus Block Session
                </h3>
              </div>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                Splendid focus loop. Reflect and log your details to help DeadlineHero AI coach you better:
              </p>

              <div>
                <label className="block text-[10px] font-mono font-bold text-[#555] mb-1.5 uppercase tracking-wider">
                  Productivity Rating (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProductivityRating(val)}
                      className={`flex-1 py-1.5 rounded text-xs font-mono transition-all cursor-pointer font-bold ${
                        productivityRating === val ? "bg-[#FF3B30]/15 text-[#FF3B30] border border-[#FF3B30]/25" : "bg-[#121214] border border-[#242426] text-gray-500"
                      }`}
                    >
                      {val} ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs font-mono font-bold">
                <button
                  onClick={() => setSessionCompleted(false)}
                  className="px-4 py-2 bg-[#121214] border border-[#242426] text-gray-400 hover:text-white rounded"
                >
                  DISCARD
                </button>
                <button
                  onClick={handleSaveSession}
                  className="px-4 py-2 bg-[#FF3B30] text-white rounded shadow-[0_0_15px_rgba(255,59,48,0.2)]"
                >
                  LOG TO DASHBOARD
                </button>
              </div>
            </div>
          ) : (
            /* Standard play/pause triggers */
            <div className="flex justify-center items-center gap-4 pt-1">
              <button
                onClick={() => resetTimer(timerPreset, false)}
                className="p-3 bg-[#1A1A1C] hover:bg-[#202022] text-gray-500 hover:text-red-500 border border-[#242426] rounded transition-all cursor-pointer"
                title="Reset loop"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </button>

              <button
                onClick={startPauseTimer}
                className="py-3 px-8 bg-[#FF3B30] hover:brightness-110 text-white text-xs font-black font-mono tracking-widest rounded flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,59,48,0.3)] cursor-pointer"
              >
                {isActive ? (
                  <>
                    <Pause className="h-4 w-4 fill-white" />
                    <span>PAUSE FOCUS</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white" />
                    <span>START LOCK-IN</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSessionCompleted(true)}
                className="px-4 py-3 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] text-gray-300 hover:text-white text-xs font-bold font-mono rounded cursor-pointer"
              >
                LOG NOW
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Active Task Selector & Sidetrack Counter */}
        <div className="space-y-4">
          {/* Sidetrack Distraction Tracker */}
          <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest text-left mb-1.5 flex items-center gap-2">
              <ShieldAlert className="h-4.5 w-4.5 text-yellow-500" />
              Sidetrack Monitor
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed text-left font-sans">
              Got sidetracked by social media, a phone call, or email? Hit log. We'll feed this procrastination data into your AI Coach.
            </p>

            <div className="my-5">
              <h2 className="text-5xl font-black text-yellow-400 tracking-tight font-mono">{distractions}</h2>
              <p className="text-[10px] text-[#555] font-mono mt-1 uppercase font-bold tracking-wider">Logged Distractions</p>
            </div>

            <button
              onClick={() => {
                setDistractions(distractions + 1);
              }}
              disabled={!isActive}
              className="w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500/15 disabled:opacity-40 disabled:hover:brightness-100 text-yellow-400 text-xs font-bold font-mono border border-yellow-500/25 rounded transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span>LOG SIDETRACK</span>
            </button>
          </div>

          {/* Goal selection wrapper */}
          <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-[#FF3B30]" />
              Target Focus Goal
            </h3>

            <div>
              <label className="block text-[10px] font-mono font-bold text-[#555] mb-1.5 uppercase tracking-wider">
                Lock focus on goal:
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-2.5 px-3 text-xs text-[#E0E0E0] focus:outline-none font-sans font-medium"
              >
                <option value="">-- General Focus Block --</option>
                {tasks
                  .filter((t) => t.status === "pending")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
