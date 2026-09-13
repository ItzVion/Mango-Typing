import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { Seo } from "../../components/Seo";

type GameKey = "balloon" | "car" | "boss";
type Difficulty = "easy" | "medium" | "hard";

const BalloonGameIcon = () => (
  <svg viewBox="0 0 32 32" width="30" height="30" fill="none">
    <ellipse cx="16" cy="13" rx="10" ry="12" fill="#ef4444" stroke="#f5f5f5" strokeWidth="1.5" />
    <path d="M16 25l-2 3h4l-2-3z" fill="#ef4444" stroke="#f5f5f5" strokeWidth="1.2" strokeLinejoin="round" />
    <line x1="16" y1="28" x2="16" y2="31" stroke="#9a9a9a" strokeWidth="1.2" />
  </svg>
);

const CarGameIcon = () => (
  <svg viewBox="0 0 32 32" width="30" height="30" fill="none">
    <path d="M5 20l2-7a3 3 0 0 1 3-2h12a3 3 0 0 1 3 2l2 7v4a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H9v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4z" fill="#F5A623" stroke="#f5f5f5" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="10" cy="21" r="2" fill="#1a1a1a" stroke="#f5f5f5" strokeWidth="1" />
    <circle cx="22" cy="21" r="2" fill="#1a1a1a" stroke="#f5f5f5" strokeWidth="1" />
    <line x1="8" y1="14" x2="24" y2="14" stroke="#f5f5f5" strokeWidth="1.2" opacity="0.6" />
  </svg>
);

const BossGameIcon = () => (
  <svg viewBox="0 0 32 32" width="30" height="30" fill="none">
    <path d="M16 6c-6 0-10 5-10 10 0 5 3 8 10 8s10-3 10-8c0-5-4-10-10-10z" fill="#8b6bd8" stroke="#f5f5f5" strokeWidth="1.5" />
    <path d="M10 8L7 3l4 3z" fill="#F5A623" />
    <path d="M22 8l3-5-4 3z" fill="#F5A623" />
    <circle cx="12.5" cy="15" r="2" fill="#fff" />
    <circle cx="19.5" cy="15" r="2" fill="#fff" />
    <circle cx="12.5" cy="15" r="0.9" fill="#1a1a1a" />
    <circle cx="19.5" cy="15" r="0.9" fill="#1a1a1a" />
    <path d="M12 20q4 3 8 0" stroke="#f5f5f5" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

const GAMES: { key: GameKey; title: string; desc: string; icon: () => ReactElement }[] = [
  { key: "balloon", title: "Balloon Pop", desc: "Letters fall — type the key to pop the balloon before it lands.", icon: BalloonGameIcon },
  { key: "car", title: "Car Race", desc: "Type each word, hit space/enter to confirm, and keep your speed up.", icon: CarGameIcon },
  { key: "boss", title: "Boss Fight", desc: "Type words to attack the boss, and type 'defend' to dodge its attacks.", icon: BossGameIcon },
];

const DURATIONS = [60, 120, 180, 300];

export const GamesHub = () => {
  const [selected, setSelected] = useState<GameKey | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [duration, setDuration] = useState(60);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-6 mt-8">
      <Seo
        title="Typing Games — Balloon Pop, Car Race, Boss Fight"
        description="Practice typing speed and accuracy with fun typing games: Balloon Pop, Car Race, and Boss Fight, each with three difficulty levels."
        path="/home/typing-games"
      />
      <BackButton to="/home" label="Back" />
      <h1 className="text-3xl font-bold">Typing Games</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {GAMES.map((g) => (
          <motion.button
            key={g.key}
            whileHover={{ y: -4 }}
            onClick={() => setSelected(g.key)}
            className={`card p-6 text-left ${selected === g.key ? "border-black dark:border-white" : ""}`}
          >
            <g.icon />
            <h3 className="font-semibold mt-2">{g.title}</h3>
            <p className="text-black/40 text-xs">{g.desc}</p>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-6 w-full max-w-2xl flex flex-col gap-4"
          >
            <div>
              <p className="text-xs text-black/40 mb-2">Difficulty</p>
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize border ${
                      difficulty === d ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-[var(--card-border)]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-black/40 mb-2">Duration</p>
              <div className="flex gap-2 flex-wrap">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
                      duration === d ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-[var(--card-border)]"
                    }`}
                  >
                    {d / 60}m
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => navigate(`/home/games/${selected}`, { state: { difficulty, duration } })}
              className="mt-2 px-6 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold"
            >
              Play
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
