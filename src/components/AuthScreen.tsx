import React, { useState } from "react";
import { auth } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { KeyRound, Mail, Sparkles, LogIn, ArrowRight } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [operationNotAllowedProvider, setOperationNotAllowedProvider] = useState<"email" | "google" | "anonymous" | null>(null);

  const handleGoogleAuth = async () => {
    setError("");
    setOperationNotAllowedProvider(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      const errCode = err?.code || "";
      const errMsg = err?.message || "";
      if (errCode === "auth/operation-not-allowed" || errMsg.includes("operation-not-allowed")) {
        setOperationNotAllowedProvider("google");
        setError("Firebase Error (auth/operation-not-allowed): The Google sign-in provider is currently disabled in your Firebase console.");
      } else {
        setError(err.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setOperationNotAllowedProvider(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      const errCode = err?.code || "";
      const errMsg = err?.message || "";
      if (errCode === "auth/operation-not-allowed" || errMsg.includes("operation-not-allowed")) {
        setOperationNotAllowedProvider("email");
        setError("Firebase Error (auth/operation-not-allowed): The Email/Password sign-in provider is currently disabled in your Firebase console.");
      } else {
        setError(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousAuth = async () => {
    setError("");
    setOperationNotAllowedProvider(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
      onAuthSuccess();
    } catch (err: any) {
      console.error(err);
      const errCode = err?.code || "";
      const errMsg = err?.message || "";
      if (errCode === "auth/operation-not-allowed" || errMsg.includes("operation-not-allowed")) {
        setOperationNotAllowedProvider("anonymous");
        setError("Firebase Error (auth/operation-not-allowed): The Anonymous sign-in provider is currently disabled in your Firebase console.");
      } else {
        setError("Failed to boot demo mode. Please verify Firebase connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-gray-100 flex flex-col justify-center items-center p-4 relative selection:bg-red-500/30 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#121214] border border-[#242426] rounded-lg p-8 shadow-2xl relative z-10 transition-all duration-300">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-[#FF3B30] to-blue-600 rounded-lg shadow-[0_0_20px_rgba(255,59,48,0.2)] mb-4 animate-pulse">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight font-sans text-white">
            DeadlineHero AI
          </h1>
          <p className="text-[10px] text-gray-400 mt-2 tracking-widest font-mono uppercase font-bold">
            THE COMPANION THAT HELPS YOU FINISH
          </p>
        </div>

        {error && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-red-950/20 border border-red-700/30 rounded text-[#FF3B30] text-xs font-mono font-bold leading-relaxed">
              {error}
            </div>

            {operationNotAllowedProvider && (
              <div className="p-4 bg-amber-950/20 border border-amber-600/30 rounded text-amber-300 text-xs font-mono space-y-3">
                <div className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                  💡 Firebase Console Troubleshooting Guide
                </div>
                <p className="leading-relaxed text-gray-300">
                  The <span className="text-white font-semibold">{operationNotAllowedProvider === "email" ? "Email/Password" : operationNotAllowedProvider === "google" ? "Google" : "Anonymous"}</span> sign-in provider is disabled for the Firebase project <span className="text-white font-bold">mindmirrorai</span>.
                </p>
                <div className="space-y-1.5 text-gray-300 pl-1 text-[11px]">
                  <div>1. Open the Firebase Authentication Console:</div>
                  <a 
                    href="https://console.firebase.google.com/project/mindmirrorai/authentication/providers"
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="text-blue-400 hover:underline break-all block py-1 px-2 bg-[#1C1A16] rounded border border-amber-500/10 font-sans font-medium"
                  >
                    https://console.firebase.google.com/project/mindmirrorai/authentication/providers
                  </a>
                  <div>2. Click on the <span className="text-white font-semibold">Sign-in method</span> tab.</div>
                  <div>3. Click <span className="text-white font-semibold">Add new provider</span>.</div>
                  <div>4. Select <span className="text-white font-semibold">{operationNotAllowedProvider === "email" ? "Email/Password" : operationNotAllowedProvider === "google" ? "Google" : "Anonymous"}</span>.</div>
                  <div>5. Click the <span className="text-white font-semibold">Enable</span> toggle and hit <span className="text-white font-semibold">Save</span>.</div>
                </div>
                <p className="text-[10px] text-amber-500/80 italic leading-normal pt-1 border-t border-amber-500/10">
                  Once enabled in your Firebase project Console, click sign-in or register again to access the dashboard!
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono font-bold text-[#555] mb-2 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-3 pl-11 pr-4 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-[#555] mb-2 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1A1A1C] border border-[#242426] rounded py-3 pl-11 pr-4 text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF3B30] hover:brightness-110 disabled:opacity-45 disabled:hover:brightness-100 text-white font-mono text-xs font-black tracking-widest py-3 px-4 rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(255,59,48,0.2)]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>{isSignUp ? "CREATE PRO ACCOUNT" : "ACCESS CONSOLE"}</span>
              </>
            )}
          </button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#242426]"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono font-bold tracking-wider">
            <span className="bg-[#121214] px-3 text-[#555]">Or Continue With</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-[#1A1A1C] hover:bg-[#202022] text-white border border-[#242426] font-mono text-xs font-bold py-3 px-4 rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.02)]"
        >
          <GoogleIcon />
          <span>SIGN IN WITH GOOGLE</span>
        </button>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[10px] text-red-400 hover:text-red-300 font-mono font-bold uppercase tracking-wider focus:outline-none transition-colors"
          >
            {isSignUp
              ? "Already registered? Sign In Instead"
              : "Need an account? Sign Up Instantly"}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#242426]"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono font-bold tracking-wider">
            <span className="bg-[#121214] px-3 text-[#555]">Or Evaluate Instantly</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAnonymousAuth}
          disabled={loading}
          className="w-full bg-[#1A1A1C] hover:bg-[#202022] text-gray-300 border border-[#242426] font-mono text-xs font-bold py-3 px-4 rounded transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Launch Demo Sandbox</span>
          <ArrowRight className="h-3 w-3" />
        </button>

        <div className="mt-8 pt-6 border-t border-[#242426] text-center">
          <p className="text-[10px] text-[#555] leading-relaxed font-mono font-bold uppercase tracking-widest">
            SECURE SANDBOX ENVIRONMENT • FIREBASE POWERED • DATA ISOLATION
          </p>
        </div>
      </div>
    </div>
  );
}
