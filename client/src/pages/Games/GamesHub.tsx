import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowRight, FiArrowUpRight, FiShield, FiTarget, FiTruck, FiZap } from "react-icons/fi";
import { BackButton } from "../../components/BackButton";
import { Seo } from "../../components/Seo";

type GameKey = "balloon" | "car" | "boss";
type Difficulty = "easy" | "medium" | "hard";

const GAMES = [
  {
    key: "balloon" as const,
    title: "Balloon Pop",
    kicker: "REACTION & PRECISION",
    description: "Letters rise. Find the right key before the balloon floats away.",
    icon: FiTarget,
    accent: "#F0786B",
    scene: "balloon",
    action: "Play Balloon Pop",
  },
  {
    key: "car" as const,
    title: "Car Race",
    kicker: "PACE & CONSISTENCY",
    description: "Keep your engine moving by typing each word with a steady rhythm.",
    icon: FiTruck,
    accent: "#51B5A4",
    scene: "car",
    action: "Start a race",
  },
  {
    key: "boss" as const,
    title: "Boss Fight",
    kicker: "FOCUS UNDER PRESSURE",
    description: "Attack with accurate words. Defend when the boss strikes back.",
    icon: FiShield,
    accent: "#A58BD8",
    scene: "boss",
    action: "Enter the fight",
  },
];

const DURATIONS = [60, 120, 180, 300];

