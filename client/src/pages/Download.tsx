import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiDownload, FiEye, FiRefreshCw, FiX } from "react-icons/fi";
import { api } from "../api/client";
import { downloadSheetPdf, downloadAllSheetsPdf } from "../utils/pdf";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";
import { LoadingState } from "../components/LoadingState";

type Sheet = { id: number; title: string; topic: string; wordCount: number; difficulty: "easy" | "medium" | "hard" };
type FullSheet = Sheet & { content: string; charCount: number; createdAt: string };

const GROUP_LABELS: Record<Sheet["difficulty"], string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const GROUP_ACCENT: Record<Sheet["difficulty"], string> = { easy: "#22c55e", medium: "#f5a623", hard: "#ef4444" };
const GROUP_ORDER: Sheet["difficulty"][] = ["easy", "medium", "hard"];

export const Download = () => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState<number | "all" | null>(null);
  const [downloadError, setDownloadError] = useState<number | "all" | null>(null);
  const [preview, setPreview] = useState<FullSheet | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  const handlePreview = async (sheet: Sheet) => {
    setPreviewLoading(true);
    setPreview(null);
    try {
      const full = await api.sheet(sheet.id) as FullSheet;
      setPreview(full);
    } catch (err) {
      console.error("Failed to preview sheet:", err);
      setDownloadError(sheet.id);
    } finally {
      setPreviewLoading(false);
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

  if (loadError) {
    return <div className="flex flex-col gap-6"><BackButton to="/home" label="Back" /><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-10 flex flex-col items-center gap-4 text-center"><div className="w-14 h-14 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06] flex items-center justify-center"><FiRefreshCw className="text-xl" /></div><div><h1 className="font-bold text-lg">Couldn't load the sheets</h1><p className="text-black/50 dark:text-white/50 text-sm mt-1">Something went wrong while fetching the printable tests.</p></div><button onClick={load} className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm inline-flex items-center gap-2"><FiRefreshCw /> Try again</button></motion.div></div>;
  }

  return (
    <div className="flex flex-col gap-7 pb-6">
      <Seo title="Download Printable Typing Test Sheets (PDF)" description="Download free printable typing test sheets as PDF, organized by Easy, Medium, and Hard difficulty, for offline typing practice." path="/download" />
      <BackButton to="/home" label="Back" />
      {loading ? <LoadingState label="Loading download sheets…" /> : <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div><h1 className="text-2xl font-bold">Download Sheets</h1><p className="text-sm text-black/50 dark:text-white/50 mt-1">Printable typing practice, whenever you need it.</p></div>
          <div className="flex flex-col items-stretch sm:items-end gap-1">
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleDownloadAll} disabled={downloading !== null || sheets.length === 0} className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"><FiDownload />{downloading === "all" ? "Preparing…" : "Download All"}</motion.button>
            {downloadError === "all" && <span className="text-xs text-[var(--error)]">Couldn't generate the PDF. Try again.</span>}
          </div>
        </div>

        {GROUP_ORDER.map((difficulty) => {
          const group = sheets.filter((sheet) => sheet.difficulty === difficulty);
          if (!group.length) return null;
          return <section key={difficulty} className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 px-1"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GROUP_ACCENT[difficulty] }} /><h2 className="text-lg font-bold">{GROUP_LABELS[difficulty]}</h2><span className="text-xs text-black/40 dark:text-white/40">{group.length}</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.map((sheet, index) => <motion.article key={sheet.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className="group card p-5 flex flex-col gap-4">
                <div><span className="text-black/40 dark:text-white/40 text-xs">{sheet.topic}</span><h3 className="mt-1.5 font-semibold">{sheet.title || `Typing Test ${index + 1}`}</h3><p className="mt-1 text-xs text-black/40 dark:text-white/40">{sheet.wordCount} words</p></div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button onClick={() => handlePreview(sheet)} disabled={previewLoading} className="px-3 py-2.5 rounded-xl border border-[var(--card-border)] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] disabled:opacity-50"><FiEye /> Preview</button>
                  <button onClick={() => handleDownload(sheet, index + 1)} disabled={downloading !== null} className="px-3 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">{downloading === sheet.id ? <FiRefreshCw className="animate-spin" /> : <FiDownload />}{downloading === sheet.id ? "Preparing" : "PDF"}</button>
                </div>
                {downloadError === sheet.id && <p className="text-[var(--error)] text-xs">Couldn't load this sheet. Try again.</p>}
              </motion.article>)}
            </div>
          </section>;
        })}
      </>}

      {previewLoading && <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"><div className="card px-6 py-5 flex items-center gap-3"><FiRefreshCw className="animate-spin" /> Loading preview…</div></div>}

      {preview && <div className="fixed inset-0 z-[10000] bg-black/55 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
        <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-3xl max-h-[90vh] card overflow-hidden flex flex-col shadow-2xl">
          <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center justify-between gap-4"><div className="min-w-0"><h2 className="font-bold truncate">{preview.title}</h2><p className="text-xs text-black/45 dark:text-white/45 mt-0.5">{GROUP_LABELS[preview.difficulty]} · {preview.wordCount} words · {preview.topic}</p></div><button onClick={() => setPreview(null)} aria-label="Close preview" className="p-2 rounded-xl hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"><FiX /></button></div>
          <div className="overflow-y-auto p-5 sm:p-7 bg-white dark:bg-[#111]">
            <div className="mx-auto max-w-2xl rounded-xl border border-[var(--card-border)] bg-[var(--bg-main)] p-5 sm:p-7 shadow-sm">
              <p className="whitespace-pre-wrap text-sm sm:text-base leading-7 font-mono">{preview.content}</p>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-[var(--card-border)] flex justify-end"><button onClick={() => { const sheet = sheets.find((item) => item.id === preview.id); if (sheet) handleDownload(sheet, sheets.filter((item) => item.difficulty === sheet.difficulty).findIndex((item) => item.id === sheet.id) + 1); }} disabled={downloading !== null} className="px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center gap-2"><FiDownload /> Download PDF</button></div>
        </motion.div>
      </div>}
    </div>
  );
};
