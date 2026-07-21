import React, { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar";
import StatCard from "../components/StatCard";
import Card from "../components/Card";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatDate, formatNumber, qualityTier } from "../utils/format";

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function QuickAction({ icon, label, to, onClick }) {
  const inner = (
    <span className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-primary-light dark:hover:bg-white/5 transition-colors group">
      <span className="w-9 h-9 rounded-full bg-primary-light dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="text-sm font-medium text-ink dark:text-white flex-1">{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink-faint dark:text-white/30 group-hover:translate-x-0.5 transition-transform">
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
  return to ? (
    <Link to={to} className="block focus-ring rounded-xl">
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className="block w-full text-left focus-ring rounded-xl">
      {inner}
    </button>
  );
}

export default function Dashboard() {
  const { openMobileNav } = useOutletContext();
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [statsRes, historyRes] = await Promise.all([
          api.getDashboardStats(),
          api.getHistory(1, 5),
        ]);
        if (cancelled) return;
        setStats(statsRes.data);
        setRecent(historyRes.data.datasets || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = recent[0];
  const latestTier = latest ? qualityTier(latest.quality_score ?? 0) : null;

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle="Welcome back! Here's an overview of your data."
        onMenuClick={openMobileNav}
      />

      <div className="px-5 sm:px-8 py-6 space-y-6">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner label="Loading dashboard…" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Total Datasets"
                value={formatNumber(stats?.total_datasets ?? 0)}
                accent="primary"
                footer="View all datasets →"
                to="/history"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
                  </svg>
                }
              />
              <StatCard
                label="Total Records"
                value={formatNumber(stats?.total_rows ?? 0)}
                accent="good"
                footer="View details →"
                to="/history"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                }
              />
              <StatCard
                label="Avg. Quality Score"
                value={stats?.avg_quality_score ?? 0}
                suffix="%"
                accent="blue"
                footer="View insights →"
                to="/history"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2l3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />
                  </svg>
                }
              />
              <StatCard
                label="Insights Generated"
                value={formatNumber(stats?.total_insights ?? 0)}
                accent="signal"
                footer="View charts →"
                to="/history"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z" />
                    <path d="M10 20h4" strokeLinecap="round" />
                  </svg>
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <Card className="lg:col-span-2 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-white/10">
                  <h2 className="font-display font-semibold text-ink dark:text-white">Recent Dataset</h2>
                  <Link to="/history" className="text-sm font-medium text-primary hover:text-primary-dark focus-ring rounded">
                    View all →
                  </Link>
                </div>

                {recent.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="No datasets yet"
                      description="Upload your first CSV, Excel, or JSON file to see its quality score and charts here."
                      action={
                        <Link
                          to="/upload"
                          className="inline-flex bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors focus-ring"
                        >
                          Upload a dataset
                        </Link>
                      }
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40">
                          <th className="px-5 py-3 font-semibold">File Name</th>
                          <th className="px-5 py-3 font-semibold">Records</th>
                          <th className="px-5 py-3 font-semibold">Columns</th>
                          <th className="px-5 py-3 font-semibold">Uploaded On</th>
                          <th className="px-5 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recent.map((d) => (
                          <tr key={d.file_id} className="border-t border-border dark:border-white/10 hover:bg-bg/70 dark:hover:bg-white/[0.03] transition-colors">
                            <td className="px-5 py-3.5 font-medium text-ink dark:text-white max-w-[200px] truncate">{d.filename}</td>
                            <td className="px-5 py-3.5 text-ink-soft dark:text-white/50 font-mono tabular">{formatNumber(d.rows)}</td>
                            <td className="px-5 py-3.5 text-ink-soft dark:text-white/50 font-mono tabular">{d.columns}</td>
                            <td className="px-5 py-3.5 text-ink-soft dark:text-white/50">{formatDate(d.upload_date)}</td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => navigate(`/dataset/${d.file_id}`)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-ink-soft dark:text-white/50 hover:text-primary hover:bg-primary-light dark:hover:bg-white/5 transition-colors focus-ring"
                                aria-label={`View ${d.filename}`}
                              >
                                <EyeIcon />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="font-display font-semibold text-ink dark:text-white mb-2">Quick Actions</h2>
                <div className="flex flex-col divide-y divide-border dark:divide-white/10">
                  <QuickAction
                    to="/upload"
                    label="Upload New Dataset"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                      </svg>
                    }
                  />
                  <QuickAction
                    to={latest ? `/dataset/${latest.file_id}` : "/history"}
                    label="Generate AI Insights"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z" />
                      </svg>
                    }
                  />
                  <QuickAction
                    to={latest ? `/dataset/${latest.file_id}` : "/history"}
                    label="Create New Report"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                        <path d="M14 3v5h5" />
                      </svg>
                    }
                  />
                  <QuickAction
                    to="/history"
                    label="View All History"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" />
                        <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  />
                </div>
              </Card>
            </div>

            <Card className="p-6 flex flex-col sm:flex-row items-center gap-6 bg-gradient-to-br from-primary-light dark:from-primary/10 to-white dark:to-transparent">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-primary">
                    <path d="M12 3l1.6 4.6L18 9l-4.4 1.4L12 15l-1.6-4.6L6 9l4.4-1.4L12 3z" />
                    <path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
                  </svg>
                  <h2 className="font-display font-semibold text-ink dark:text-white">AI Summary</h2>
                </div>
                {latest ? (
                  <p className="text-sm text-ink-soft dark:text-white/60 leading-relaxed max-w-2xl">
                    Your most recent dataset <span className="font-medium text-ink dark:text-white">"{latest.filename}"</span> contains{" "}
                    {formatNumber(latest.rows)} records with {latest.columns} columns and a data quality score of{" "}
                    <span className="font-medium text-ink dark:text-white">{latest.quality_score}%</span> ({latestTier.label.toLowerCase()}).
                    Open it to generate a full written summary, trends, and recommendations.
                  </p>
                ) : (
                  <p className="text-sm text-ink-soft dark:text-white/60 leading-relaxed max-w-2xl">
                    Upload a dataset to get an automatic quality score, charts, and an AI-generated summary of
                    trends and recommendations.
                  </p>
                )}
              </div>
              <div className="hidden sm:flex w-28 h-28 rounded-2xl bg-white/60 dark:bg-white/5 items-end justify-center gap-1.5 p-4 shrink-0">
                {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                  <span key={i} className="w-3 rounded-full bg-primary/70" style={{ height: `${h * 100}%` }} />
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
