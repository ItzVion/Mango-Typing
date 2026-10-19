import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { Seo } from "../../components/Seo";
import { api } from "../../api/client";
import { LoadingState } from "../../components/LoadingState";

export const Privacy = () => {
  const [content, setContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    setLoadError(false);
    api.legalPage("privacy").then((p) => setContent(p.content)).catch((err) => {
      console.error("Failed to load privacy policy:", err);
      setLoadError(true);
    });
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto text-sm text-black/70 dark:text-white/70">
      <Seo title="Privacy Policy" description="Read the MangoTyping privacy policy: what data we collect, why, and how it's used." path="/privacy" />
      <BackButton to="/" label="Back" />
      <h1 className="text-2xl font-bold text-black dark:text-white">Privacy Policy</h1>
      {content === null ? (
        loadError ? (
          <div className="card p-5 flex flex-col items-start gap-3">
            <p>Couldn't load the privacy policy.</p>
            <button onClick={load} className="px-4 py-2 rounded-xl border border-[var(--card-border)] font-semibold">Retry</button>
          </div>
        ) : <LoadingState label="Loading privacy policy…" />
      ) : (
        content
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((para, i) => (
            <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              {para}
            </motion.p>
          ))
      )}
    </div>
  );
};
