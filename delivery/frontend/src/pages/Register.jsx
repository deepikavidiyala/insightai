import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import QualityPulse from "../components/QualityPulse";
import GoogleSignInButton from "../components/GoogleSignInButton";

export default function Register() {
  const { register, loginWithGoogle, status } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);

    if (!username || !email || !password) {
      setLocalError("Fill in username, email, and password.");
      return;
    }
    if (username.trim().length < 3) {
      setLocalError("Username must be at least 3 characters.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setLocalError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords don't match.");
      return;
    }

    const ok = await register(username.trim(), email.trim(), password);
    if (ok) {
      toast.success("Account created. Welcome to InsightAI!");
      navigate("/", { replace: true });
    } else {
      setLocalError("Couldn't create that account. The username or email might already be taken.");
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
            Bring your own data. <span className="text-signal">We'll find</span> what matters in it.
          </p>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Create a free workspace account to start uploading datasets, scoring data quality,
            and generating AI-written summaries in minutes.
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

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true">
              <rect width="100" height="100" rx="24" fill="#7C5CFC" />
              <path d="M50 22 L58 42 L50 50 L42 42 Z" fill="white" />
              <path d="M50 50 L58 58 L50 78 L42 58 Z" fill="white" fillOpacity="0.7" />
            </svg>
            <span className="font-display font-semibold text-lg dark:text-white">InsightAI</span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-ink dark:text-white">Create your account</h1>
          <p className="mt-1.5 text-sm text-ink-soft dark:text-white/50">Free to start — no credit card required.</p>

          <div className="mt-6">
            <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
          </div>

          <div className="flex items-center gap-3 my-6">
            <span className="h-px flex-1 bg-border dark:bg-white/10" />
            <span className="text-xs text-ink-faint dark:text-white/30">or</span>
            <span className="h-px flex-1 bg-border dark:bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-white/30 focus-ring"
                placeholder="deepika"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-white/30 focus-ring"
                placeholder="deepika@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] px-3.5 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-white/30 focus-ring"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {status === "loading" ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-ink-soft dark:text-white/50 text-center">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-dark focus-ring rounded">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
