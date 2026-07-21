import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import Topbar from "../components/Topbar";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ChartCard from "../components/ChartCard";
import QualityPulse from "../components/QualityPulse";
import ConfirmDialog from "../components/ConfirmDialog";
import Card from "../components/Card";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { fileExtension, formatDate, formatNumber, qualityTier } from "../utils/format";

const TABS = ["Overview", "Visualizations", "AI Insights", "Reports"];

function splitInsights(insights) {
  if (!insights) return [];
  if (Array.isArray(insights)) return insights.filter(Boolean);
  // Backward compatibility with older cached insights stored as one string.
  return insights
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s]*[\d]+[.)]\s*/, "").replace(/^[-•*✅✓]\s*/, "").trim())
    .filter(Boolean);
}

export default function DatasetDetail() {
  const { fileId } = useParams();
  const { openMobileNav } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("Overview");

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [charts, setCharts] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  const [insights, setInsights] = useState(null);
  const [generating, setGenerating] = useState(false);

  const [reportLoading, setReportLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDataset = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data } = await api.getAnalytics(fileId);
      setDataset(data);
    } catch (err) {
      setNotFound(true);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const { data } = await api.getCharts(fileId);
      setCharts(data.charts || []);
    } catch (err) {
      toast.error(`Couldn't load charts: ${err.message}`);
    } finally {
      setChartsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  useEffect(() => {
    loadDataset();
    loadCharts();
  }, [loadDataset, loadCharts]);

  const insightChunks = useMemo(() => splitInsights(insights), [insights]);

  async function handleGenerateInsights() {
    setGenerating(true);
    try {
      const { data } = await api.generateInsights(fileId);
      setInsights(data.insights);
      toast.success("AI insights generated.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleReport(mode) {
    const setLoadingFn = mode === "preview" ? setPreviewLoading : setReportLoading;
    setLoadingFn(true);
    try {
      const url = await api.getReportUrl(fileId);
      if (mode === "preview") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dataset?.filename || fileId}-report.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      toast.error(`Couldn't generate report: ${err.message}`);
    } finally {
      setLoadingFn(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.deleteDataset(fileId);
      toast.success("Dataset deleted.");
      navigate("/history", { replace: true });
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Topbar title="Dataset" onMenuClick={openMobileNav} />
        <div className="py-24 flex justify-center">
          <Spinner label="Loading analysis…" />
        </div>
      </div>
    );
  }

  if (notFound || !dataset) {
    return (
      <div>
        <Topbar title="Dataset not found" onMenuClick={openMobileNav} />
        <div className="p-6">
          <EmptyState
            title="We couldn't find this dataset"
            description="It may have been deleted, or the link is incorrect."
            action={
              <button
                onClick={() => navigate("/history")}
                className="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors focus-ring"
              >
                Back to history
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const tier = qualityTier(dataset.quality_score ?? 0);

  return (
    <div>
      <Topbar
        title={dataset.filename}
        subtitle={`${fileExtension(dataset.filename)} · uploaded ${formatDate(dataset.upload_date)}`}
        onMenuClick={openMobileNav}
        action={
          <button
            onClick={() => setConfirmOpen(true)}
            className="text-sm font-semibold px-4 py-2.5 rounded-lg border border-bad/30 text-bad bg-white dark:bg-transparent hover:bg-bad/5 transition-colors focus-ring"
          >
            Delete
          </button>
        }
      />

      <div className="px-5 sm:px-8 pt-4">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-ink-soft dark:text-white/50 hover:text-primary mb-3 inline-flex items-center gap-1.5 focus-ring rounded"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Dashboard
        </button>

        <div className="flex gap-1 border-b border-border dark:border-white/10 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors focus-ring",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-ink-soft dark:text-white/50 hover:text-ink dark:hover:text-white",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6 space-y-6">
        {/* Quality header — shown on every tab for context */}
        <Card className="p-6 flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40">Data quality</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-3xl font-semibold text-ink dark:text-white">{dataset.quality_score}%</span>
              <span
                className={[
                  "text-xs font-semibold px-2 py-1 rounded-md",
                  tier.color === "good" && "bg-good/10 text-good",
                  tier.color === "warn" && "bg-signal-light dark:bg-signal/20 text-signal",
                  tier.color === "bad" && "bg-bad/10 text-bad",
                ].join(" ")}
              >
                {tier.label}
              </span>
            </div>
          </div>
          <QualityPulse
            score={dataset.quality_score}
            missing={dataset.missing_values}
            duplicates={dataset.duplicates}
            rows={dataset.rows}
            size="lg"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3 text-sm">
            {[
              ["Rows", formatNumber(dataset.rows)],
              ["Columns", formatNumber(dataset.columns)],
              ["Missing", formatNumber(dataset.missing_values)],
              ["Duplicates", formatNumber(dataset.duplicates)],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-ink-faint dark:text-white/40 text-xs font-semibold uppercase tracking-wider">{label}</p>
                <p className="font-mono text-ink dark:text-white font-semibold tabular mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {activeTab === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h2 className="font-display font-semibold text-ink dark:text-white mb-3">Data preview</h2>
              <Card className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border dark:border-white/10">
                      {(dataset.column_names || []).map((col) => (
                        <th key={col} className="text-left px-4 py-2.5 font-semibold text-ink-soft dark:text-white/50 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span>{col}</span>
                            <span className="font-mono font-normal text-[11px] text-ink-faint dark:text-white/30 normal-case">
                              {dataset.column_types?.[col]}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(dataset.preview || []).map((row, i) => (
                      <tr key={i} className="border-b border-border dark:border-white/10 last:border-0 hover:bg-bg/60 dark:hover:bg-white/[0.03]">
                        {(dataset.column_names || []).map((col) => (
                          <td key={col} className="px-4 py-2.5 whitespace-nowrap text-ink dark:text-white/80">
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-5">
                <h2 className="font-display font-semibold text-ink dark:text-white mb-3">Suggested next steps</h2>
                <ul className="space-y-2">
                  {(dataset.ai_suggestions || []).map((s) => (
                    <li key={s} className="text-sm text-ink-soft dark:text-white/60 flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="p-5">
                <h2 className="font-display font-semibold text-ink dark:text-white mb-3">Recommended chart types</h2>
                <div className="flex flex-wrap gap-2">
                  {(dataset.chart_recommendations || []).map((c) => (
                    <span key={c} className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-bg dark:bg-white/5 text-ink-soft dark:text-white/60 border border-border dark:border-white/10">
                      {c}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "Visualizations" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display font-semibold text-ink dark:text-white">Visualizations</h2>
                <p className="text-sm text-ink-soft dark:text-white/50">Explore your data through interactive charts</p>
              </div>
            </div>
            {chartsLoading ? (
              <div className="py-16 flex justify-center">
                <Spinner label="Building charts…" />
              </div>
            ) : charts.length === 0 ? (
              <EmptyState title="No charts available" description="This dataset doesn't have enough numeric or categorical columns to chart." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {charts.map((c, i) => (
                  <ChartCard key={i} chart={c} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "AI Insights" && (
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div>
                <h2 className="font-display font-semibold text-ink dark:text-white">AI Generated Insights</h2>
                <p className="text-sm text-ink-soft dark:text-white/50">Insights generated from {dataset.filename}</p>
              </div>
              <button
                onClick={handleGenerateInsights}
                disabled={generating}
                className="bg-primary hover:bg-primary-dark disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors focus-ring"
              >
                {generating ? "Generating…" : insights ? "Regenerate Insights" : "Generate Insights"}
              </button>
            </div>

            {insightChunks.length === 0 ? (
              <EmptyState
                title="No insights yet"
                description="Generate a written summary, trend read, and recommendations powered by AI."
                action={
                  <button
                    onClick={handleGenerateInsights}
                    disabled={generating}
                    className="bg-primary hover:bg-primary-dark disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors focus-ring"
                  >
                    {generating ? "Generating…" : "Generate AI insights"}
                  </button>
                }
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {insightChunks.map((chunk, i) => (
                  <Card key={i} className="p-4 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-good/10 text-good flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <p className="text-sm text-ink dark:text-white/80 leading-relaxed">{chunk}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "Reports" && (
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div>
                <h2 className="font-display font-semibold text-ink dark:text-white">Reports</h2>
                <p className="text-sm text-ink-soft dark:text-white/50">Generate and download a PDF report for this dataset</p>
              </div>
            </div>

            <Card className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink dark:text-white">{dataset.filename} — Report</p>
                <p className="text-sm text-ink-soft dark:text-white/50 mt-0.5">
                  Includes summary stats, quality score, and every chart generated for this dataset
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleReport("preview")}
                  disabled={previewLoading}
                  className="text-sm font-semibold px-4 py-2.5 rounded-lg border border-border dark:border-white/10 bg-white dark:bg-transparent text-ink dark:text-white hover:bg-bg dark:hover:bg-white/5 transition-colors focus-ring disabled:opacity-60"
                >
                  {previewLoading ? "Opening…" : "Preview"}
                </button>
                <button
                  onClick={() => handleReport("download")}
                  disabled={reportLoading}
                  className="text-sm font-semibold px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors focus-ring disabled:opacity-60"
                >
                  {reportLoading ? "Preparing…" : "Download PDF"}
                </button>
              </div>
            </Card>

            <Card className="p-6 mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40 mb-3">Report preview</p>
              <p className="font-display font-semibold text-ink dark:text-white mb-1">Executive Summary</p>
              <p className="text-sm text-ink-soft dark:text-white/60 mb-4">
                This report covers the full analysis of {dataset.filename}, including data quality and chart breakdowns.
              </p>
              <ul className="space-y-2 text-sm text-ink dark:text-white/80">
                {[
                  `Total records: ${formatNumber(dataset.rows)}`,
                  `Total columns: ${formatNumber(dataset.columns)}`,
                  `Data quality score: ${dataset.quality_score}%`,
                  `Missing values: ${formatNumber(dataset.missing_values)}, Duplicates: ${formatNumber(dataset.duplicates)}`,
                ].map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-good shrink-0">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {line}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this dataset?"
        description={`"${dataset.filename}" and any AI insights generated from it will be permanently removed. This can't be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete dataset"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
