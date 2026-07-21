import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ title, subtitle, onMenuClick, action }) {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const displayName = user?.username || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 bg-bg/85 dark:bg-[#0F0D1A]/85 backdrop-blur border-b border-border dark:border-white/10">
      <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="lg:hidden shrink-0 w-9 h-9 rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] flex items-center justify-center focus-ring"
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink dark:text-white truncate">{title}</h1>
            {subtitle && <p className="text-sm text-ink-soft dark:text-white/50 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {action}

          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="w-9 h-9 rounded-full border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] flex items-center justify-center text-ink-soft dark:text-white/60 hover:text-primary transition-colors focus-ring"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <Link
            to="/settings"
            className="flex items-center gap-2.5 sm:pl-3 sm:border-l border-border dark:border-white/10 hover:opacity-80 transition-opacity focus-ring rounded-lg"
            aria-label="Open your profile"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover border border-border dark:border-white/10"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary-light dark:bg-primary/20 text-primary flex items-center justify-center font-display font-semibold text-sm">
                {initial}
              </div>
            )}
            <div className="leading-tight hidden sm:block">
              <p className="text-sm font-semibold text-ink dark:text-white">{displayName}</p>
              <p className="text-xs text-ink-faint dark:text-white/40">{user?.email || "Workspace member"}</p>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
