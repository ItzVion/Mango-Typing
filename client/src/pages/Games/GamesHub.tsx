import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { Seo } from "../../components/Seo";

type GameKey = "balloon" | "car" | "boss";
type Difficulty = "easy" | "medium" | "hard";
const BalloonGameIcon = () => <svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true"><ellipse cx="16" cy="13" rx="10" ry="12" fill="#ef4444" stroke="#fff" strokeWidth="1.5"/><path d="M16 25l-2 3h4l-2-3z" fill="#ef4444" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/><path d="M16 28v3" stroke="currentColor" strokeWidth="1.2"/></svg>;
const CarGameIcon = () => <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true"><path d="M5 20l2-7a3 3 0 0 1 3-2h12a3 3 0 0 1 3 2l2 7v4a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H9v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4z" fill="#F5A623" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="10" cy="21" r="2" fill="#171717" stroke="#fff" strokeWidth="1"/><circle cx="22" cy="21" r="2" fill="#171717" stroke="#fff" strokeWidth="1"/><path d="M8 14h16" stroke="#fff" strokeWidth="1.2" opacity=".7"/></svg>;
const BossGameIcon = () => <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true"><path d="M16 6c-6 0-10 5-10 10 0 5 3 8 10 8s10-3 10-8c0-5-4-10-10-10z" fill="#8b6bd8" stroke="#fff" strokeWidth="1.5"/><path d="M10 8 7 3l4 3zM22 8l3-5-4 3z" fill="#F5A623"/><circle cx="12.5" cy="15" r="2" fill="#fff"/><circle cx="19.5" cy="15" r="2" fill="#fff"/><circle cx="12.5" cy="15" r=".9" fill="#1a1a1a"/><circle cx="19.5" cy="15" r=".9" fill="#1a1a1a"/><path d="M12 20q4 3 8 0" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>;
const GAMES: {key:GameKey;title:string;desc:string;detail:string;icon:()=>ReactElement;number:string}[] = [
  {key:"balloon",title:"Balloon Pop",desc:"Quick reactions",detail:"Letters rise and fall. Type the matching key before each balloon reaches the top.",icon:BalloonGameIcon,number:"01"},
  {key:"car",title:"Car Race",desc:"Build your rhythm",detail:"Type each word accurately to keep your car moving and build distance.",icon:CarGameIcon,number:"02"},
  {key:"boss",title:"Boss Fight",desc:"Accuracy under pressure",detail:"Type attack words and react with “defend” when the boss strikes.",icon:BossGameIcon,number:"03"},
];
const DURATIONS = [60,120,180,300];

export const GamesHub = () => {
  const [selected,setSelected] = useState<GameKey|null>(null);
  const [difficulty,setDifficulty] = useState<Difficulty>("easy");
  const [duration,setDuration] = useState(60);
  const navigate = useNavigate();
  const selectedGame = GAMES.find(game => game.key === selected);
  return (
    <main className="mt-page">
      <Seo title="Typing Games — Balloon Pop, Car Race, Boss Fight" description="Practice typing speed and accuracy with Balloon Pop, Car Race, and Boss Fight on MangoTyping." path="/home/typing-games"/>
      <BackButton to="/home" label="Back to practice"/>
      <header className="mt-page-header">
        <span className="mt-eyebrow">Play · Practise · Improve</span>
        <h1 className="mt-page-title">Typing games</h1>
        <p className="mt-page-description">Make your practice feel like play. Pick a challenge, set the pace, and build speed without losing accuracy.</p>
      </header>
      <section aria-label="Choose a typing game" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {GAMES.map((game,index) => {
          const active = selected === game.key;
          return <motion.button key={game.key} type="button" aria-pressed={active} onClick={() => setSelected(game.key)}
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:.28,delay:index*.05}}
            whileHover={{y:-3}} whileTap={{scale:.99}}
            className={"mt-action-card min-h-[218px] "+(active?"is-selected":"")}>
            <div className="flex w-full items-start justify-between gap-4">
              <span className="mt-icon-tile"><game.icon/></span>
              <span className="font-mono text-xs tracking-wider text-[var(--text-subtle)]">{game.number}</span>
            </div>
            <span className="mt-6 text-lg font-semibold tracking-tight">{game.title}</span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-[.09em] text-[#f5a623]">{game.desc}</span>
            <span className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{game.detail}</span>
            <span className="mt-auto pt-5 text-sm font-semibold text-[var(--text-primary)]">{active?"Selected":"Choose game"} <span className="ml-1 text-[#f5a623]" aria-hidden="true">→</span></span>
          </motion.button>;
        })}
      </section>
      <AnimatePresence mode="wait">
        {selected && selectedGame && <motion.section key={selected} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.2}} className="mt-game-config" aria-label="Game settings">
          <div className="flex flex-col gap-1 border-b border-[var(--card-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><span className="mt-eyebrow">Ready when you are</span><h2 className="mt-2 text-xl font-semibold tracking-tight">{selectedGame.title}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Choose a difficulty and session length.</p></div>
            <span className="text-xs font-medium text-[var(--text-subtle)]">Settings apply to this round.</span>
          </div>
          <div className="grid gap-7 py-6 sm:grid-cols-2">
            <div><p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Difficulty</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty">
                {(["easy","medium","hard"] as Difficulty[]).map(value => <button key={value} type="button" aria-pressed={difficulty===value} onClick={()=>setDifficulty(value)} className="mt-choice-chip capitalize">{value}</button>)}
              </div><p className="mt-3 text-xs leading-5 text-[var(--text-subtle)]">Easy is a relaxed warm-up. Hard is for confident typists.</p>
            </div>
            <div><p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[var(--text-muted)]">Session length</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Session length">
                {DURATIONS.map(value => <button key={value} type="button" aria-pressed={duration===value} onClick={()=>setDuration(value)} className="mt-choice-chip">{value/60} min</button>)}
              </div><p className="mt-3 text-xs leading-5 text-[var(--text-subtle)]">Choose a quick warm-up or a longer challenge.</p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--card-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={()=>setSelected(null)} className="mt-button-secondary">Choose another game</button>
            <button type="button" onClick={()=>navigate("/home/games/"+selected,{state:{difficulty,duration}})} className="mt-button-primary w-full sm:w-auto">Start game <span aria-hidden="true">→</span></button>
          </div>
        </motion.section>}
      </AnimatePresence>
      <p className="text-center text-xs leading-6 text-[var(--text-subtle)]">Tip: short, focused sessions with accurate typing are better practice than rushing every word.</p>
    </main>
  );
};
