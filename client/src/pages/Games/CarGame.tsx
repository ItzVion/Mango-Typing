import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";

type Difficulty = "easy" | "medium" | "hard";

const WORD_BANK_EASY = [
  "the","fox","dog","and","runs","into","near","sing","above","trees",
  "sun","sets","hills","as","night","cold","wind","open","sky","play",
  "games","home","warm","table","fast","slow","road","car","gas","stop",
];
const WORD_BANK_MEDIUM = [
  "quick","brown","jumps","over","lazy","forest","river","while","birds",
  "behind","falls","blows","fields","where","cattle","graze","under","clear",
  "children","laughing","loudly","until","evening","comes","quietly","dinner",
  "waits","family","gathers","around","engine","throttle","gravel","tunnel",
];
const WORD_BANK_HARD = [
  "acceleration","tremendous","overtaking","competitive","turbocharged",
  "aerodynamic","suspension","navigation","dashboard","windscreen",
  "combustion","transmission","horsepower","championship","instrument",
  "reflection","determined","adventurous","spectacular","magnificent",
];

const DIFFICULTY_SETTINGS: Record<Difficulty, { bank: string[]; decayPerSec: number; gainCorrect: number }> = {
  easy: { bank: WORD_BANK_EASY, decayPerSec: 3, gainCorrect: 12 },
  medium: { bank: WORD_BANK_MEDIUM, decayPerSec: 4, gainCorrect: 10 },
  hard: { bank: WORD_BANK_HARD, decayPerSec: 5.5, gainCorrect: 8 },
};

const MAX_SPEED = 120;
const START_SPEED = 25;
const GAIN_PARTIAL = 3.3;
const QUEUE_SIZE = 6;

