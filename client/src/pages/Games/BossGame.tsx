import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { Seo } from "../../components/Seo";

type Difficulty = "easy" | "medium" | "hard";
type Status = "ready" | "playing" | "won" | "lost";

const WORDS_5 = ["apple", "brave", "chair", "dance", "eagle", "flame", "grape", "house", "input", "joker", "lemon", "mango", "night", "ocean", "piano", "queen", "river", "stone", "tiger"];
const WORDS_6 = ["animal", "bridge", "candle", "dragon", "engine", "forest", "garden", "hunter", "island", "jungle", "kitten", "ladder", "market", "needle", "orange", "pencil", "rocket", "silver", "temple"];
const WORDS_7 = ["balance", "capture", "diamond", "elegant", "fantasy", "gateway", "harmony", "imagine", "journey", "kingdom", "lantern", "monster", "network", "octopus", "pumpkin", "quality", "rainbow", "thunder", "triumph", "volcano"];
const WORDS_8 = ["adventure", "brilliant", "challenge", "creature", "dangerous", "excellent", "firepower", "lightning", "nightmare", "precision", "powerful", "reaction", "strategy", "survival", "terrifying", "unstoppable", "victorious", "warrior"];

// Easy is the old Medium, Medium is the old Hard, Hard is a genuinely harder tier.
const SETTINGS: Record<Difficulty, { pool: string[]; bossHp: number; damage: number; bossAttack: number; attackMinMs: number; attackMaxMs: number; defendWindowMs: number }> = {
  easy: { pool: [...WORDS_5, ...WORDS_6], bossHp: 100, damage: 12, bossAttack: 18, attackMinMs: 5500, attackMaxMs: 8000, defendWindowMs: 2600 },
  medium: { pool: [...WORDS_6, ...WORDS_7], bossHp: 150, damage: 10, bossAttack: 22, attackMinMs: 4200, attackMaxMs: 6500, defendWindowMs: 2000 },
  hard: { pool: [...WORDS_7, ...WORDS_8], bossHp: 210, damage: 8, bossAttack: 28, attackMinMs: 3000, attackMaxMs: 4800, defendWindowMs: 1500 },
};

function shuffled(a: string[]) { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; }

const Boss = ({ hit, attack }: { hit: boolean; attack: boolean }) => <motion.svg viewBox="0 0 110 100" className="w-24 h-24 md:w-28 md:h-28" animate={hit ? { x: [0, -7, 7, 0] } : { y: [0, attack ? -4 : 3, 0] }} transition={{ duration: hit ? .25 : 1.8, repeat: hit ? 0 : Infinity }}>
  <path d="M28 28 18 8l20 13M82 28l10-20-20 13" fill="#F5A623" stroke="#f5f5f5" strokeWidth="2"/>
  <rect x="18" y="20" width="74" height="62" rx="22" fill={attack ? "#9b68df" : "#8766d8"} stroke="#f5f5f5" strokeWidth="2.5"/>
  <circle cx="42" cy="49" r="7" fill="#fff"/><circle cx="68" cy="49" r="7" fill="#fff"/><circle cx="42" cy="49" r="3"/><circle cx="68" cy="49" r="3"/>
  <path d="M40 66q15 10 30 0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
</motion.svg>;

const Player = ({ move, hit }: { move: "left" | "right" | null; hit: boolean }) => <motion.svg viewBox="0 0 72 86" className="w-14 h-16 md:w-16 md:h-[72px]" animate={move === "left" ? { x: [0, -48, -48, 0] } : move === "right" ? { x: [0, 48, 48, 0] } : { y: [0, -2, 0] }} transition={move ? { duration: .5 } : { duration: 1.8, repeat: Infinity }}>
  <path d="M36 8 9 66h54L36 8z" fill={hit ? "#ef4444" : "#f3f3f3"} stroke="#222" strokeWidth="2"/><circle cx="36" cy="42" r="10" fill="#F5A623"/><path d="M19 65h34l-5 12H24z" fill="#ddd" stroke="#222" strokeWidth="2"/>
</motion.svg>;

const Stat = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2 text-center min-w-[76px]"><div className="text-lg font-bold leading-none">{value}</div><div className="mt-1 text-[10px] text-white/40 uppercase tracking-wide">{label}</div></div>;

