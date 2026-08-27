import { motion } from "framer-motion";

// Original stick-figure construction worker illustration — SVG, our own
// colors, no stock art. Right hand rests on the "N" of "DOWN".
const ConstructionWorker = () => (
  <svg viewBox="0 0 260 200" width="220" height="170" xmlns="http://www.w3.org/2000/svg">
    {/* Helmet */}
    <path d="M100 60 a30 30 0 0 1 60 0 z" fill="#F5A623" />
    <rect x="96" y="58" width="68" height="8" rx="4" fill="#F5A623" />
    {/* Head */}
    <circle cx="130" cy="78" r="18" fill="none" stroke="currentColor" strokeWidth="3" />
    {/* Body */}
    <line x1="130" y1="96" x2="130" y2="150" stroke="currentColor" strokeWidth="3" />
    {/* Left arm holding wrench, angled down */}
    <line x1="130" y1="110" x2="95" y2="140" stroke="currentColor" strokeWidth="3" />
    <g transform="translate(80,146) rotate(-30)">
      <rect x="-4" y="-18" width="8" height="30" rx="2" fill="#F5A623" />
      <circle cx="0" cy="-20" r="8" fill="none" stroke="#F5A623" strokeWidth="4" />
    </g>
    {/* Right arm resting to the side (toward the N) */}
    <line x1="130" y1="110" x2="172" y2="128" stroke="currentColor" strokeWidth="3" />
    {/* Legs */}
    <line x1="130" y1="150" x2="112" y2="192" stroke="currentColor" strokeWidth="3" />
    <line x1="130" y1="150" x2="148" y2="192" stroke="currentColor" strokeWidth="3" />
  </svg>
);

export const MaintenancePage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6 bg-[var(--bg)]">
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-black/40">
      Be right back.
    </motion.div>

    <div className="flex items-end justify-center gap-4">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ConstructionWorker />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-6xl sm:text-7xl font-mono font-bold tracking-tight"
      >
        DOW<span className="relative">N
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl"
            aria-hidden
          >
            🔧
          </motion.span>
        </span>
      </motion.h1>
    </div>

    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="text-black/50 max-w-sm"
    >
      VC Typing is temporarily down for maintenance. We're tightening a few
      bolts — check back shortly.
    </motion.p>
  </div>
);
