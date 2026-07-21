import React from "react";

export default function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-border dark:border-white/15 rounded-xl2 bg-white/60 dark:bg-white/[0.02]">
      {icon && <div className="mb-4 text-primary">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-ink dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-soft dark:text-white/50 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
