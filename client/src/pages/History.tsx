import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { BackButton } from "../components/BackButton";
import { AnimatedNumber } from "../components/AnimatedNumber";

type Test = {
  id: string;
  wpm: number;
  accuracy: number;
  mode: string;
  createdAt: string;
  sheet: { title: string; topic: string };
};

export const History = () => {
  const user = useAuthStore((s) => s.user);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    api.myTests()
      .then(setTests)
      .catch((err) => {
        console.error("Failed to load history:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton to="/home" label="Back" />
        <div className="text-center text-black/50">
          Sign in to see your saved history. <Link to="/auth" className="underline">Sign in</Link>
        </div>
      </div>
    );
  }

  const best = tests.reduce((m, t) => Math.max(m, t.wpm), 0);
  const avg = tests.length ? tests.reduce((s, t) => s + t.wpm, 0) / tests.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <BackButton to="/home" label="Back" />
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold"
      >
        {user.username}'s Results
      </motion.h1>

      {loadError ? (
        <div className="card p-8 flex flex-col items-center gap-3 text-center">
          <p className="text-black/50 text-sm">Couldn't load your results.</p>
          <button onClick={load} className="px-5 py-2 rounded-xl card font-semibold text-sm">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Tests", value: tests.length },
              { label: "Best WPM", value: best },
              { label: "Avg WPM", value: Math.round(avg) },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ y: -3 }}
                className="card p-4 text-center"
              >
                <div className="text-2xl font-bold">
                  <AnimatedNumber value={s.value} />
                </div>
                <div className="text-black/40 text-xs">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <h2 className="font-semibold text-black/70">Recent Tests</h2>
          <div className="flex flex-col gap-2">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="card p-4 h-14 animate-pulse bg-black/[0.02] dark:bg-white/[0.03]" />
              ))
            ) : (
              tests.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  whileHover={{ x: 2, borderColor: "var(--accent)" }}
                  className="card p-4 flex justify-between text-sm flex-wrap gap-2 transition-colors"
                >
                  <span>{t.sheet.title}</span>
                  <span className="text-black/40 text-xs">{t.mode === "screen" ? "Screen to Screen" : "Paper to Screen"}</span>
                  <span>{Math.round(t.wpm)} WPM</span>
                  <span>{t.accuracy.toFixed(1)}%</span>
                  <span className="text-black/40">{new Date(t.createdAt).toLocaleDateString()}</span>
                </motion.div>
              ))
            )}
            {!loading && tests.length === 0 && <p className="text-black/40">No tests yet. Go type something.</p>}
          </div>
        </>
      )}
    </div>
  );
};
