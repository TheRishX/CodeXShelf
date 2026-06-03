import React, { useState, useEffect } from 'react';
import { LogIn, Key, Sparkles, AlertCircle, ShieldCheck, Globe, Copy, Check, ExternalLink, HelpCircle, RefreshCw, ChevronDown, ChevronUp, Laptop } from 'lucide-react';
import { CustomUser } from '../types';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
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
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  // Auto-handle redirect result on component mount if coming back from redirect login
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          onLoginSuccess({
            email: user.email || '',
            name: user.displayName || 'Rish',
            picture: user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.displayName || 'Rish')}`,
            isAuthenticated: true,
            uid: user.uid
          });
        }
      } catch (err: any) {
        console.error("Firebase Auth Redirect result retrieval error:", err);
        // Do not force show big warning block unless user active action fails, but print code
      }
    };
    checkRedirectResult();
  }, [onLoginSuccess]);

  const handleGoogleSignInPopup = async () => {
    setLoading(true);
    setError("");
    setShowTroubleshooter(false);
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
      console.error("Firebase Auth Sign-In Blocked or Failed:", err);
      setError(err.message || String(err));
      setShowTroubleshooter(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInWithRedirect = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      console.error("Firebase Auth Redirect Initiating Error:", err);
      setError("Page Redirect login was blocked or failed to launch. " + (err.message || String(err)));
      setShowTroubleshooter(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setError("Please specify a valid email address.");
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
    }, 850);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(window.location.hostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300 py-12">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-2xl p-8 relative overflow-hidden transition-colors duration-300">
        
        {/* Subtle glowing ambient effects */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg text-white mb-4">
            <Laptop className="w-7 h-7" />
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
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex flex-col gap-2 text-xs text-red-655 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                <span className="font-extrabold">Google Sign-In Failed:</span>
              </div>
              <p className="font-mono text-[11px] bg-white/50 dark:bg-slate-950/50 p-2 rounded-lg border border-red-100 dark:border-red-950/40 select-text overflow-x-auto">
                {error.includes("popup-closed-by-user") 
                  ? "Google Sign-In window was closed before finishing the login process." 
                  : error.includes("unauthorized-domain") 
                    ? "Firebase Unauthorized Domain! Your host is not allowlisted." 
                    : error}
              </p>
            </div>
          )}

          {/* Troubleshooter helper instructions */}
          {showTroubleshooter && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold">
                <HelpCircle className="w-4.5 h-4.5" />
                <span>Troubleshoots & Fixes:</span>
              </div>

              {/* Guide steps */}
              <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
                <li>
                  <span className="font-extrabold text-slate-900 dark:text-white">Authorized Domains Guide:</span> If you are hosting on Vercel (<span className="font-semibold select-all text-blue-600 dark:text-blue-400">{window.location.hostname}</span>) or testing on a custom domain, you MUST register it in your Firebase Console.
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                    <span className="bg-slate-100 dark:bg-slate-805 px-2 py-1 rounded select-all border border-slate-200/50 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                      {window.location.hostname}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyToClipboard}
                      className="px-2 py-1 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 font-sans font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied' : 'Copy Host'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    ➔ Go to your <span className="font-semibold">Firebase Console</span> &gt; <span className="font-semibold">Authentication</span> &gt; <span className="font-semibold">Settings</span> &gt; <span className="font-semibold">Authorized domains</span> and add this host.
                  </p>
                </li>

                <li>
                  <span className="font-extrabold text-slate-900 dark:text-white">Pop-Up Blockers:</span> Some browsers block pop-ups within iframes or preview domains. Try our direct redirect sequence or open carefully in a standalone tab!
                </li>
              </ol>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSignInWithRedirect}
                  className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-955/40 dark:hover:bg-blue-950 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                  <span>Try Redirect Flow (No Pop-ups)</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Action Button: standard modern pop-up log in */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignInPopup}
              disabled={loading}
              className="w-full relative flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 hover:bg-slate-850 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-xl font-bold tracking-wide shadow-md active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer border border-slate-800 dark:border-transparent text-sm"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Connecting Securely...</span>
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

            {/* Quick Link to launch in a new tab if iframe blocks popup */}
            <div className="text-center">
              <a 
                href={window.location.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline bg-blue-50/20 dark:bg-slate-950/20 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-805"
              >
                <span>Popups blocked? Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Collapsible Simulated Login segment, beautifully embedded */}
          <div className="border-t border-slate-150 dark:border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={() => setShowSandbox(!showSandbox)}
              className="w-full flex items-center justify-between text-[11px] font-mono font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase cursor-pointer hover:text-slate-650 dark:hover:text-slate-300 py-1"
            >
              <span>or use simulated sandbox login</span>
              {showSandbox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSandbox && (
              <form onSubmit={handleOAuthSimulate} className="space-y-4 mt-4 animate-in slide-in-from-top-3 duration-150 text-left">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-805 text-[11px] text-slate-500 leading-relaxed">
                  💡 Use this simulated bypass if your security network completely blocks external Firebase auth servers. Data will save to local storage as fallback.
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-550 uppercase mb-1.5 font-mono">
                    Academic Name
                  </label>
                  <input
                    type="text"
                    value={nameInput || ''}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Rish"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-555/10 focus:border-blue-500 transition-all text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-550 uppercase mb-1.5 font-mono">
                    Google Sandbox Email
                  </label>
                  <input
                    type="email"
                    value={emailInput || ''}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="therishx@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-555/10 focus:border-blue-500 transition-all text-xs font-semibold"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs tracking-wider border border-slate-200/50 dark:border-slate-705 transition-all cursor-pointer active:scale-[0.99]"
                >
                  Simulate Academic Bypass Login
                </button>
              </form>
            )}
          </div>
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
