import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";

type GameKey = "balloon" | "car" | "boss";
type Difficulty = "easy" | "medium" | "hard";

const GAMES: { key: GameKey; title: string; desc: string; emoji: string }[] = [
  { key: "balloon", title: "Balloon Pop", desc: "Letters fall — type the key to pop the balloon before it lands.", emoji: "🎈" },
  { key: "car", title: "Car Race", desc: "Type each word, hit space/enter to confirm, and keep your speed up.", emoji: "🏎️" },
  { key: "boss", title: "Boss Fight", desc: "Type 5–7 letter words to attack the boss before it defeats you. No repeats.", emoji: "👹" },
];

const DURATIONS = [60, 120, 180, 300];

export const GamesHub = () => {
  const [selected, setSelected] = useState<GameKey | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [duration, setDuration] = useState(60);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-6 mt-8">
      <BackButton to="/" label="Back" />
      <h1 className="text-3xl font-bold">Typing Games</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {GAMES.map((g) => (
          <motion.button
            key={g.key}
            whileHover={{ y: -4 }}
            onClick={() => setSelected(g.key)}
            className={`card p-6 text-left ${selected === g.key ? "border-black dark:border-white" : ""}`}
          >
            <span className="text-3xl">{g.emoji}</span>
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
              onClick={() => navigate(`/games/${selected}`, { state: { difficulty, duration } })}
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
