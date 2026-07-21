import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import Topbar from "../components/Topbar";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import ConfirmDialog from "../components/ConfirmDialog";
import QualityPulse from "../components/QualityPulse";
import Card from "../components/Card";
import { api } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatDate, formatNumber } from "../utils/format";

const LIMIT = 10;

export default function History() {
  const { openMobileNav } = useOutletContext();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ datasets: [], total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load(p) {
    setLoading(true);
    try {
      const { data: res } = await api.getHistory(p, LIMIT);
      setData(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteDataset(pendingDelete.file_id);
      toast.success(`Deleted "${pendingDelete.filename}".`);
      setPendingDelete(null);
      const isLastItemOnPage = data.datasets.length === 1 && page > 1;
      load(isLastItemOnPage ? page - 1 : page);
      if (isLastItemOnPage) setPage(page - 1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <Topbar
        title="History"
        subtitle={`${formatNumber(data.total_records)} datasets uploaded to date`}
        onMenuClick={openMobileNav}
      />

      <div className="px-5 sm:px-8 py-6 space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner label="Loading history…" />
          </div>
        ) : data.datasets.length === 0 ? (
          <EmptyState
            title="No datasets uploaded yet"
            description="Once you upload a file, it'll show up here with its quality score and a quick way to revisit its analysis."
            action={
              <Link to="/upload" className="inline-flex bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors focus-ring">
                Upload a dataset
              </Link>
            }
          />
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border dark:border-white/10 text-xs font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40">
                <span>Filename</span>
                <span>Rows</span>
                <span>Uploaded</span>
                <span>Quality</span>
                <span className="text-right">Actions</span>
              </div>
              <ul className="divide-y divide-border dark:divide-white/10">
                {data.datasets.map((d) => (
                  <li
                    key={d.file_id}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 md:gap-4 items-center px-5 py-4"
                  >
                    <Link to={`/dataset/${d.file_id}`} className="min-w-0 font-medium text-ink dark:text-white hover:text-primary truncate focus-ring rounded">
                      {d.filename}
                    </Link>
                    <span className="text-sm text-ink-soft dark:text-white/50 font-mono tabular">{formatNumber(d.rows)}</span>
                    <span className="text-sm text-ink-soft dark:text-white/50">{formatDate(d.upload_date)}</span>
                    <div className="flex items-center gap-2">
                      <QualityPulse score={d.quality_score} missing={d.missing_values} duplicates={d.duplicates} rows={d.rows} />
                      <span className="text-xs font-mono text-ink-soft dark:text-white/50">{d.quality_score}%</span>
                    </div>
                    <div className="flex md:justify-end gap-2">
                      <Link
                        to={`/dataset/${d.file_id}`}
                        className="text-sm font-medium text-primary hover:text-primary-dark px-2 py-1 focus-ring rounded"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => setPendingDelete(d)}
                        className="text-sm font-medium text-bad hover:text-bad/80 px-2 py-1 focus-ring rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Pagination page={page} totalPages={data.total_pages} onChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this dataset?"
        description={`"${pendingDelete?.filename}" and any AI insights generated from it will be permanently removed. This can't be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete dataset"}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
