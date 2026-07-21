import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/upload", label: "Upload Data" },
  { to: "/history", label: "History" },
  { to: "/settings", label: "Settings" },
];

function NavIcon({ label }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 };
  if (label === "Dashboard")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="5" rx="1.5" />
        <rect x="13" y="10" width="8" height="11" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
      </svg>
    );
  if (label === "Upload Data")
    return (
      <svg {...common}>
        <path d="M12 3v12" strokeLinecap="round" />
        <path d="M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
      </svg>
    );
  if (label === "History")
    return (
      <svg {...common}>
        <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
        <path d="M3 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function Sidebar({ onNavigate }) {
  const { logout } = useAuth();

  return (
    <div className="h-full flex flex-col bg-panel text-white/90">
      <div className="px-5 pt-6 pb-6 flex items-center gap-2.5">
        <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">
          <rect width="100" height="100" rx="24" fill="#7C5CFC" />
          <path d="M50 22 L58 42 L50 50 L42 42 Z" fill="white" />
          <path d="M50 50 L58 58 L50 78 L42 58 Z" fill="white" fillOpacity="0.7" />
        </svg>
        <span className="font-display font-semibold text-lg tracking-tight">InsightAI</span>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors focus-ring",
                isActive ? "bg-primary text-white shadow-[0_8px_20px_-6px_rgba(124,92,252,0.6)]" : "text-white/55 hover:text-white hover:bg-white/5",
              ].join(" ")
            }
          >
            <NavIcon label={link.label} />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-white/10 mt-3">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 transition-colors focus-ring"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}
