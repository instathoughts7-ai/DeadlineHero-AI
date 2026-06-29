import { useState } from "react";
import { fetchVoiceParsing } from "../services/api";
import {
  Mic,
  MicOff,
  Sparkles,
  CheckCircle,
  BrainCircuit,
  CalendarDays,
  Clock,
  ArrowRight,
  Bookmark
} from "lucide-react";

interface VoiceViewProps {
  onAddParsedTask: (taskData: {
    title: string;
    description: string;
    category: string;
    urgency: "low" | "medium" | "high";
    importance: "low" | "medium" | "high";
    effort: number;
    deadline: string;
    subtasksBreakdown: string[];
  }) => Promise<void>;
}

// Declare SpeechRecognition types for TS
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

export default function VoiceView({ onAddParsedTask }: VoiceViewProps) {
  const [command, setCommand] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsedDraft, setParsedDraft] = useState<any | null>(null);

  // Quick prompt suggestions
  const suggestions = [
    "I have an interview Friday morning, high importance, takes 4 hours. Create prep plan.",
    "Draft a pitch deck due tomorrow at 8 PM. It is super urgent, takes 3 hours.",
    "Create a task to build hackathon UI due in 3 days. Urgency low, effort 6 hours."
  ];

  const handleSpeechInput = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Browser speech recognition is not supported in this environment. Please type your command in the prompt box!");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionClass() as SpeechRecognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.start();
    setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setCommand(transcript);
    };

    recognition.onerror = (err: any) => {
      console.error("Speech error:", err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const handleVoiceParse = async () => {
    if (!command.trim()) return;
    setLoading(true);
    setParsedDraft(null);

    try {
      const parsed = await fetchVoiceParsing(command);
      setParsedDraft(parsed);
    } catch (err) {
      console.error("Parsing natural language command failed:", err);
      alert("Failed to parse command. Please check server logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleInjectTask = async () => {
    if (!parsedDraft) return;
    try {
      await onAddParsedTask(parsedDraft);
      setParsedDraft(null);
      setCommand("");
      alert("AI task and subtask checklists injected successfully into your Task Board!");
    } catch (err) {
      console.error("Task injection failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242426] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans">
            Command Desk Assistant
          </h1>
          <p className="text-[10px] text-[#555] font-mono mt-1 uppercase tracking-widest font-bold">
            NATURAL LANGUAGE COMPLIANCE • AGENTIC EXTRACTIONS • SPEECH TRANSCRIPTION
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input pane */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 lg:col-span-2 space-y-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2">
            <BrainCircuit className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
            Dictate or Type Action Command
          </h3>

          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            DeadlineHero AI supports natural goal mapping. Dictate with your microphone or type your target, self-assessed importance, deadline date, and desired checklist points. Google Gemini will parse, extract, calculate and structure the data in real-time.
          </p>

          <div className="space-y-3 pt-2">
            <div className="relative">
              <textarea
                placeholder="e.g. I have a presentation due Friday at 2 PM. It's high importance, will take 4 hours to rehearse. Break it down into slides draft and practice."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="w-full h-32 bg-[#1A1A1C] border border-[#242426] rounded py-3 pl-4 pr-12 text-xs text-white placeholder-[#555] focus:outline-none resize-none font-sans"
              />
              <button
                onClick={handleSpeechInput}
                className={`absolute right-3.5 bottom-3.5 p-2 rounded border transition-all cursor-pointer ${
                  isListening
                    ? "bg-red-500/20 text-[#FF3B30] border-red-500/30 animate-pulse"
                    : "bg-[#121214] text-gray-500 border-[#242426] hover:text-white"
                }`}
                title="Dictate with microphone"
              >
                {isListening ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5" />}
              </button>
            </div>

            <button
              onClick={handleVoiceParse}
              disabled={loading || !command.trim()}
              className="w-full py-2.5 bg-[#FF3B30] hover:brightness-110 disabled:opacity-45 disabled:hover:brightness-100 text-white font-mono text-xs font-black tracking-widest rounded flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,59,48,0.2)]"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>ANALYZE NATURAL LANGUAGE COMMAND</span>
            </button>
          </div>
        </div>

        {/* Suggestion Sidebar */}
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-widest flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-blue-500" />
            Prompt Templates
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Click any pattern to pre-fill. Try dictating relative terms like 'tomorrow' or 'next week Monday':
          </p>

          <div className="space-y-2 pt-1 pr-1">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => setCommand(sug)}
                className="w-full text-left p-3 bg-[#1A1A1C] hover:bg-[#202022] border border-[#242426] rounded transition-colors cursor-pointer text-[11px] font-sans text-gray-300 leading-relaxed font-medium"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Parsed Draft Preview presentation card */}
      {parsedDraft && (
        <div className="bg-[#121214] border border-[#242426] rounded-lg p-6 space-y-4 shadow-xl animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-0.5 bg-emerald-500 h-full" />
          
          <div className="flex items-center gap-2.5 border-b border-[#242426] pb-3">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-gray-400">
              AI Extracted Goal Blueprint
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#555] uppercase tracking-wider">Calculated Goal Title</span>
                <p className="text-sm font-semibold text-white mt-1 font-sans">{parsedDraft.title}</p>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold text-[#555] uppercase tracking-wider">Strategic Context</span>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">
                  {parsedDraft.description || "No context provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#555] uppercase tracking-wider">Category</span>
                  <p className="text-xs font-semibold text-gray-300 mt-1 font-sans">{parsedDraft.category}</p>
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#555] uppercase tracking-wider">Calculated Effort</span>
                  <p className="text-xs font-semibold text-gray-300 mt-1 flex items-center gap-1 font-sans">
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                    {parsedDraft.effort} Hours
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold text-[#555] uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-gray-500" />
                  Calculated Deadline Target (Relative adjusted)
                </span>
                <p className="text-xs font-bold text-[#FF3B30] mt-1 font-mono tracking-wide">
                  {new Date(parsedDraft.deadline).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#555] uppercase tracking-wider">
                  Decomposed Checklists Milestones
                </span>
                <div className="space-y-1.5 mt-2 bg-[#1A1A1C] p-3 rounded border border-[#242426]">
                  {parsedDraft.subtasksBreakdown.map((item: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2.5 p-1 text-xs text-gray-300 font-sans font-medium"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 font-mono font-bold text-xs">
                <button
                  onClick={() => setParsedDraft(null)}
                  className="px-4 py-2 bg-[#1A1A1C] border border-[#242426] text-gray-400 hover:text-white rounded cursor-pointer"
                >
                  DISCARD DRAFT
                </button>
                <button
                  onClick={handleInjectTask}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  INJECT GOAL TO CONSOLE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
