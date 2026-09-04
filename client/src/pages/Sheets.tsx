import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { downloadSheetPdf } from "../utils/pdf";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";

type Sheet = { id: number; title: string; topic: string; wordCount: number; difficulty: "easy" | "medium" | "hard" };

const GROUP_LABELS: Record<Sheet["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const GROUP_ACCENT: Record<Sheet["difficulty"], string> = {
  easy: "#22c55e",
  medium: "#f5a623",
  hard: "#dc2626",
};

const GROUP_ORDER: Sheet["difficulty"][] = ["easy", "medium", "hard"];

export const Sheets = () => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError(false);
    api.sheets()
      .then(setSheets)
      .catch((err) => {
        console.error("Failed to load sheets:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDownload = async (s: Sheet, testNumber: number) => {
    setDownloading(s.id);
    setDownloadError(null);
    try {
      const full = await api.sheet(s.id);
      downloadSheetPdf({ ...full, testNumber });
    } catch (err) {
      console.error("Failed to download sheet:", err);
      setDownloadError(s.id);
    } finally {
      setDownloading(null);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-col gap-8">
        <BackButton to="/home" label="Back" />
        <div className="card p-10 flex flex-col items-center gap-3 text-center">
          <p className="text-black/50 text-sm">Couldn't load the test sheets.</p>
          <button onClick={load} className="px-5 py-2 rounded-xl card font-semibold text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <Seo
        title="Typing Test Sheets — Easy, Medium, Hard"
        description="Pick a typing test sheet by topic and difficulty, then test your WPM and accuracy on paper or straight from the screen."
        path="/home/tests"
      />
      <BackButton to="/home" label="Back" />
      {loading ? (
        <div className="flex flex-col gap-4">
          {[0, 1].map((g) => (
            <div key={g} className="flex flex-col gap-4">
              <div className="h-4 w-24 rounded bg-black/[0.05] dark:bg-white/[0.06] animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card p-5 h-36 animate-pulse bg-black/[0.02] dark:bg-white/[0.03]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        GROUP_ORDER.map((difficulty) => {
          const group = sheets.filter((s) => s.difficulty === difficulty);
          if (group.length === 0) return null;
          return (
            <div key={difficulty} className="flex flex-col gap-4">
              <motion.h2
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-lg font-bold uppercase tracking-wide text-black/50 dark:text-white/50 flex items-center gap-2"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: GROUP_ACCENT[difficulty] }}
                />
                {GROUP_LABELS[difficulty]}
              </motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {group.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.06, 0.3), type: "spring", stiffness: 260, damping: 22 }}
                    whileHover={{ y: -4, borderColor: GROUP_ACCENT[difficulty] }}
                    className="card p-5 flex flex-col gap-2 transition-colors"
                  >
                    <span className="text-black/40 text-xs">{s.topic}</span>
                    <h3 className="font-semibold">
                      Typing Test {i + 1} {GROUP_LABELS[difficulty]}
                    </h3>
                    <span className="text-black/40 text-xs">{s.wordCount} words</span>
                    <div className="mt-2 flex gap-2">
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                        <Link
                          to={`/home/tests/${s.id}`}
                          className="block px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-center text-sm font-semibold"
                        >
                          Start
                        </Link>
                      </motion.div>
                    </div>
                    {downloadError === s.id && (
                      <p className="text-[var(--error)] text-xs">Couldn't generate the PDF — try again.</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
