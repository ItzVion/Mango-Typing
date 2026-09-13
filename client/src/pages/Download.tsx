import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiArrowDown, FiBookOpen, FiCheck, FiDownload, FiFileText, FiRefreshCw, FiZap } from "react-icons/fi";
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

  const load = () => {
    setLoading(true);
    setLoadError(false);
    api.sheets()
      .then(setSheets)
      .catch((err) => {
        console.error("Failed to load download sheets:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totalWords = useMemo(() => sheets.reduce((sum, sheet) => sum + sheet.wordCount, 0), [sheets]);

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

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <BackButton to="/home" label="Back" />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06] flex items-center justify-center">
            <FiRefreshCw className="text-xl" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Couldn't load the sheets</h1>
            <p className="text-black/50 dark:text-white/50 text-sm mt-1">Something went wrong while fetching the printable tests.</p>
          </div>
          <button onClick={load} className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold text-sm inline-flex items-center gap-2">
            <FiRefreshCw /> Try again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 pb-6">
      <Seo
        title="Download Printable Typing Test Sheets (PDF)"
        description="Download free printable typing test sheets as PDF, organized by Easy, Medium, and Hard difficulty, for offline typing practice."
        path="/download"
      />

      <BackButton to="/home" label="Back" />

      {loading ? (
        <LoadingState label="Loading download sheets…" />
      ) : (
        <>
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--card-bg)] px-6 py-8 sm:px-9 sm:py-10"
          >
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-orange-400/[0.07] blur-3xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-7">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-500 mb-4">
                  <FiFileText /> PRINTABLE PRACTICE
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Practice <span className="text-amber-500">offline.</span>
                  <br className="hidden sm:block" /> Download. Print. Type.
                </h1>
                <p className="mt-3 max-w-xl text-sm sm:text-base leading-6 text-black/55 dark:text-white/55">
                  Grab a printable typing sheet, put it beside your keyboard, and turn paper into real typing practice.
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5 text-xs font-semibold text-black/55 dark:text-white/55">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] px-3 py-2"><FiCheck className="text-emerald-500" /> Free PDFs</span>
                  <span className="inline-flex items-center gap-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] px-3 py-2"><FiZap className="text-amber-500" /> 3 difficulty levels</span>
                  <span className="inline-flex items-center gap-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] px-3 py-2"><FiBookOpen className="text-sky-500" /> Offline practice</span>
                </div>
              </div>

              <motion.button
                whileHover={{ y: -2, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadAll}
                disabled={downloading !== null || sheets.length === 0}
                className="group shrink-0 rounded-2xl bg-black px-5 py-4 text-left text-white shadow-xl shadow-black/10 dark:bg-white dark:text-black disabled:opacity-60"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 dark:bg-black/10">
                    {downloading === "all" ? <FiRefreshCw className="animate-spin" /> : <FiDownload />}
                  </span>
                  <span>
                    <span className="block text-sm font-black">{downloading === "all" ? "Preparing PDFs…" : "Download everything"}</span>
                    <span className="block mt-0.5 text-xs opacity-55">{sheets.length} sheets · {totalWords.toLocaleString()} words</span>
                  </span>
                  <FiArrowDown className="ml-2 opacity-50 transition-transform group-hover:translate-y-0.5" />
                </span>
              </motion.button>
            </div>

            {downloadError === "all" && (
              <p className="relative mt-4 text-xs font-medium text-[var(--error)]">Couldn't generate the full PDF. Please try again.</p>
            )}
          </motion.section>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {GROUP_ORDER.map((difficulty, index) => {
              const count = sheets.filter((sheet) => sheet.difficulty === difficulty).length;
              return (
                <motion.div
                  key={difficulty}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.05 }}
                  className="card px-4 py-4 sm:px-5 flex items-center gap-3"
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: GROUP_ACCENT[difficulty], boxShadow: `0 0 12px ${GROUP_ACCENT[difficulty]}55` }} />
                  <span className="min-w-0"><span className="block text-xs text-black/45 dark:text-white/45">{GROUP_LABELS[difficulty]}</span><span className="font-bold text-sm">{count} {count === 1 ? "sheet" : "sheets"}</span></span>
                </motion.div>
              );
            })}
          </div>

          {GROUP_ORDER.map((difficulty, groupIndex) => {
            const group = sheets.filter((sheet) => sheet.difficulty === difficulty);
            if (group.length === 0) return null;

            return (
              <section key={difficulty} className="flex flex-col gap-3.5">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + groupIndex * 0.06 }}
                  className="flex items-end justify-between gap-3 px-1"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GROUP_ACCENT[difficulty] }} />
                      <h2 className="text-xl font-black tracking-tight">{GROUP_LABELS[difficulty]}</h2>
                    </div>
                    <p className="text-xs text-black/45 dark:text-white/45 mt-1.5 ml-5">{group.length} printable {group.length === 1 ? "sheet" : "sheets"} to sharpen your typing.</p>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map((sheet, index) => (
                    <motion.article
                      key={sheet.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(0.16 + groupIndex * 0.07 + index * 0.045, 0.42), type: "spring", stiffness: 260, damping: 24 }}
                      whileHover={{ y: -5 }}
                      className="group card overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-xl hover:shadow-black/[0.06] dark:hover:shadow-black/30"
                    >
                      <div className="h-1 w-full" style={{ backgroundColor: GROUP_ACCENT[difficulty] }} />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="inline-flex max-w-full truncate rounded-lg bg-black/[0.04] dark:bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-black/50 dark:text-white/50">{sheet.topic}</span>
                            <h3 className="mt-3 text-base font-black leading-5">{sheet.title || `Typing Test ${index + 1}`}</h3>
                          </div>
                          <span className="shrink-0 text-[11px] font-bold text-black/35 dark:text-white/35">#{String(index + 1).padStart(2, "0")}</span>
                        </div>

                        <div className="mt-5 flex items-center gap-4 text-xs text-black/45 dark:text-white/45">
                          <span className="inline-flex items-center gap-1.5"><FiFileText /> {sheet.wordCount} words</span>
                          <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                          <span>{GROUP_LABELS[difficulty]}</span>
                        </div>

                        <div className="mt-5 pt-4 border-t border-[var(--card-border)]">
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDownload(sheet, index + 1)}
                            disabled={downloading !== null}
                            className="w-full rounded-xl bg-black/[0.045] dark:bg-white/[0.06] px-4 py-3 text-sm font-bold transition-all group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black disabled:opacity-50 inline-flex items-center justify-center gap-2"
                          >
                            {downloading === sheet.id ? <FiRefreshCw className="animate-spin" /> : <FiDownload />}
                            {downloading === sheet.id ? "Preparing…" : "Download PDF"}
                          </motion.button>
                          {downloadError === sheet.id && (
                            <p className="mt-2 text-center text-[11px] font-medium text-[var(--error)]">Couldn't generate this PDF. Try again.</p>
                          )}
                        </div>
                      </div>
                    </motion.article>
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
