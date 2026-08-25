import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { downloadSheetPdf } from "../utils/pdf";
import { BackButton } from "../components/BackButton";

type Sheet = { id: number; title: string; topic: string; wordCount: number; difficulty: "easy" | "medium" | "hard" };

const GROUP_LABELS: Record<Sheet["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const GROUP_ORDER: Sheet["difficulty"][] = ["easy", "medium", "hard"];

export const Sheets = () => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);

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

  return (
    <div className="flex flex-col gap-8">
      <BackButton to="/" label="Back" />
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
                  <div className="mt-2 flex gap-2">
                    <Link
                      to={`/test/${s.id}`}
                      className="flex-1 px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-center text-sm font-semibold"
                    >
                      Start
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
