import React, { useCallback, useRef, useState } from "react";
import { formatBytes } from "../utils/format";

const ACCEPTED = [".csv", ".xlsx", ".xls", ".json"];
const MAX_SIZE = 10 * 1024 * 1024;

export default function FileDropzone({ file, onSelect, disabled }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const validate = useCallback((f) => {
    if (!f) return null;
    const ext = `.${f.name.split(".").pop().toLowerCase()}`;
    if (!ACCEPTED.includes(ext)) {
      return `Unsupported file type "${ext}". Use CSV, XLSX, XLS, or JSON.`;
    }
    if (f.size === 0) return "This file is empty.";
    if (f.size > MAX_SIZE) return "File is larger than 10 MB.";
    return null;
  }, []);

  function handleFiles(fileList) {
    const f = fileList?.[0];
    if (!f) return;
    const err = validate(f);
    setError(err);
    if (!err) onSelect(f);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
        }}
        className={[
          "rounded-xl2 border-2 border-dashed p-12 text-center transition-colors cursor-pointer focus-ring",
          disabled ? "opacity-60 cursor-not-allowed" : "",
          dragActive
            ? "border-primary bg-primary-light dark:bg-primary/10"
            : "border-border dark:border-white/15 bg-primary-light/40 dark:bg-white/[0.02] hover:border-primary/50",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="mx-auto w-14 h-14 rounded-full bg-primary-light dark:bg-primary/20 text-primary flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v12" strokeLinecap="round" />
            <path d="M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
          </svg>
        </div>
        {file ? (
          <div>
            <p className="font-medium text-ink dark:text-white">{file.name}</p>
            <p className="text-sm text-ink-soft dark:text-white/50 mt-1">{formatBytes(file.size)} · ready to analyze</p>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-ink dark:text-white">Drag & Drop your file here</p>
            <p className="text-sm text-ink-soft dark:text-white/50 mt-1">or</p>
            <span className="inline-block mt-3 bg-primary text-white text-sm font-semibold px-5 py-2 rounded-lg">
              Choose File
            </span>
            <p className="text-xs text-ink-faint dark:text-white/40 mt-4">
              Supported formats: CSV, Excel (.xlsx), JSON · up to 10 MB
            </p>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
