import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  AlertTriangle,
  Timer,
  Compass,
  Mic,
  Bookmark,
  LogOut,
  Flame,
  Clock,
  Award
} from "lucide-react";
import { auth } from "../lib/firebase";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail: string | null;
  focusHours: number;
  streakDays: number;
  productivityScore: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  userEmail,
  focusHours,
  streakDays,
  productivityScore
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: "Task Board", icon: CheckSquare },
    { id: "scheduler", label: "AI Calendar", icon: Calendar },
    { id: "rescue", label: "Rescue Mode", icon: AlertTriangle, badge: "AI" },
    { id: "focus", label: "Focus Engine", icon: Timer },
    { id: "coach", label: "Pro Coach", icon: Compass },
    { id: "voice", label: "Command Desk", icon: Mic },
    { id: "reflections", label: "Reflection Lab", icon: Bookmark },
  ];

  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <aside className="w-64 bg-[#0F0F11] border-r border-[#242426] flex flex-col justify-between h-screen fixed top-0 left-0 z-20 font-sans">
      <div className="p-6 flex-1 flex flex-col overflow-y-auto">
        {/* App Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-3.5 h-3.5 bg-[#FF3B30] rounded-full animate-pulse"></div>
          <div>
            <h2 className="text-sm font-mono tracking-widest text-[#888] uppercase leading-none">
              DEADLINEHERO <span className="text-rose-500 font-bold">AI</span>
            </h2>
            <p className="text-[10px] text-[#555] font-mono font-bold mt-1 uppercase">SYSTEM NODE v1.0</p>
          </div>
        </div>

        {/* User Mini Analytics Overview */}
        <div className="mb-6 p-4 bg-[#121214] border border-[#242426] rounded space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#888] flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500/10" />
              STREAK
            </span>
            <span className="text-orange-400 font-bold">{streakDays} DAYS</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#888] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              FOCUS TIME
            </span>
            <span className="text-blue-400 font-bold">{focusHours.toFixed(1)}H</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#888] flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-rose-500" />
              AI SCORE
            </span>
            <span className="text-rose-500 font-bold">{productivityScore}/100</span>
          </div>
        </div>

        {/* Navigation Menus */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-mono font-bold tracking-widest text-[#555] uppercase mb-3">
            INTERFACE CONTROL
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium tracking-wide transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-[#1A1A1C] text-white border-l-2 border-rose-500 font-semibold"
                    : "text-gray-400 hover:bg-[#151517] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-rose-500" : "text-gray-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-[#FF3B30]/15 text-[#FF3B30] text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold tracking-wider animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Account details */}
      <div className="p-4 border-t border-[#242426] bg-[#09090B]">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate flex-1">
            <p className="text-[10px] font-mono text-[#555] uppercase font-bold">USER_ID</p>
            <p className="text-xs font-medium text-gray-300 truncate font-mono" title={userEmail || "Anonymous Mode"}>
              {userEmail ? userEmail.split("@")[0].toUpperCase() : "GDE_ARCHITECT_042"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
