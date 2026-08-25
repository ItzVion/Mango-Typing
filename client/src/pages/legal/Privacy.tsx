import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { api } from "../../api/client";

export const Privacy = () => {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    api.legalPage("privacy").then((p) => setContent(p.content));
  }, []);

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto text-sm text-black/70 dark:text-white/70">
      <BackButton to="/" label="Back" />
      <h1 className="text-2xl font-bold text-black dark:text-white">Privacy Policy</h1>
      {content === null ? (
        <p className="text-black/40">Loading…</p>
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
