import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { SupportSection } from "../components/SupportSection";
import { TypingHero } from "../components/TypingHero";

type Phase = "idle" | "choose";

const OPTIONS = [
  { key: "test", title: "Typing Test", desc: "Print a sheet, type from paper — or type straight from the screen.", to: "/sheets", emoji: "📄" },
  { key: "games", title: "Typing Games", desc: "Balloon pop, car racing, and boss battles, with three difficulty tiers.", to: "/games", emoji: "🎮" },
  { key: "tutor", title: "Typing Tutor", desc: "Step-by-step lessons, home row to full sentences, with an on-screen keyboard.", to: "/tutor", emoji: "⌨️" },
];

export const Dashboard = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center">
      {/* Hero — sized like a full 16:9 slide so it isn't cramped against the section below */}
      <div className="w-full flex flex-col items-center text-center gap-6 px-6 min-h-[calc(100vh-6rem)] justify-center">
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6 }}
              >
                <TypingHero />
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-black/50 max-w-md"
              >
                Typing tests, games, and a tutor — all in one place. WPM, accuracy, and full history saved to your account.
              </motion.p>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 260, damping: 18 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPhase("choose")}
                className="px-8 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold"
              >
                Start
              </motion.button>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 8, 0] }}
                transition={{ opacity: { delay: 1 }, y: { delay: 1, duration: 1.6, repeat: Infinity } }}
                className="mt-10 text-black/30 text-xs"
              >
                ↓ scroll to support us
              </motion.div>
            </motion.div>
          )}

          {phase === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <BackButton label="Back" onClick={() => setPhase("idle")} />
              <h2 className="text-2xl font-bold">What do you want to do?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
                {OPTIONS.map((o, i) => (
                  <motion.button
                    key={o.key}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 260, damping: 20 }}
                    whileHover={{ y: -6, scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(o.to)}
                    className="card p-6 flex flex-col items-center gap-2 text-left"
                  >
                    <motion.span
                      className="text-3xl"
                      initial={{ rotate: -15, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ delay: i * 0.1 + 0.15, type: "spring", stiffness: 300 }}
                    >
                      {o.emoji}
                    </motion.span>
                    <h3 className="font-semibold">{o.title}</h3>
                    <p className="text-black/40 text-xs text-center">{o.desc}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Support section — its own full-height slide, kept a clear distance from the hero */}
      <div className="w-full min-h-[calc(100vh-6rem)] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="w-full flex justify-center"
        >
          <SupportSection />
        </motion.div>
      </div>
    </div>
  );
};
