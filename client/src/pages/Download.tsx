import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import { api } from "../api/client";
import { downloadSheetPdf, downloadAllSheetsPdf } from "../utils/pdf";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";
import { LoadingState } from "../components/LoadingState";

type Sheet = { id: number; title: string; topic: string; wordCount: number; difficulty: "easy" | "medium" | "hard" };
type FullSheet = Sheet & { content: string; charCount: number; createdAt: string };

const GROUP_LABELS: Record<Sheet["difficulty"], string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const GROUP_ACCENT: Record<Sheet["difficulty"], string> = { easy: "#22c55e", medium: "#f5a623", hard: "#dc2626" };
const GROUP_ORDER: Sheet["difficulty"][] = ["easy", "medium", "hard"];

export const Download = () => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState<number | "all" | null>(null);
  const [downloadError, setDownloadError] = useState<number | "all" | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    api.sheets().then(setSheets).catch((err) => {
      console.error("Failed to load download sheets:", err);
      setLoadError(true);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDownload = async (sheet: Sheet, testNumber: number) => {
    setDownloading(sheet.id);
    setDownloadError(null);
    try {
      const full = await api.sheet(sheet.id);
      downloadSheetPdf({ ...full, testNumber });
    } catch (err) {
      console.error("Failed to download sheet:", err);
      setDownloadError(sheet.id);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading("all");
    setDownloadError(null);
    try {
      const full = await api.sheetsFull() as FullSheet[];
      downloadAllSheetsPdf(full);
    } catch (err) {
      console.error("Failed to download all sheets:", err);
      setDownloadError("all");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-7 pb-6">
      <Seo title="Download Printable Typing Test Sheets (PDF)" description="Download free printable typing test sheets as PDF, organized by Easy, Medium, and Hard difficulty, for offline typing practice." path="/download" />
      <BackButton to="/home" label="Back" />

      {loading ? <LoadingState label="Loading download sheets…" /> : loadError ? (
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <p className="text-black/50 dark:text-white/50 text-sm">Couldn't load the download sheets.</p>
          <button onClick={load} className="px-5 py-2 rounded-xl card font-semibold text-sm">Retry</button>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-4 flex-wrap border-b border-[var(--card-border)] pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Download Sheets</h1>
              <p className="mt-1 text-sm text-black/45 dark:text-white/45">Printable typing tests for offline practice.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-black/40 dark:text-white/40">{sheets.length} sheets</span>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleDownloadAll} disabled={downloading !== null || sheets.length === 0} className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50">
                {downloading === "all" ? <FiRefreshCw className="animate-spin" /> : <FiDownload />}
                {downloading === "all" ? "Preparing…" : "Download All"}
              </motion.button>
            </div>
          </div>

          {downloadError === "all" && <p className="text-xs text-[var(--error)]">Couldn't generate the PDFs. Try again.</p>}

          {GROUP_ORDER.map((difficulty) => {
            const group = sheets.filter((sheet) => sheet.difficulty === difficulty);
            if (!group.length) return null;
            return (
              <section key={difficulty} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_ACCENT[difficulty] }} />
                  <h2 className="text-base font-bold">{GROUP_LABELS[difficulty]}</h2>
                  <span className="text-xs text-black/35 dark:text-white/35">{group.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map((sheet, index) => (
                    <motion.div key={sheet.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.2) }} whileHover={{ y: -2 }} className="card p-5 flex flex-col gap-3">
                      <div>
                        <span className="text-xs text-black/40 dark:text-white/40">{sheet.topic}</span>
                        <h3 className="mt-1 font-semibold">{sheet.title || `Typing Test ${index + 1}`}</h3>
                      </div>
                      <span className="text-xs text-black/40 dark:text-white/40">{sheet.wordCount} words</span>
                      <button onClick={() => handleDownload(sheet, index + 1)} disabled={downloading !== null} className="mt-auto w-full px-4 py-2.5 rounded-xl border border-[var(--card-border)] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] disabled:opacity-50">
                        {downloading === sheet.id ? <FiRefreshCw className="animate-spin" /> : <FiDownload />}
                        {downloading === sheet.id ? "Preparing…" : "Download PDF"}
                      </button>
                      {downloadError === sheet.id && <p className="text-xs text-[var(--error)]">Couldn't generate this PDF. Try again.</p>}
                    </motion.div>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};