export const BossGame = () => {
  const { state } = useLocation() as { state?: { difficulty: Difficulty; duration: number } };
  const difficulty = state?.difficulty ?? "easy", duration = state?.duration ?? 60, settings = SETTINGS[difficulty];
  const [status, setStatus] = useState<Status>("ready"), [mode, setMode] = useState<"normal" | "defend">("normal");
  const [bossHp, setBossHp] = useState(settings.bossHp), [playerHp, setPlayerHp] = useState(100), [pool, setPool] = useState<string[]>([]);
  const [word, setWord] = useState(""), [input, setInput] = useState(""), [timeLeft, setTimeLeft] = useState(duration);
  const [wordsTyped, setWordsTyped] = useState(0), [dodged, setDodged] = useState(0), [hitsTaken, setHitsTaken] = useState(0);
  const [bossHit, setBossHit] = useState(false), [playerHit, setPlayerHit] = useState(false), [move, setMove] = useState<"left" | "right" | null>(null), [defendPct, setDefendPct] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null), timerRef = useRef<ReturnType<typeof setInterval> | null>(null), attackRef = useRef<ReturnType<typeof setTimeout> | null>(null), defendRef = useRef<ReturnType<typeof setTimeout> | null>(null), tickRef = useRef<ReturnType<typeof setInterval> | null>(null), statusRef = useRef(status);
  statusRef.current = status;

  const clearTimers = () => { if (timerRef.current) clearInterval(timerRef.current); if (attackRef.current) clearTimeout(attackRef.current); if (defendRef.current) clearTimeout(defendRef.current); if (tickRef.current) clearInterval(tickRef.current); };
  const nextWord = (p: string[]) => { const s = p.length ? p : shuffled(settings.pool); const [n, ...r] = s; setWord(n); setPool(r); };
  const scheduleAttack = () => { if (attackRef.current) clearTimeout(attackRef.current); attackRef.current = setTimeout(() => { if (statusRef.current !== "playing") return; setMode("defend"); setInput(""); setDefendPct(100); let elapsed = 0; tickRef.current = setInterval(() => { elapsed += 100; setDefendPct(Math.max(0, 100 - elapsed / settings.defendWindowMs * 100)); }, 100); defendRef.current = setTimeout(() => resolveDefend(false), settings.defendWindowMs); }, settings.attackMinMs + Math.random() * (settings.attackMaxMs - settings.attackMinMs)); };
  const resolveDefend = (ok: boolean) => { if (defendRef.current) clearTimeout(defendRef.current); if (tickRef.current) clearInterval(tickRef.current); setMode("normal"); setDefendPct(0); if (ok) { setDodged(n => n + 1); const side = Math.random() < .5 ? "left" : "right"; setMove(side); setTimeout(() => setMove(null), 550); } else { setHitsTaken(n => n + 1); setPlayerHit(true); setTimeout(() => setPlayerHit(false), 300); setPlayerHp(h => { const n = Math.max(0, h - settings.bossAttack); if (!n) setStatus("lost"); return n; }); } nextWord(pool); setInput(""); setTimeout(() => inputRef.current?.focus(), 30); scheduleAttack(); };
  const start = () => { clearTimers(); const s = shuffled(settings.pool); const [first, ...rest] = s; setPool(rest); setWord(first); setBossHp(settings.bossHp); setPlayerHp(100); setTimeLeft(duration); setWordsTyped(0); setDodged(0); setHitsTaken(0); setMode("normal"); setInput(""); setMove(null); setStatus("playing"); setTimeout(() => inputRef.current?.focus(), 50); };
  const submit = () => { if (status !== "playing" || !input.trim()) return; const a = input.trim().toLowerCase(); if (mode === "defend") { resolveDefend(a === "defend"); return; } if (a === word) { setWordsTyped(n => n + 1); setBossHit(true); setTimeout(() => setBossHit(false), 250); setBossHp(h => { const n = Math.max(0, h - settings.damage); if (!n) setStatus("won"); return n; }); } else { setPlayerHit(true); setTimeout(() => setPlayerHit(false), 200); } setInput(""); nextWord(pool); };
  useEffect(() => { if (status !== "playing") return; timerRef.current = setInterval(() => setTimeLeft(t => { if (t <= 1) { setStatus("lost"); return 0; } return t - 1; }), 1000); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [status]);
  useEffect(() => { if (status === "playing" && mode === "normal") scheduleAttack(); return () => { if (attackRef.current) clearTimeout(attackRef.current); }; }, [status, mode]);
  useEffect(() => clearTimers, []);
  const keyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") { e.preventDefault(); submit(); } if (mode === "defend" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { const side = e.key === "ArrowLeft" ? "left" : "right"; setMove(side); setTimeout(() => setMove(null), 550); } };
  const hp = bossHp / settings.bossHp * 100;
  const endTitle = status === "won" ? "Boss Defeated!" : "You Were Defeated";

  if (status === "ready") return <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }} className="flex min-h-[520px] flex-col items-center justify-center text-center gap-5"><Seo title="Boss Fight Typing Game" description="Defeat the boss by typing words and dodge its attacks." path="/home/games/boss"/><BackButton to="/home/typing-games" label="Back to Games"/><motion.h2 initial={{ scale: .85 }} animate={{ scale: 1 }} transition={{ duration: .35 }} className="text-3xl font-bold">Boss Fight</motion.h2><p className="max-w-md text-sm text-white/45">Type each word to damage the boss. When it attacks, type <b className="text-white">defend</b> before the timer runs out.</p><div className="text-sm text-white/50">{difficulty} · {duration}s</div><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }} onClick={start} className="rounded-xl border border-white/10 bg-white/[0.06] px-8 py-3 font-semibold hover:bg-white/10 transition">Start</motion.button></motion.div>;

  if (status === "won" || status === "lost") return <AnimatePresence mode="wait"><motion.div key={status} initial={{ opacity: 0, scale: .92, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .45, ease: "easeOut" }} className="flex min-h-[520px] flex-col items-center justify-center gap-5 text-center"><motion.div initial={{ scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .12, type: "spring", stiffness: 260, damping: 18 }} className="text-5xl">{status === "won" ? "🏆" : "💀"}</motion.div><motion.h2 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .18 }} className="text-3xl font-bold">{endTitle}</motion.h2><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25 }} className="flex gap-8 text-center text-sm"><div><b className="block text-2xl">{wordsTyped}</b><span className="text-white/40">Words</span></div><div><b className="block text-2xl">{dodged}</b><span className="text-white/40">Dodged</span></div><div><b className="block text-2xl">{hitsTaken}</b><span className="text-white/40">Hits</span></div></motion.div><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }} onClick={start} className="rounded-xl border border-white/10 bg-white/[0.06] px-8 py-3 font-semibold hover:bg-white/10 transition">Try Again</motion.button></motion.div></AnimatePresence>;

  const words = [word, pool[0], pool[1]].filter(Boolean);
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }} className="h-[calc(100vh-160px)] min-h-[500px] max-h-[620px] overflow-hidden flex flex-col gap-3" onClick={() => inputRef.current?.focus()}><Seo title="Boss Fight Typing Game" description="Defeat the boss by typing words and dodge its attacks." path="/home/games/boss"/>
    <div className="flex items-end justify-between gap-4 shrink-0"><div><h1 className="text-2xl md:text-3xl font-bold">Boss Battle</h1><p className="text-xs md:text-sm text-white/40 mt-1">Type the words to destroy the boss. Don’t get hit!</p></div><div className="flex gap-2"><Stat label="Time" value={`${timeLeft}s`}/><Stat label="Words" value={wordsTyped}/><Stat label="Dodged" value={dodged}/></div></div>
    <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101112]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[46%] min-w-[230px] max-w-[460px]"><div className="flex justify-between text-[11px] text-white/45 mb-1"><span>Boss</span><span>{bossHp}/{settings.bossHp}</span></div><div className="h-2 rounded-full bg-white/10 overflow-hidden"><motion.div className="h-full bg-[#a855f7]" animate={{width:`${hp}%`}}/></div></div>
      <div className="absolute top-[13%] left-1/2 -translate-x-1/2"><Boss hit={bossHit} attack={mode === "defend"}/></div>
      <AnimatePresence>{words.map((w, i) => <motion.div key={`${w}-${i}`} initial={{opacity:0,y:-18}} animate={{opacity:i===0?1:.28,y:0}} exit={{opacity:0,y:18}} transition={{duration:.18}} className="absolute top-[48%] rounded-lg border border-red-500/70 bg-[#171719] px-4 py-2 text-sm font-medium" style={{left:`${50+(i-1)*17}%`,transform:"translateX(-50%)"}}>{w}</motion.div>)}</AnimatePresence>
      {mode === "defend" && <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-[37%] left-1/2 -translate-x-1/2 w-44 text-center"><div className="text-[11px] font-semibold text-[#F5A623] mb-1">ATTACK — TYPE DEFEND</div><div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><motion.div className="h-full bg-[#F5A623]" animate={{width:`${defendPct}%`}}/></div></motion.div>}
      <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2 flex flex-col items-center"><div className="text-[11px] text-white/45 mb-1">You</div><div className="w-36 h-2 rounded-full bg-white/10 overflow-hidden mb-1"><motion.div className="h-full bg-green-500" animate={{width:`${playerHp}%`}}/></div><div className="text-[10px] text-white/40 mb-0.5">{playerHp}/100</div><Player move={move} hit={playerHit}/></div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] md:text-[11px] text-white/30 whitespace-nowrap">← / → dodge · Type the falling word · Enter</div>
    </div>
    <div className="shrink-0 flex gap-2"><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={keyDown} autoFocus placeholder={mode === "defend" ? "Type defend..." : "Type the word..."} className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center text-sm outline-none focus:border-white/20"/><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: .98 }} onClick={submit} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90">Enter</motion.button></div>
  </motion.div>;
};