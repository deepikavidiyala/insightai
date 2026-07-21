import React, { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar";
import FileDropzone from "../components/FileDropzone";
import QualityPulse from "../components/QualityPulse";
import Card from "../components/Card";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatNumber } from "../utils/format";

export default function Upload() {
  const { openMobileNav } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setResult(null);
    try {
      const { data } = await api.uploadDataset(file, setProgress);
      setResult(data);
      toast.success("Dataset uploaded and analyzed.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Topbar
        title="Upload Dataset"
        subtitle="Upload your CSV or Excel file to get started"
        onMenuClick={openMobileNav}
      />

      <div className="px-5 sm:px-8 py-6 max-w-3xl space-y-6">
        <Card className="p-8">
          <FileDropzone file={file} onSelect={(f) => { setFile(f); setResult(null); }} disabled={uploading} />

          {file && !uploading && !result && (
            <div className="mt-5 flex items-center justify-between gap-4 bg-good/5 border border-good/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-good/10 text-good flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                    <path d="M14 3v5h5" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-ink dark:text-white truncate">{file.name}</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-good shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {uploading && (
            <div className="mt-5">
              <div className="h-2 rounded-full bg-border dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-ink-soft dark:text-white/50">Uploading and profiling… {progress}%</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors focus-ring"
            >
              {uploading ? "Analyzing…" : "Analyze dataset"}
            </button>
            {file && !uploading && (
              <button
                onClick={() => { setFile(null); setResult(null); }}
                className="text-sm font-medium text-ink-soft dark:text-white/50 hover:text-ink dark:hover:text-white px-3 focus-ring rounded"
              >
                Clear
              </button>
            )}
          </div>
        </Card>

        {result && (
          <Card className="p-6 animate-fadeUp">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40">Analysis complete</p>
                <h2 className="font-display text-lg font-semibold text-ink dark:text-white mt-1">{result.filename}</h2>
              </div>
              <QualityPulse
                score={result.quality_score}
                missing={result.missing_values}
                duplicates={result.duplicates}
                rows={result.rows}
                size="lg"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              {[
                ["Rows", formatNumber(result.rows)],
                ["Columns", formatNumber(result.columns)],
                ["Missing values", formatNumber(result.missing_values)],
                ["Quality score", `${result.quality_score}%`],
              ].map(([label, value]) => (
                <div key={label} className="bg-bg dark:bg-white/5 rounded-lg p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40">{label}</p>
                  <p className="font-mono text-lg font-semibold text-ink dark:text-white mt-1 tabular">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate(`/dataset/${result.file_id}`)}
                className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors focus-ring"
              >
                View full analysis →
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
