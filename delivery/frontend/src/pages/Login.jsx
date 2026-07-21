import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import QualityPulse from "../components/QualityPulse";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Login() {
  const { login, loginWithGoogle, status } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    if (!username || !password) {
      setLocalError("Enter both a username/email and a password.");
      return;
    }
    const ok = await login(username, password);
    if (ok) {
      toast.success("Signed in successfully.");
      navigate("/", { replace: true });
    } else {
      setLocalError("Those credentials didn't work. Check your username/email and password and try again.");
    }
  }

  async function handleGoogleCredential(credential) {
    setLocalError(null);
    const ok = await loginWithGoogle(credential);
    if (ok) {
      toast.success("Signed in with Google.");
      navigate("/", { replace: true });
    } else {
      setLocalError("Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-bg dark:bg-[#0F0D1A]">
      <div className="hidden lg:flex flex-col justify-between bg-panel text-white px-14 py-12 relative overflow-hidden">
        <div className="flex items-center gap-2.5 relative z-10">
          <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">
            <rect width="100" height="100" rx="24" fill="#7C5CFC" />
            <path d="M50 22 L58 42 L50 50 L42 42 Z" fill="white" />
            <path d="M50 50 L58 58 L50 78 L42 58 Z" fill="white" fillOpacity="0.7" />
          </svg>
          <span className="font-display font-semibold text-xl tracking-tight">InsightAI</span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl leading-snug font-semibold">
            Every dataset has a pulse. <span className="text-signal">See it</span> before you trust it.
          </p>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Upload a spreadsheet and InsightAI scores completeness, flags duplicates, charts
            the shape of your data, and writes the summary for you.
          </p>
          <div className="mt-10 bg-panelSoft rounded-xl2 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/40">Quality pulse</span>
              <span className="font-mono text-sm text-signal">92.4%</span>
            </div>
            <QualityPulse score={92.4} missing={12} duplicates={4} rows={2000} size="lg" />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">© {new Date().getFullYear()} InsightAI</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true">
              <rect width="100" height="100" rx="24" fill="#7C5CFC" />
              <path d="M50 22 L58 42 L50 50 L42 42 Z" fill="white" />
              <path d="M50 50 L58 58 L50 78 L42 58 Z" fill="white" fillOpacity="0.7" />
            </svg>
            <span className="font-display font-semibold text-lg dark:text-white">InsightAI</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">Sign in</h1>
          <p className="mt-1.5 text-sm text-ink-soft dark:text-white/50">Use your account, or continue with Google.</p>

          <div className="mt-6">
            <GoogleSignInButton onCredential={handleGoogleCredential} />
          </div>

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-border dark:bg-white/10" />
            <span className="text-xs text-ink-faint dark:text-white/30">or</span>
            <span className="h-px flex-1 bg-border dark:bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
                Username or email
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-white/30 focus-ring"
                placeholder="admin"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-white/30 focus-ring"
                placeholder="••••••••"
              />
            </div>

            {localError && (
              <p className="text-sm text-bad bg-bad/5 border border-bad/20 rounded-lg px-3 py-2">{localError}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60 focus-ring"
            >
              {status === "loading" ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-soft dark:text-white/50 text-center">
            New here?{" "}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-dark focus-ring rounded">
              Create an account
            </Link>
          </p>

          <p className="mt-4 text-xs text-ink-faint dark:text-white/30 text-center">
            Demo credentials: <span className="font-mono">admin</span> / <span className="font-mono">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