function GameArtwork({ kind }: { kind: GameKey }) {
  if (kind === "balloon") {
    return (
      <svg viewBox="0 0 360 150" className="mt-game-art" role="img" aria-label="Balloon Pop game illustration">
        <path d="M0 132H360" stroke="#75433F" strokeOpacity=".42"/>
        <circle cx="181" cy="63" r="55" fill="#F0786B" opacity=".09"/>
        <path d="M181 102c-31 0-53-23-53-54 0-25 20-41 44-41 7 0 13 2 19 5 6-3 12-5 19-5 24 0 44 16 44 41 0 31-22 54-53 54Z" fill="#EF796E"/>
        <path d="M170 103l11 14 11-14" fill="#D9655B"/>
        <path d="M181 117c0 8-5 13-9 18" stroke="#F3A49C" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M147 28c-5 7-7 16-5 25" stroke="#FFD0C9" strokeWidth="5" strokeLinecap="round" fill="none"/>
        <text x="181" y="71" textAnchor="middle" fill="#451D1D" fontSize="30" fontWeight="800" fontFamily="Inter, sans-serif">A</text>
        <circle cx="80" cy="37" r="3" fill="#F8B1A9"/><circle cx="283" cy="36" r="2.5" fill="#F8B1A9"/>
        <circle cx="302" cy="92" r="4" fill="#E9897E" opacity=".7"/><circle cx="64" cy="92" r="2.5" fill="#E9897E" opacity=".7"/>
      </svg>
    );
  }
  if (kind === "car") {
    return (
      <svg viewBox="0 0 360 150" className="mt-game-art" role="img" aria-label="Car Race game illustration">
        <path d="M0 124H360" stroke="#397E73" strokeOpacity=".6"/>
        <path d="M0 103H360" stroke="#397E73" strokeOpacity=".25" strokeDasharray="6 10"/>
        <path d="M20 133 90 133M268 133 340 133" stroke="#51B5A4" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="185" cy="65" r="61" fill="#51B5A4" opacity=".08"/>
        <path d="M82 94 99 62c4-8 11-13 21-13h105c10 0 18 5 23 14l16 31v22H82V94Z" fill="#52B8A6"/>
        <path d="m116 62 14-19h88l13 19H116Z" fill="#B8E7DD"/>
        <path d="M143 47v15M184 47v15" stroke="#27776C" strokeWidth="2"/>
        <rect x="91" y="87" width="164" height="15" rx="7.5" fill="#3D988A"/>
        <path d="M100 87h18M229 87h17" stroke="#DDF6EF" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="119" cy="111" r="15" fill="#182725"/><circle cx="119" cy="111" r="6" fill="#B5D9D1"/>
        <circle cx="224" cy="111" r="15" fill="#182725"/><circle cx="224" cy="111" r="6" fill="#B5D9D1"/>
        <path d="M33 38h34M47 27v22M286 33h40M305 22v22" stroke="#51B5A4" strokeWidth="2" opacity=".55" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 360 150" className="mt-game-art" role="img" aria-label="Boss Fight game illustration">
      <circle cx="180" cy="66" r="60" fill="#A58BD8" opacity=".09"/>
      <path d="m128 24-17-15 2 37M232 24l17-15-2 37" fill="#A58BD8" stroke="#D2C5F3" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M180 24c-35 0-59 23-59 55 0 27 22 45 59 45s59-18 59-45c0-32-24-55-59-55Z" fill="#9B83D3"/>
      <path d="M143 62c9-12 22-12 31 0M186 62c9-12 22-12 31 0" fill="none" stroke="#E9E1FC" strokeWidth="5" strokeLinecap="round"/>
      <ellipse cx="158" cy="73" rx="8" ry="11" fill="#F8F4FF"/><ellipse cx="202" cy="73" rx="8" ry="11" fill="#F8F4FF"/>
      <circle cx="160" cy="75" r="4" fill="#322747"/><circle cx="200" cy="75" r="4" fill="#322747"/>
      <path d="M164 96q16 12 32 0" fill="none" stroke="#493568" strokeWidth="4" strokeLinecap="round"/>
      <path d="m88 66 10-6 9 6-9 6zM252 66l10-6 9 6-9 6z" fill="#A58BD8" opacity=".6"/>
      <path d="M67 35h16M75 27v16M282 36h13M288 30v13" stroke="#C4B2ED" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export const GamesHub = () => {
  const [selected, setSelected] = useState<GameKey | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [duration, setDuration] = useState(60);
  const navigate = useNavigate();
  const selectedGame = GAMES.find((game) => game.key === selected);

  return (
    <main className="mt-page mt-games-page">
      <Seo title="Typing Games — Balloon Pop, Car Race, Boss Fight" description="Practice typing speed and accuracy with Balloon Pop, Car Race, and Boss Fight on MangoTyping." path="/home/typing-games" />
      <BackButton to="/home" label="Back to practice" />

      <header className="mt-games-heading">
        <div>
          <p className="mt-games-overline"><FiZap size={13} /> THE MANGOTYPING ARCADE</p>
          <h1>Find your rhythm.</h1>
          <p className="mt-games-intro">Three ways to sharpen your typing. Pick a game and beat your best.</p>
        </div>
        <div className="mt-games-heading-side">
          <span>03</span>
          <p>GAMES<br/>AVAILABLE</p>
        </div>
      </header>

      <section className="mt-games-grid" aria-label="Choose a typing game">
        {GAMES.map((game, index) => {
          const active = selected === game.key;
          const Icon = game.icon;
          return (
            <motion.button
              key={game.key}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(game.key)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.99 }}
              className={"mt-game-card game-" + game.key + (active ? " is-active" : "")}
              style={{ "--game-accent": game.accent } as React.CSSProperties}
            >
              <div className="mt-game-card-top">
                <span className="mt-game-index">0{index + 1} / 03</span>
                <span className="mt-game-card-icon"><Icon size={19} strokeWidth={1.8} /></span>
              </div>
              <div className="mt-game-art-wrap">
                <GameArtwork kind={game.key} />
              </div>
              <div className="mt-game-card-body">
                <p className="mt-game-kicker">{game.kicker}</p>
                <h2>{game.title}</h2>
                <p className="mt-game-description">{game.description}</p>
                <span className="mt-game-card-action">
                  {active ? "Selected" : game.action}
                  <FiArrowUpRight size={16} />
                </span>
              </div>
            </motion.button>
          );
        })}
      </section>

      <AnimatePresence mode="wait">
        {selected && selectedGame && (
          <motion.section
            key={selected}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-game-setup"
            aria-label="Game settings"
          >
            <div className="mt-game-setup-heading">
              <div>
                <p className="mt-game-kicker">READY TO PLAY</p>
                <h2>{selectedGame.title}</h2>
                <p>Choose how challenging you want this round to be.</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}>Change game</button>
            </div>
            <div className="mt-game-setup-controls">
              <div>
                <label>Difficulty</label>
                <div className="mt-game-pills" role="group" aria-label="Difficulty">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((value) => (
                    <button key={value} type="button" aria-pressed={difficulty === value} onClick={() => setDifficulty(value)}>{value}</button>
                  ))}
                </div>
              </div>
              <div>
                <label>Session length</label>
                <div className="mt-game-pills" role="group" aria-label="Session length">
                  {DURATIONS.map((value) => (
                    <button key={value} type="button" aria-pressed={duration === value} onClick={() => setDuration(value)}>{value / 60} min</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-game-setup-footer">
              <span>Tip: focus on clean keystrokes, then build speed.</span>
              <button type="button" onClick={() => navigate("/home/games/" + selected, { state: { difficulty, duration } })}>
                Start game <FiArrowRight size={16} />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
};
