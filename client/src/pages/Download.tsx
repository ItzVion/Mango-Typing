import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { downloadSheetPdf, downloadAllSheetsPdf } from "../utils/pdf";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";

type Sheet = { id: number; title: string; topic: string; wordCount: number; difficulty: "easy" | "medium" | "hard" };

const GROUP_LABELS: Record<Sheet["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const GROUP_ORDER: Sheet["difficulty"][] = ["easy", "medium", "hard"];

export const Download = () => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [downloading, setDownloading] = useState<number | "all" | null>(null);

  useEffect(() => {
    api.sheets().then(setSheets).catch(console.error);
  }, []);

  const handleDownload = async (s: Sheet, testNumber: number) => {
    setDownloading(s.id);
    try {
      const full = await api.sheet(s.id);
      downloadSheetPdf({ ...full, testNumber });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading("all");
    try {
      const full = await Promise.all(sheets.map((s) => api.sheet(s.id)));
      downloadAllSheetsPdf(full);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Seo
        title="Download Printable Typing Test Sheets (PDF)"
        description="Download free printable typing test sheets as PDF, organized by Easy, Medium, and Hard difficulty, for offline typing practice."
        path="/download"
      />
      <BackButton to="/home" label="Back" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Download Sheets</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleDownloadAll}
          disabled={downloading === "all" || sheets.length === 0}
          className="px-5 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold"
        >
          {downloading === "all" ? "Preparing…" : "Download All (Paper to Screen)"}
        </motion.button>
      </div>

      {GROUP_ORDER.map((difficulty) => {
        const group = sheets.filter((s) => s.difficulty === difficulty);
        if (group.length === 0) return null;
        return (
          <div key={difficulty} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold uppercase tracking-wide text-black/50 dark:text-white/50">
              {GROUP_LABELS[difficulty]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {group.map((s, i) => (
                <div key={s.id} className="card p-5 flex flex-col gap-2">
                  <span className="text-black/40 text-xs">{s.topic}</span>
                  <h3 className="font-semibold">
                    Typing Test {i + 1} {GROUP_LABELS[difficulty]}
                  </h3>
                  <span className="text-black/40 text-xs">{s.wordCount} words</span>
                  <button
                    onClick={() => handleDownload(s, i + 1)}
                    disabled={downloading === s.id}
                    className="mt-2 px-4 py-2 rounded-xl border border-[var(--card-border)] text-center text-sm font-semibold"
                  >
                    {downloading === s.id ? "Preparing…" : "Download PDF (Paper to Screen)"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
