import React, { useState } from 'react';
import { LogIn, Key, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { CustomUser } from '../types';

interface AuthModalProps {
  onLoginSuccess: (user: CustomUser) => void;
  userEmail?: string;
}

export function AuthModal({ onLoginSuccess, userEmail = "therishx@gmail.com" }: AuthModalProps) {
  const [emailInput, setEmailInput] = useState(userEmail);
  const [nameInput, setNameInput] = useState("Rish");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        isAuthenticated: true
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
            CodeXShelf
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono uppercase tracking-widest font-bold">
            YOUR DIGITAL CODING VAULT
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-150 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Google Auth Integrated:</span> CodeXShelf simplifies resource organization. Log in securely to sync offline progress.
            </div>
          </div>

          <form onSubmit={handleOAuthSimulate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                Academic Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Rish"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-555/10 focus:border-blue-500 transition-all font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 font-mono">
                Google Account Email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="therishx@gmail.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-555/10 focus:border-blue-500 transition-all font-sans"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-650 dark:text-red-400">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl font-semibold tracking-wide shadow active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying OAuth token...</span>
                </div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 shrink-0" />
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Powered by high-security workspace sandboxing APIs
          </p>
        </div>
      </div>
    </div>
  );
}
