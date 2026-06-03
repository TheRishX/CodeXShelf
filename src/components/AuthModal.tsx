import React, { useState } from 'react';
import { LogIn, Key, Sparkles, AlertCircle, ShieldCheck, Globe } from 'lucide-react';
import { CustomUser } from '../types';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthModalProps {
  onLoginSuccess: (user: CustomUser) => void;
  userEmail?: string;
}

export function AuthModal({ onLoginSuccess, userEmail = "therishx@gmail.com" }: AuthModalProps) {
  const [emailInput, setEmailInput] = useState(userEmail);
  const [nameInput, setNameInput] = useState("Rish");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onLoginSuccess({
        email: user.email || '',
        name: user.displayName || 'Rish',
        picture: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.displayName || 'Rish')}`,
        isAuthenticated: true,
        uid: user.uid
      });
    } catch (err: any) {
      console.error("Firebase Auth Sign-In Error:", err);
      setError("Google Sign-In failed or was closed. Please check pop-up blocker settings or use the Quick Sandbox below.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setError("Please specify a valid academic email address.");
      return;
    }
    setLoading(true);
    setError("");

    // Simulate Google Sign-In with realistic delays and visuals
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        email: emailInput,
        name: nameInput || "Rish",
        picture: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nameInput)}`,
        isAuthenticated: true,
        uid: "mock-sandbox-uid-" + emailInput.replace(/[^a-zA-Z0-9]/g, '-')
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-2xl p-8 relative overflow-hidden transition-colors duration-300">
        
        {/* Subtle glowing ambient effects */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg text-white mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold font-sans tracking-tight text-slate-900 dark:text-white">
            CodeXshelf
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono uppercase tracking-widest font-bold">
            ONLINE CODING VAULT
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-slate-600 dark:text-slate-350 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-slate-800 dark:text-slate-200">Production Auth Synced:</span> Logging in securely via Google synchronizes all your topics, notes, code quiz trials, and bookmarks across all your devices instantly. Only online mode is active for Google accounts.
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-655 dark:text-red-450">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Real Secure Google Login via Firebase */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full relative flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border border-slate-800 dark:border-transparent text-sm"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Connecting to Google...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22c.87-2.6 3.3-4.53 6.16-4.53c1.55 0 2.94.54 4.02 1.62l3.02-3.02C16.42 4.14 13.9 3 12 3 7.7 3 3.99 5.47 2.18 9.16l3.66 2.84c.87-1.9 3.08-3.3 5.6-3.3c1.5 0 2.85.5 3.86 1.35l2.9-2.9C16.59 5.35 14.43 4.5 12 4.5c-3.1 0-5.8 1.7-7.2 4.3l3.6 2.8c.6-1.5 1.8-2.6 3.4-3.1l-.8 2.5z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-400 dark:text-slate-555 font-mono flex items-center justify-center gap-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Secure Firebase Live Synchronization Hub</span>
          </p>
        </div>
      </div>
    </div>
  );
}
