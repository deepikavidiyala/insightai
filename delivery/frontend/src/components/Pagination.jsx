import React from "react";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-2">
      <p className="text-sm text-ink-soft dark:text-white/50">
        Page <span className="font-mono">{page}</span> of <span className="font-mono">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] text-ink dark:text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg dark:hover:bg-white/5 focus-ring"
        >
          Previous
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-border dark:border-white/10 bg-white dark:bg-[#1B1830] text-ink dark:text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg dark:hover:bg-white/5 focus-ring"
        >
          Next
        </button>
      </div>
    </div>
  );
}
