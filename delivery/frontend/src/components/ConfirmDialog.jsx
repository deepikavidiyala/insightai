import React, { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", danger, onConfirm, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#1B1830] border border-transparent dark:border-white/10 rounded-xl2 shadow-panel max-w-sm w-full p-6 animate-fadeUp">
        <h2 className="font-display text-lg font-semibold text-ink dark:text-white">{title}</h2>
        {description && <p className="mt-2 text-sm text-ink-soft dark:text-white/50">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink-soft dark:text-white/60 hover:bg-bg dark:hover:bg-white/5 focus-ring"
          >
            Cancel
          </button>
          <button
            ref={ref}
            onClick={onConfirm}
            className={[
              "px-4 py-2 rounded-lg text-sm font-semibold text-white focus-ring",
              danger ? "bg-bad hover:bg-bad/90" : "bg-primary hover:bg-primary-dark",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