export const CarGame = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { difficulty: Difficulty; duration: number } };
  const difficulty = state?.difficulty ?? "easy";
  const DURATION_SEC = state?.duration ?? 60;
  const { bank: WORD_BANK, decayPerSec: DECAY_PER_SEC, gainCorrect: GAIN_CORRECT } = DIFFICULTY_SETTINGS[difficulty];

  const randomWord = () => WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];

  const [queue, setQueue] = useState<string[]>(() =>
    Array.from({ length: QUEUE_SIZE }, randomWord)
  );
  const [input, setInput] = useState("");
  const [speed, setSpeed] = useState(START_SPEED);
  const [distanceKm, setDistanceKm] = useState(0);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [mistakeLog, setMistakeLog] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(DURATION_SEC);
  const [status, setStatus] = useState<"ready" | "playing" | "over">("ready");
  const [overReason, setOverReason] = useState<"speed" | "time" | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const speedRef = useRef(speed);
  speedRef.current = speed;
  const distanceRef = useRef(distanceKm);
  distanceRef.current = distanceKm;

  useEffect(() => {
    if (status !== "playing") return;

    const tick = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      const nextSpeed = Math.max(0, speedRef.current - DECAY_PER_SEC * dt);
      const nextDistance = distanceRef.current + (nextSpeed * dt) / 3600;
      setSpeed(nextSpeed);
      setDistanceKm(nextDistance);

      const elapsed = startedAtRef.current ? (ts - startedAtRef.current) / 1000 : 0;
      const remaining = Math.max(0, DURATION_SEC - elapsed);
      setTimeLeft(Math.ceil(remaining));

      if (nextSpeed <= 0) {
        setStatus("over");
        setOverReason("speed");
        return;
      }
      if (remaining <= 0) {
        setStatus("over");
        setOverReason("time");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [status]);

  const start = () => {
    setQueue(Array.from({ length: QUEUE_SIZE }, randomWord));
    setInput("");
    setSpeed(START_SPEED);
    setDistanceKm(0);
    setWordsTyped(0);
    setMistakes(0);
    setMistakeLog([]);
    setTimeLeft(DURATION_SEC);
    setOverReason(null);
    lastTsRef.current = null;
    startedAtRef.current = performance.now();
    setStatus("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitWord = (raw: string) => {
    const attempt = raw.trim();
    const target = queue[0];
    if (!attempt) {
      setMistakes((m) => m + 1);
      setMistakeLog((log) => [...log.slice(-7), target]);
    } else if (attempt === target) {
      setSpeed((s) => Math.min(MAX_SPEED, s + GAIN_CORRECT));
      setWordsTyped((w) => w + 1);
    } else {
      let prefixLen = 0;
      for (let i = 0; i < Math.min(attempt.length, target.length); i++) {
        if (attempt[i] === target[i]) prefixLen++;
        else break;
      }
      setMistakes((m) => m + 1);
      setMistakeLog((log) => [...log.slice(-7), target]);
      if (prefixLen > 0) {
        setSpeed((s) => Math.min(MAX_SPEED, s + GAIN_PARTIAL));
      }
    }
    setQueue((q) => [...q.slice(1), randomWord()]);
    setInput("");
  };

  const handleChange = (val: string) => {
    if (val.endsWith(" ")) {
      commitWord(val);
      return;
    }
    setInput(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitWord(input);
    }
  };

  const speedPct = (speed / MAX_SPEED) * 100;
  const gaugeColor =
    speedPct > 66 ? "#22c55e" : speedPct > 33 ? "#eab308" : speedPct > 12 ? "#f97316" : "#ef4444";

  const roadDuration = speed > 0 ? Math.max(0.15, 3 - (speed / MAX_SPEED) * 2.6) : 999;

  if (status === "ready") {
    return (
      <div className="flex flex-col items-center gap-6 mt-16">
        <BackButton to="/games" label="Back to Games" />
        <h2 className="text-2xl font-bold">Speed Typer</h2>
        <p className="text-black/40 text-sm max-w-md text-center">
          Type each word correctly to gain speed. Wrong or skipped words slow you
          down. Keep your speed above 0 to keep driving.
        </p>
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

  if (status === "over") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 mt-16"
      >
        <BackButton to="/games" label="Back to Games" />
        <h2 className="text-2xl font-bold">
          {overReason === "speed" ? "Ran Out of Speed! 🛑" : "Time's Up 🏁"}
        </h2>
        <div className="text-5xl font-bold">{distanceKm.toFixed(2)} km</div>
        <div className="text-black/40 text-sm">Distance traveled</div>
        <div className="flex gap-8 text-center mt-2">
          <div>
            <div className="text-2xl font-bold">{wordsTyped}</div>
            <div className="text-black/40 text-xs">Words typed</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{mistakes}</div>
            <div className="text-black/40 text-xs">Mistakes</div>
          </div>
        </div>
        {mistakeLog.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {mistakeLog.map((w, i) => (
              <span key={i} className="text-[var(--error)] bg-[var(--error)]/10 px-2 py-1 rounded text-sm">
                {w}
              </span>
            ))}
          </div>
        )}
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
        <div>
          <div className="text-2xl font-bold">{distanceKm.toFixed(2)} km</div>
          <div className="text-black/40 text-xs">Distance</div>
        </div>
        <div>
          <div className="text-2xl font-bold capitalize">{difficulty}</div>
          <div className="text-black/40 text-xs">Difficulty</div>
        </div>
      </div>

      <div className="card w-full max-w-xl p-3">
        <div className="flex justify-between text-xs text-black/40 mb-1">
          <span>0</span>
          <span style={{ color: gaugeColor }}>{Math.round(speed)} km/h</span>
          <span>{MAX_SPEED}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${speedPct}%`, backgroundColor: gaugeColor }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </div>
      </div>

      <div className="relative w-full max-w-xl h-24 card overflow-hidden flex items-center justify-start pl-6">
        <div
          className="absolute inset-0 flex items-center"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, currentColor 0 24px, transparent 24px 64px)",
            color: "rgba(0,0,0,0.08)",
            backgroundSize: "64px 4px",
            backgroundPosition: "0 50%",
            animation: `road-scroll-rev ${roadDuration}s linear infinite`,
          }}
        />
        <motion.div
          animate={{ opacity: speed > 0 ? 1 : 0.35, filter: speed > 0 ? "grayscale(0)" : "grayscale(1)" }}
          className="text-5xl z-10"
          style={{ transform: "scaleX(-1)" }}
        >
          🏎️
        </motion.div>
      </div>

      <div className="card p-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={queue[0]}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="text-3xl font-bold"
          >
            {queue[0]}
          </motion.div>
        </AnimatePresence>
        <div className="text-black/40 text-sm mt-2">{queue.slice(1).join(" ")}</div>
      </div>

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder="Type the word, then press space"
        className="card w-full max-w-xl px-4 py-3 text-center outline-none bg-transparent"
      />
      <p className="text-black/40 text-xs">Type the word shown and press space or enter to confirm it.</p>

      <style>{`
        @keyframes road-scroll-rev {
          from { background-position: -64px 50%; }
          to { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
};
