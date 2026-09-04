import { motion } from "framer-motion";
import { Seo } from "../components/Seo";

// Plain, flat recreation of the reference image: solid white "DOWN" (no
// shadow/chrome/gloss), a simple line-drawn stick figure leaning an elbow
// on the N with a wrench held up by the other hand, a thin divider with a
// small gear icon, and an outlined "thanks for your patience" pill.
// Only basic entrance animation — no glow, no shine sweep, no floating
// particles, no sparks.

const LETTERS = "DOWN".split("");

const Gear = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#F5A623" strokeWidth="1.6">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
  </svg>
);

const Clock = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#F5A623" strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="12" x2="12" y2="7" />
    <line x1="12" y1="12" x2="15.5" y2="12" />
  </svg>
);

// Open-end wrench silhouette — a real recognizable wrench shape.
const Wrench = () => (
  <path
    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
    fill="none"
    stroke="#F5A623"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

// Stick-figure worker: left elbow leans on the top corner of the N, right
// hand holds the wrench up near shoulder height. Plain thin off-white
// lines, rounded caps for a hand-drawn feel. No sparks, no continuous
// glow — just a very small idle bob.
const ConstructionWorker = () => (
  <motion.svg
    viewBox="0 0 140 200"
    width="120"
    height="170"
    xmlns="http://www.w3.org/2000/svg"
    animate={{ y: [0, -4, 0] }}
    transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
  >
    {/* Helmet */}
    <path d="M42 46 a26 22 0 0 1 52 0 z" fill="none" stroke="#F5A623" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="38" y1="46" x2="98" y2="46" stroke="#F5A623" strokeWidth="2.4" strokeLinecap="round" />

    {/* Head */}
    <circle cx="68" cy="66" r="15" fill="none" stroke="#f5f5f5" strokeWidth="2.4" />
    {/* Neck + torso */}
    <line x1="68" y1="81" x2="68" y2="130" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />

    {/* Left arm — bent, elbow leans on the N, hand drops near the hip */}
    <line x1="68" y1="92" x2="34" y2="88" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="34" y1="88" x2="40" y2="120" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />

    {/* Right arm — bent up, hand near shoulder/head holding the wrench */}
    <line x1="68" y1="92" x2="98" y2="80" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="98" y1="80" x2="96" y2="50" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />
    <g transform="translate(84,32) rotate(20) scale(1.05)">
      <Wrench />
    </g>

    {/* Legs, slightly apart */}
    <line x1="68" y1="130" x2="50" y2="192" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="68" y1="130" x2="84" y2="192" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="45" y1="192" x2="57" y2="192" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="79" y1="192" x2="91" y2="192" stroke="#f5f5f5" strokeWidth="2.4" strokeLinecap="round" />
  </motion.svg>
);

export const MaintenancePage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-8 text-center px-6 bg-black text-white relative">
    <Seo title="Down for Maintenance" description="VC Typing is temporarily down for maintenance." path="/" noindex />

    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-2 text-sm text-white/70"
    >
      <Clock />
      Be right back.
    </motion.div>

    <div className="flex items-end justify-center">
      <h1 className="text-7xl sm:text-9xl font-black tracking-tight font-mono leading-none text-white">
        {LETTERS.map((ch, li) => (
          <motion.span
            key={li}
            className="inline-block"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * li, duration: 0.4 }}
          >
            {ch}
          </motion.span>
        ))}
      </h1>
      <motion.div
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="ml-[-1.8rem] sm:ml-[-2.4rem] mb-2"
      >
        <ConstructionWorker />
      </motion.div>
    </div>

    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 0.7, duration: 0.4 }}
      className="flex items-center gap-4 w-full max-w-xs"
    >
      <span className="h-px flex-1 bg-white/20" />
      <Gear />
      <span className="h-px flex-1 bg-white/20" />
    </motion.div>

    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.4 }}
      className="text-white/60 max-w-md"
    >
      VC Typing is temporarily down for <span style={{ color: "#F5A623" }}>maintenance</span>.
      <br />
      We're tightening a few bolts — check back shortly.
    </motion.p>

    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.4 }}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium"
      style={{ borderColor: "#F5A623", color: "#F5A623" }}
    >
      <Clock size={14} />
      Thanks for your patience!
    </motion.div>
  </div>
);
