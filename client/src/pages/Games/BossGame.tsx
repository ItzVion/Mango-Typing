import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";

type Difficulty = "easy" | "medium" | "hard";

// Word bank split by length. Difficulty controls which lengths are drawn from,
// and the game never shows the same word twice in a session (shuffled, consumed).
const WORDS_5 = [
  "apple", "brave", "chair", "dance", "eagle", "flame", "grape", "house",
  "input", "joker", "knife", "lemon", "mango", "night", "ocean", "piano",
  "queen", "river", "stone", "tiger",
];
const WORDS_6 = [
  "animal", "bridge", "candle", "dragon", "engine", "forest", "garden",
  "hunter", "island", "jungle", "kitten", "ladder", "market", "needle",
  "orange", "pencil", "quartz", "rocket", "silver", "temple",
];
const WORDS_7 = [
  "balance", "capture", "diamond", "elegant", "fantasy", "gateway",
  "harmony", "imagine", "journey", "kingdom", "lantern", "monster",
  "network", "octopus", "pumpkin", "quality", "rainbow", "thunder",
  "triumph", "volcano",
];

const SETTINGS: Record<Difficulty, { pool: string[]; bossHp: number; damage: number; bossAttack: number }> = {
  easy: { pool: WORDS_5, bossHp: 60, damage: 15, bossAttack: 4 },
  medium: { pool: [...WORDS_5, ...WORDS_6], bossHp: 100, damage: 12, bossAttack: 7 },
  hard: { pool: [...WORDS_6, ...WORDS_7], bossHp: 150, damage: 10, bossAttack: 10 },
};

function shuffled(arr: string[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const BossGame = () => {
  const { state } = useLocation() as { state?: { difficulty: Difficulty; duration: number } };
  const difficulty = state?.difficulty ?? "easy";
  const duration = state?.duration ?? 60;
  const navigate = useNavigate();
  const settings = SETTINGS[difficulty];

  const [status, setStatus] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [bossHp, setBossHp] = useState(settings.bossHp);
  const [playerHp, setPlayerHp] = useState(100);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [bossHit, setBossHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextWord = (pool: string[]): [string, string[]] => {
    let remaining = pool;
    if (remaining.length === 0) remaining = shuffled(settings.pool);
    const [word, ...rest] = remaining;
    return [word, rest];
  };

  const start = () => {
    const initialPool = shuffled(settings.pool);
    const [word, rest] = nextWord(initialPool);
    setWordPool(rest);
    setCurrentWord(word);
    setBossHp(settings.bossHp);
    setPlayerHp(100);
    setInput("");
    setTimeLeft(duration);
    setWordsTyped(0);
    setMistakes(0);
    setStatus("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (status !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setStatus((s) => (s === "playing" ? "lost" : s));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const handleSubmit = () => {
    if (status !== "playing") return;
    const attempt = input.trim().toLowerCase();
    if (!attempt) return;

    if (attempt === currentWord) {
      setWordsTyped((w) => w + 1);
      setBossHit(true);
      setTimeout(() => setBossHit(false), 200);
      setBossHp((hp) => {
        const next = Math.max(0, hp - settings.damage);
        if (next === 0) setStatus("won");
        return next;
      });
    } else {
      setMistakes((m) => m + 1);
      setPlayerHit(true);
      setTimeout(() => setPlayerHit(false), 200);
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - settings.bossAttack);
        if (next === 0) setStatus("lost");
        return next;
      });
    }

    setInput("");
    setWordPool((pool) => {
      const [word, rest] = nextWord(pool);
      setCurrentWord(word);
      return rest;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const bossHpPct = (bossHp / settings.bossHp) * 100;
  const playerHpPct = playerHp;

  if (status === "ready") {
    return (
      <div className="flex flex-col items-center gap-6 mt-16">
        <BackButton to="/games" label="Back to Games" />
        <h2 className="text-2xl font-bold">Boss Fight</h2>
        <p className="text-black/40 text-sm max-w-md text-center">
          Type the word shown to land a hit on the boss. Miss it and the boss
          hits back. Bring the boss to 0 HP before time runs out — every word
          is unique, none repeat in a run.
        </p>
        <div className="flex gap-4 text-xs text-black/40">
          <span>Difficulty: <span className="capitalize font-semibold text-black dark:text-white">{difficulty}</span></span>
          <span>Duration: <span className="font-semibold text-black dark:text-white">{duration}s</span></span>
        </div>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={start}
          className="card px-8 py-3 font-semibold"
        >
          Start
        </motion.button>
      </div>
    );
  }

  if (status === "won" || status === "lost") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 mt-16"
      >
        <BackButton to="/games" label="Back to Games" />
        <h2 className="text-2xl font-bold">
          {status === "won" ? "Boss Defeated! 🏆" : "You Were Defeated 💀"}
        </h2>
        <div className="text-5xl">{status === "won" ? "🎉" : "☠️"}</div>
        <div className="flex gap-8 text-center mt-2">
          <div>
            <div className="text-2xl font-bold">{wordsTyped}</div>
            <div className="text-black/40 text-xs">Words typed</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{mistakes}</div>
            <div className="text-black/40 text-xs">Mistakes</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{Math.max(0, settings.bossHp - bossHp)}/{settings.bossHp}</div>
            <div className="text-black/40 text-xs">Boss damage dealt</div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={start}
          className="card px-8 py-3 font-semibold"
        >
          Try Again
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 mt-8" onClick={() => inputRef.current?.focus()}>
      <div className="flex gap-8 text-center">
        <div>
          <div className="text-2xl font-bold">{timeLeft}s</div>
          <div className="text-black/40 text-xs">Time</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{wordsTyped}</div>
          <div className="text-black/40 text-xs">Words</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{mistakes}</div>
          <div className="text-black/40 text-xs">Mistakes</div>
        </div>
      </div>

      <div className="card w-full max-w-xl p-4 flex flex-col gap-4">
        <div>
          <div className="flex justify-between text-xs text-black/40 mb-1">
            <span>Boss</span>
            <span>{bossHp}/{settings.bossHp}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "#ef4444" }}
              animate={{ width: `${bossHpPct}%` }}
              transition={{ ease: "easeOut", duration: 0.25 }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-black/40 mb-1">
            <span>You</span>
            <span>{playerHp}/100</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "#22c55e" }}
              animate={{ width: `${playerHpPct}%` }}
              transition={{ ease: "easeOut", duration: 0.25 }}
            />
          </div>
        </div>
      </div>

      <motion.div
        animate={bossHit ? { x: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.3 }}
        className="text-7xl"
      >
        👹
      </motion.div>

      <motion.div
        animate={playerHit ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ duration: 0.2 }}
        className="card p-6 text-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="text-3xl font-bold"
          >
            {currentWord}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder="Type the word and press enter to attack"
        className="card w-full max-w-xl px-4 py-3 text-center outline-none bg-transparent"
      />
      <p className="text-black/40 text-xs">Correct word hits the boss. A wrong word lets the boss hit you back.</p>
    </div>
  );
};
