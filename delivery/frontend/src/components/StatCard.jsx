import React from "react";
import { Link } from "react-router-dom";
import Card from "./Card";

const ACCENTS = {
  primary: { bar: "bg-primary", chip: "bg-primary-light dark:bg-primary/20 text-primary" },
  good: { bar: "bg-good", chip: "bg-good/10 text-good" },
  signal: { bar: "bg-signal", chip: "bg-signal-light dark:bg-signal/20 text-signal" },
  blue: { bar: "bg-sky-500", chip: "bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400" },
};

export default function StatCard({ label, value, suffix, accent = "primary", icon, footer, to }) {
  const a = ACCENTS[accent] || ACCENTS.primary;
  return (
    <Card className="p-5 flex flex-col gap-3 animate-fadeUp overflow-hidden relative">
      <span className={`absolute top-0 left-0 right-0 h-1 ${a.bar}`} aria-hidden="true" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40">{label}</span>
        {icon && <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.chip}`}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-3xl font-semibold tabular text-ink dark:text-white">{value}</span>
        {suffix && <span className="text-sm text-ink-soft dark:text-white/50">{suffix}</span>}
      </div>
      {footer && to && (
        <Link
          to={to}
          className="text-xs font-medium text-primary hover:text-primary-dark focus-ring rounded w-fit -mt-1"
        >
          {footer}
        </Link>
      )}
      {footer && !to && <p className="text-xs text-ink-faint dark:text-white/40">{footer}</p>}
    </Card>
  );
}
