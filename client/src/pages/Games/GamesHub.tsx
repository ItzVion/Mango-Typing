import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiArrowUpRight, FiShield, FiTarget, FiTruck } from "react-icons/fi";
import { BackButton } from "../../components/BackButton";
import { Seo } from "../../components/Seo";

type GameKey = "balloon" | "car" | "boss";
type Difficulty = "easy" | "medium" | "hard";
const GAMES = [
  { key:"balloon" as const, title:"Balloon Pop", description:"Track each letter and react before it reaches the top.", icon:FiTarget },
  { key:"car" as const, title:"Car Race", description:"Type each word accurately to keep your car moving.", icon:FiTruck },
  { key:"boss" as const, title:"Boss Fight", description:"Attack with words and defend when the boss strikes.", icon:FiShield },
];
const DURATIONS = [60,120,180,300];

export const GamesHub = () => {
  const [selected,setSelected] = useState<GameKey|null>(null);
  const [difficulty,setDifficulty] = useState<Difficulty>("easy");
  const [duration,setDuration] = useState(60);
  const navigate = useNavigate();
  const selectedGame = GAMES.find(game=>game.key===selected);

  return (
    <main className="mt-page">
      <Seo title="Typing Games — Balloon Pop, Car Race, Boss Fight" description="Practice typing speed and accuracy with Balloon Pop, Car Race, and Boss Fight on MangoTyping." path="/home/typing-games"/>
      <BackButton to="/home" label="Back to practice"/>
      <header className="mt-page-header tone-games">
        <h1 className="mt-page-title">Typing games</h1>
        <p className="mt-page-description">Choose a challenge. Each game builds a different part of your typing skill.</p>
      </header>

      <section className="mt-game-options" aria-label="Choose a typing game">
        {GAMES.map(game=>{
          const active=selected===game.key;
          const Icon=game.icon;
          return (
            <button key={game.key} type="button" aria-pressed={active} onClick={()=>setSelected(game.key)} className={"mt-game-option tone-"+game.key+(active?" is-selected":"")}>
              <span className="mt-game-icon"><Icon size={24} strokeWidth={1.65}/></span>
              <span className="mt-game-copy">
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                <span className="mt-game-select-label">{active?"Selected":"Choose game"} <FiArrowUpRight size={14}/></span>
              </span>
            </button>
          );
        })}
      </section>

      <AnimatePresence mode="wait">
        {selected && selectedGame && <motion.section key={selected} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.18}} className="mt-game-config" aria-label="Game settings">
          <div className="flex flex-col gap-1 border-b border-[var(--card-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-lg font-semibold tracking-tight">{selectedGame.title}</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Set the difficulty and session length.</p></div>
            <button type="button" onClick={()=>setSelected(null)} className="self-start text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]">Change game</button>
          </div>
          <div className="grid gap-7 py-5 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-semibold">Difficulty</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty">
                {(["easy","medium","hard"] as Difficulty[]).map(value=><button key={value} type="button" aria-pressed={difficulty===value} onClick={()=>setDifficulty(value)} className="mt-choice-chip capitalize">{value}</button>)}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">Session length</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Session length">
                {DURATIONS.map(value=><button key={value} type="button" aria-pressed={duration===value} onClick={()=>setDuration(value)} className="mt-choice-chip">{value/60} min</button>)}
              </div>
            </div>
          </div>
          <div className="flex justify-end border-t border-[var(--card-border)] pt-4">
            <button type="button" onClick={()=>navigate("/home/games/"+selected,{state:{difficulty,duration}})} className="mt-button-primary">Start game <FiArrowRight size={15}/></button>
          </div>
        </motion.section>}
      </AnimatePresence>
    </main>
  );
};
