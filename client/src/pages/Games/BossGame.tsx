import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { Seo } from "../../components/Seo";

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

const SETTINGS: Record<
  Difficulty,
  { pool: string[]; bossHp: number; damage: number; bossAttack: number; attackMinMs: number; attackMaxMs: number; defendWindowMs: number }
> = {
  easy: { pool: WORDS_5, bossHp: 60, damage: 15, bossAttack: 15, attackMinMs: 7000, attackMaxMs: 10000, defendWindowMs: 3200 },
  medium: { pool: [...WORDS_5, ...WORDS_6], bossHp: 100, damage: 12, bossAttack: 18, attackMinMs: 5500, attackMaxMs: 8000, defendWindowMs: 2600 },
  hard: { pool: [...WORDS_6, ...WORDS_7], bossHp: 150, damage: 10, bossAttack: 22, attackMinMs: 4200, attackMaxMs: 6500, defendWindowMs: 2000 },
};

function shuffled(arr: string[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// --- Custom art — no emoji anywhere in this game. Simple line/shape SVGs
// that match the site's existing stick-figure/icon style. ---

const TrophyIcon = () => (
  <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
    <path d="M20 10h24v14a12 12 0 0 1-24 0V10z" stroke="#F5A623" strokeWidth="3" strokeLinejoin="round" />
    <path d="M20 14h-8a2 2 0 0 0-2 2v2a10 10 0 0 0 10 10" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
    <path d="M44 14h8a2 2 0 0 1 2 2v2a10 10 0 0 1-10 10" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
    <line x1="32" y1="36" x2="32" y2="46" stroke="#F5A623" strokeWidth="3" strokeLinecap="round" />
    <path d="M22 54h20l-3-8H25l-3 8z" stroke="#F5A623" strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

const SkullIcon = () => (
  <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
    <path
      d="M32 8c-11 0-18 8-18 18 0 7 3 11 6 14v8a3 3 0 0 0 3 3h4v-6h4v6h6v-6h4v6h4a3 3 0 0 0 3-3v-8c3-3 6-7 6-14 0-10-7-18-18-18z"
      stroke="#9a9a9a" strokeWidth="3" strokeLinejoin="round"
    />
    <circle cx="24" cy="28" r="4" fill="#9a9a9a" />
    <circle cx="40" cy="28" r="4" fill="#9a9a9a" />
    <path d="M29 36h6l-3 5-3-5z" fill="#9a9a9a" />
  </svg>
);

const ShieldIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#F5A623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
  </svg>
);

// Mage-like player sprite: simple robe triangle + head + a staff, colored
// with the site's accent. Dodges by hopping sideways; flashes red when hit.
const PlayerSprite = ({ dodge, hit }: { dodge: "left" | "right" | null; hit: boolean }) => (
  <motion.svg
    viewBox="0 0 80 100"
    width="70"
    height="88"
    animate={
      dodge === "left"
        ? { x: [0, -34, -34, 0], rotate: [0, -8, -8, 0] }
        : dodge === "right"
        ? { x: [0, 34, 34, 0], rotate: [0, 8, 8, 0] }
        : { y: [0, -3, 0] }
    }
    transition={dodge ? { duration: 0.55, times: [0, 0.3, 0.7, 1], ease: "easeOut" } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
  >
    {/* Robe */}
    <path d="M40 46 L58 92 H22 Z" fill={hit ? "#ef4444" : "#2f2f36"} stroke="#f5f5f5" strokeWidth="2" />
    <path d="M40 46 L40 92" stroke="#f5f5f5" strokeWidth="1.5" opacity="0.4" />
    {/* Head */}
    <circle cx="40" cy="30" r="14" fill="none" stroke="#f5f5f5" strokeWidth="2.5" />
    {/* Hood trim */}
    <path d="M26 24 a14 14 0 0 1 28 0" fill="none" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round" />
    {/* Staff */}
    <line x1="62" y1="20" x2="62" y2="86" stroke="#c9c9c9" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="62" cy="16" r="5" fill="#F5A623" />
  </motion.svg>
);

// Rounded blobby monster — friendly cartoon shape, not gross. Winds up
// before attacking, flashes/shakes when hit by a fireball.
const MonsterSprite = ({ hit, winding }: { hit: boolean; winding: boolean }) => (
  <motion.svg
    viewBox="0 0 120 120"
    width="110"
    height="110"
    animate={
      hit
        ? { x: [0, -10, 10, -6, 6, 0] }
        : winding
        ? { scale: [1, 1.12, 1.05, 1.15], rotate: [0, -3, 3, -2] }
        : { y: [0, -5, 0] }
    }
    transition={hit ? { duration: 0.35 } : winding ? { duration: 0.5, repeat: Infinity, repeatType: "reverse" } : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
  >
    <ellipse cx="60" cy="105" rx="30" ry="6" fill="rgba(0,0,0,0.35)" />
    {/* Body */}
    <path
      d="M60 20c-24 0-38 18-38 40 0 18 12 32 38 32s38-14 38-32c0-22-14-40-38-40z"
      fill={winding ? "#a855f7" : "#8b6bd8"}
      stroke="#f5f5f5"
      strokeWidth="2.5"
    />
    {/* Horns */}
    <path d="M38 26 L30 8 L46 20 Z" fill="#F5A623" stroke="#f5f5f5" strokeWidth="1.5" />
    <path d="M82 26 L90 8 L74 20 Z" fill="#F5A623" stroke="#f5f5f5" strokeWidth="1.5" />
    {/* Eyes */}
    <circle cx="46" cy="52" r="7" fill="#fff" />
    <circle cx="74" cy="52" r="7" fill="#fff" />
    <circle cx="46" cy="52" r="3.2" fill="#1a1a1a" />
    <circle cx="74" cy="52" r="3.2" fill="#1a1a1a" />
    {/* Mouth */}
    <path d="M46 70 Q60 80 74 70" stroke="#f5f5f5" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* Belly spots */}
    <circle cx="60" cy="82" r="4" fill="#f5f5f5" opacity="0.5" />
  </motion.svg>
);

// Fireball projectile: travels from the player's position to the monster's,
// with a short glowing trail. Rendered only while in flight.
const Fireball = ({ direction }: { direction: "toBoss" | "toPlayer" }) => (
  <motion.div
    initial={{ left: direction === "toBoss" ? "18%" : "78%", opacity: 0, scale: 0.6 }}
    animate={{ left: direction === "toBoss" ? "78%" : "18%", opacity: [0, 1, 1, 0], scale: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.45, ease: "easeIn" }}
    className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-20"
    style={{ width: 22, height: 22 }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        background: direction === "toBoss"
          ? "radial-gradient(circle, #fff2c7 0%, #F5A623 45%, #d94f1e 100%)"
          : "radial-gradient(circle, #ffd9d9 0%, #ef4444 45%, #7f1d1d 100%)",
        boxShadow: direction === "toBoss" ? "0 0 16px 4px rgba(245,166,35,0.7)" : "0 0 16px 4px rgba(239,68,68,0.7)",
      }}
    />
  </motion.div>
);

export const BossGame = () => {
  const { state } = useLocation() as { state?: { difficulty: Difficulty; duration: number } };
  const difficulty = state?.difficulty ?? "easy";
  const duration = state?.duration ?? 60;
  const navigate = useNavigate();
  const settings = SETTINGS[difficulty];

  const [status, setStatus] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [mode, setMode] = useState<"normal" | "defend">("normal");
  const [bossHp, setBossHp] = useState(settings.bossHp);
  const [playerHp, setPlayerHp] = useState(100);
  const [wordPool, setWordPool] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [wordsTyped, setWordsTyped] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [dodged, setDodged] = useState(0);
  const [hitsTaken, setHitsTaken] = useState(0);

  const [bossHit, setBossHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [dodgeDir, setDodgeDir] = useState<"left" | "right" | null>(null);
  const [fireball, setFireball] = useState<"toBoss" | "toPlayer" | null>(null);
  const [defendPct, setDefendPct] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defendDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defendTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const clearAllTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
    if (defendDeadlineRef.current) clearTimeout(defendDeadlineRef.current);
    if (defendTickRef.current) clearInterval(defendTickRef.current);
  };

  const nextWord = (pool: string[]): [string, string[]] => {
    let remaining = pool;
    if (remaining.length === 0) remaining = shuffled(settings.pool);
    const [word, ...rest] = remaining;
    return [word, rest];
  };

  const scheduleAttack = () => {
    if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
    const delay = settings.attackMinMs + Math.random() * (settings.attackMaxMs - settings.attackMinMs);
    attackTimeoutRef.current = setTimeout(() => {
      if (statusRef.current !== "playing") return;
      triggerAttack();
    }, delay);
  };

  const triggerAttack = () => {
    setMode("defend");
    setCurrentWord("defend");
    setInput("");
    const windowMs = settings.defendWindowMs;
    let elapsed = 0;
    setDefendPct(100);
    defendTickRef.current = setInterval(() => {
      elapsed += 100;
      setDefendPct(Math.max(0, 100 - (elapsed / windowMs) * 100));
    }, 100);
    defendDeadlineRef.current = setTimeout(() => resolveAttack(false), windowMs);
  };

  const resolveAttack = (dodgedSuccessfully: boolean) => {
    if (defendDeadlineRef.current) clearTimeout(defendDeadlineRef.current);
    if (defendTickRef.current) clearInterval(defendTickRef.current);
    setDefendPct(0);

    if (dodgedSuccessfully) {
      setDodged((d) => d + 1);
      const side = Math.random() < 0.5 ? "left" : "right";
      setDodgeDir(side);
      setFireball("toPlayer");
      setTimeout(() => setDodgeDir(null), 550);
      setTimeout(() => setFireball(null), 450);
    } else {
      setHitsTaken((h) => h + 1);
      setPlayerHit(true);
      setFireball("toPlayer");
      setTimeout(() => setPlayerHit(false), 300);
      setTimeout(() => setFireball(null), 450);
      setPlayerHp((hp) => {
        const next = Math.max(0, hp - settings.bossAttack);
        if (next === 0) setStatus("lost");
        return next;
      });
    }

    setMode("normal");
    setWordPool((pool) => {
      const [word, rest] = nextWord(pool);
      setCurrentWord(word);
      return rest;
    });
    setInput("");
    scheduleAttack();
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const start = () => {
    clearAllTimers();
    const initialPool = shuffled(settings.pool);
    const [word, rest] = nextWord(initialPool);
    setWordPool(rest);
    setCurrentWord(word);
    setMode("normal");
    setBossHp(settings.bossHp);
    setPlayerHp(100);
    setInput("");
    setTimeLeft(duration);
    setWordsTyped(0);
    setMistakes(0);
    setDodged(0);
    setHitsTaken(0);
    setDodgeDir(null);
    setFireball(null);
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

  useEffect(() => {
    if (status === "playing" && mode === "normal") scheduleAttack();
    return () => {
      if (attackTimeoutRef.current) clearTimeout(attackTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => clearAllTimers, []);

  const handleSubmit = () => {
    if (status !== "playing") return;
    const attempt = input.trim().toLowerCase();
    if (!attempt) return;

    if (mode === "defend") {
      resolveAttack(attempt === "defend");
      return;
    }

    if (attempt === currentWord) {
      setWordsTyped((w) => w + 1);
      setFireball("toBoss");
      setTimeout(() => setFireball(null), 450);
      setTimeout(() => {
        setBossHit(true);
        setTimeout(() => setBossHit(false), 250);
        setBossHp((hp) => {
          const next = Math.max(0, hp - settings.damage);
          if (next === 0) setStatus("won");
          return next;
        });
      }, 420);
    } else {
      setMistakes((m) => m + 1);
      setPlayerHit(true);
      setTimeout(() => setPlayerHit(false), 200);
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
        <Seo
          title="Boss Fight Typing Game — Type to Deal Damage"
          description="Defeat the boss by typing words accurately and quickly, and type DEFEND to dodge its attacks. A challenge mode for practicing typing speed and accuracy under pressure."
          path="/home/games/boss"
        />
        <BackButton to="/home/typing-games" label="Back to Games" />
        <h2 className="text-2xl font-bold">Boss Fight</h2>
        <p className="text-black/40 dark:text-white/40 text-sm max-w-md text-center">
          Type the word shown to launch a fireball at the boss. When it winds up to
          attack, the prompt switches — type <span className="font-semibold text-[var(--text-primary)]">defend</span> before
          the bar runs out to dodge. Bring the boss to 0 HP before time runs out.
        </p>
        <div className="flex gap-4 text-xs text-black/40 dark:text-white/40">
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
        <BackButton to="/home/typing-games" label="Back to Games" />
        <h2 className="text-2xl font-bold">{status === "won" ? "Boss Defeated!" : "You Were Defeated"}</h2>
        {status === "won" ? <TrophyIcon /> : <SkullIcon />}
        <div className="flex gap-8 text-center mt-2 flex-wrap justify-center">
          <div>
            <div className="text-2xl font-bold">{wordsTyped}</div>
            <div className="text-black/40 dark:text-white/40 text-xs">Words typed</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{dodged}</div>
            <div className="text-black/40 dark:text-white/40 text-xs">Attacks dodged</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{hitsTaken}</div>
            <div className="text-black/40 dark:text-white/40 text-xs">Attacks taken</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{Math.max(0, settings.bossHp - bossHp)}/{settings.bossHp}</div>
            <div className="text-black/40 dark:text-white/40 text-xs">Boss damage dealt</div>
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
    <div className="flex flex-col items-center gap-5 mt-6" onClick={() => inputRef.current?.focus()}>
      <div className="flex gap-8 text-center">
        <div>
          <div className="text-2xl font-bold">{timeLeft}s</div>
          <div className="text-black/40 dark:text-white/40 text-xs">Time</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{wordsTyped}</div>
          <div className="text-black/40 dark:text-white/40 text-xs">Words</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{dodged}</div>
          <div className="text-black/40 dark:text-white/40 text-xs">Dodged</div>
        </div>
      </div>

      <div className="card w-full max-w-2xl p-4 flex flex-col gap-4">
        <div>
          <div className="flex justify-between text-xs text-black/40 dark:text-white/40 mb-1">
            <span>Boss</span>
            <span>{bossHp}/{settings.bossHp}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "#a855f7" }}
              animate={{ width: `${bossHpPct}%` }}
              transition={{ ease: "easeOut", duration: 0.25 }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-black/40 dark:text-white/40 mb-1">
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

      {/* Arena */}
      <div className="relative w-full max-w-2xl h-[220px] card overflow-hidden">
        <div
          className="absolute left-0 right-0 bottom-10 h-px"
          style={{ background: "var(--card-border)" }}
        />
        <div className="absolute left-[10%] bottom-6">
          <PlayerSprite dodge={dodgeDir} hit={playerHit} />
        </div>
        <div className="absolute right-[10%] bottom-6">
          <MonsterSprite hit={bossHit} winding={mode === "defend"} />
        </div>
        <AnimatePresence>{fireball && <Fireball key={fireball + Date.now()} direction={fireball} />}</AnimatePresence>

        <AnimatePresence>
          {mode === "defend" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 z-10"
            >
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: "rgba(245,166,35,0.15)", color: "#F5A623" }}>
                <ShieldIcon size={14} />
                Incoming attack — type DEFEND!
              </div>
              <div className="w-40 h-1.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: "#F5A623", width: `${defendPct}%` }} transition={{ duration: 0.1, ease: "linear" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        animate={mode === "defend" ? { scale: [1, 1.04, 1] } : {}}
        transition={{ duration: 0.5, repeat: mode === "defend" ? Infinity : 0 }}
        className="card p-6 text-center"
        style={mode === "defend" ? { borderColor: "#F5A623" } : undefined}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord + mode}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="text-3xl font-bold"
            style={mode === "defend" ? { color: "#F5A623" } : undefined}
          >
            {mode === "defend" ? "DEFEND" : currentWord}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder={mode === "defend" ? "Type defend and press enter!" : "Type the word and press enter to attack"}
        className="card w-full max-w-xl px-4 py-3 text-center outline-none bg-transparent"
      />
      <p className="text-black/40 dark:text-white/40 text-xs">
        Correct word launches a fireball. When the boss winds up, type "defend" before the bar empties to dodge.
      </p>
    </div>
  );
};
