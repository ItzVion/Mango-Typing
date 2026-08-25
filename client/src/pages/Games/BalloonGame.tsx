import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { playPop, playError } from "../../utils/sound";

type Difficulty = "easy" | "medium" | "hard";
type Balloon = { id: number; letter: string; x: number; y: number; speed: number; color: string };
type Popup = { id: number; x: number; y: number; text: string; positive: boolean };

// Rebalanced per feedback that the old tiers were too easy:
// new Easy ≈ old Medium, new Medium ≈ old Hard, new Hard is genuinely harder than before.
const SETTINGS: Record<Difficulty, { spawnMs: number; speed: number; speedJitter: number }> = {
  easy: { spawnMs: 850, speed: 55, speedJitter: 15 },
  medium: { spawnMs: 600, speed: 82, speedJitter: 22 },
  hard: { spawnMs: 420, speed: 118, speedJitter: 32 },
};

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
const GAME_H = 480;
const POINTS_HIT = 10;
const POINTS_MISS = -5;

export const BalloonGame = () => {
  const { state } = useLocation() as { state?: { difficulty: Difficulty; duration: number } };
  const difficulty = state?.difficulty ?? "easy";
  const duration = state?.duration ?? 60;
  const navigate = useNavigate();
  const settings = SETTINGS[difficulty];

  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [running, setRunning] = useState(true);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [shake, setShake] = useState(false);
  const nextId = useRef(0);
  const nextPopupId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const addPopup = (x: number, y: number, text: string, positive: boolean) => {
    const id = nextPopupId.current++;
    setPopups((p) => [...p, { id, x, y, text, positive }]);
    setTimeout(() => setPopups((p) => p.filter((pu) => pu.id !== id)), 700);
  };

  // Spawner
  useEffect(() => {
    if (!running) return;
    const spawn = setInterval(() => {
      setBalloons((prev) => [
        ...prev,
        {
          id: nextId.current++,
          letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
          x: 5 + Math.random() * 85,
          y: 0,
          speed: settings.speed + Math.random() * settings.speedJitter,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        },
      ]);
    }, settings.spawnMs);
    return () => clearInterval(spawn);
  }, [running, settings]);

  // Fall loop
  useEffect(() => {
    if (!running) return;
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setBalloons((prev) => {
        const next: Balloon[] = [];
        let missed = false;
        for (const b of prev) {
          const ny = b.y + b.speed * dt;
          if (ny >= GAME_H) {
            missed = true;
          } else {
            next.push({ ...b, y: ny });
          }
        }
        if (missed) {
          setRunning(false); // one balloon reaching the bottom ends the game
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  // Countdown
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!running) return;
    const key = e.key.toLowerCase();
    if (!LETTERS.includes(key)) return;
    setBalloons((prev) => {
      const match = prev.find((b) => b.letter === key);
      if (match) {
        playPop();
        setScore((s) => s + POINTS_HIT);
        addPopup(match.x, match.y, `+${POINTS_HIT}`, true);
        return prev.filter((b) => b.id !== match.id);
      }
      playError();
      setScore((s) => s + POINTS_MISS);
      setMisses((m) => m + 1);
      setShake(true);
      setTimeout(() => setShake(false), 220);
      addPopup(50, 40, `${POINTS_MISS}`, false);
      return prev;
    });
  };

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const playAgain = () => {
    setBalloons([]);
    setScore(0);
    setMisses(0);
    setTimeLeft(duration);
    setPopups([]);
    setRunning(true);
    setTimeout(() => containerRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-6">
      <BackButton to="/games" label="Back to Games" />
      <div className="flex gap-8 text-center">
        {[
          { label: "Time", value: `${timeLeft}s` },
          { label: "Score", value: score },
          { label: "Misses", value: misses },
          { label: "Difficulty", value: difficulty, cap: true },
        ].map((s) => (
          <div key={s.label}>
            <motion.div
              key={s.value}
              initial={{ scale: 1.35, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className={`text-2xl font-bold ${s.cap ? "capitalize" : ""}`}
            >
              {s.value}
            </motion.div>
            <div className="text-black/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <motion.div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKey}
        onClick={() => containerRef.current?.focus()}
        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
        transition={{ duration: 0.22 }}
        className="card relative w-full max-w-2xl overflow-hidden outline-none cursor-text"
        style={{ height: GAME_H }}
      >
        <AnimatePresence>
          {balloons.map((b) => (
            <motion.div
              key={b.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute flex items-center justify-center rounded-full text-white font-bold text-base select-none shadow-md"
              style={{
                left: `${b.x}%`,
                top: b.y,
                width: 40,
                height: 48,
                background: b.color,
                transform: "translateX(-50%)",
                fontFamily: 'Georgia, "Times New Roman", "Noto Serif", serif',
              }}
            >
              {b.letter}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {popups.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 2, x: `${p.x}%`, y: p.y }}
              animate={{ opacity: 1, scale: 1, y: p.y - 30 }}
              exit={{ opacity: 0, scale: 0.6, y: p.y - 55 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className={`absolute font-extrabold text-xl pointer-events-none select-none ${
                p.positive ? "text-green-500" : "text-red-500"
              }`}
              style={{ left: `${p.x}%`, transform: "translateX(-50%)" }}
            >
              {p.text}
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {!running && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 text-white"
            >
              <motion.h2
                initial={{ scale: 0.6, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="text-2xl font-bold"
              >
                Game Over
              </motion.h2>
              <p>Score: {score}</p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={playAgain}
                  className="px-5 py-2 rounded-xl bg-white text-black dark:bg-black dark:text-white font-semibold"
                >
                  Play Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/games")}
                  className="px-5 py-2 rounded-xl border border-white/40"
                >
                  Back to Games
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <p className="text-black/40 text-xs">
        Click the box, then press the letter key shown on each balloon. +{POINTS_HIT} per pop, {POINTS_MISS} per wrong key.
      </p>
    </div>
  );
};
