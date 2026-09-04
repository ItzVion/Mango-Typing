import { motion } from "framer-motion";
import { Seo } from "../components/Seo";

// Matches the reference image: flat bold white "DOWN" with a single flat
// dark-grey shadow duplicate offset behind it (no chrome gradient, no
// shine sweep — that read as too glossy/AI-polished), a simple stick
// figure with a left hand resting on the N and a right hand holding an
// actual wrench shape, a gear divider, and an outlined "thanks for your
// patience" pill. Original SVG/CSS — no image asset, no stock art.

const LETTERS = "DOWN".split("");

function ShadowText({ children }: { children: string }) {
  return (
    <span className="relative inline-flex">
      {/* Single flat shadow duplicate offset down-right — a plain drop
          shadow, not a multi-layer 3D extrusion. */}
      <span
        aria-hidden
        className="absolute inset-0 select-none"
        style={{ transform: "translate(8px, 10px)", color: "#2a2a2a" }}
      >
        {children}
      </span>
      {children.split("").map((ch, li) => (
        <motion.span
          key={li}
          className="relative inline-block text-white"
          initial={{ opacity: 0, y: -40, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.1 * li, type: "spring", stiffness: 260, damping: 16 }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

const Gear = () => (
  <motion.svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    animate={{ rotate: 360 }}
    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
    fill="none"
    stroke="#F5A623"
    strokeWidth="1.6"
  >
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
  </motion.svg>
);

const Clock = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#F5A623" strokeWidth="1.6">
    <circle cx="12" cy="12" r="9" />
    <motion.line
      x1="12" y1="12" x2="12" y2="7"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "12px 12px" }}
    />
    <motion.line
      x1="12" y1="12" x2="15.5" y2="12"
      animate={{ rotate: 360 }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      style={{ transformOrigin: "12px 12px" }}
    />
  </svg>
);

// Small spark burst that repeats near the wrench head — reads as it
// "clinking" against a bolt.
const WrenchSparks = () => (
  <g>
    {[0, 1, 2].map((i) => (
      <motion.circle
        key={i}
        cx="12"
        cy="10"
        r="1.4"
        fill="#FFE9B8"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 1, 0],
          cx: [12, 12 + (i - 1) * 9],
          cy: [10, 10 - 9 - i * 2],
        }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.6, delay: 1.8 + i * 0.12, ease: "easeOut" }}
      />
    ))}
  </g>
);

// A real open-end wrench silhouette (not a ring-and-bar shape that reads
// as a hook) — a shaft with a jawed head at the working end.
const Wrench = () => (
  <path
    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
    fill="none"
    stroke="#F5A623"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

// Stick-figure worker: LEFT hand rests flat on the N (no tool), RIGHT
// hand holds the wrench out to the side where it reads clearly instead
// of merging into the letter. Rounded dome helmet, thin off-white lines
// with rounded caps for a slightly hand-drawn feel. Gentle idle bob.
const ConstructionWorker = () => (
  <motion.svg
    viewBox="0 0 160 220"
    width="130"
    height="180"
    xmlns="http://www.w3.org/2000/svg"
    animate={{ y: [0, -5, 0] }}
    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
  >
    {/* Contact shadow, breathes opposite the bob for a grounded feel */}
    <motion.ellipse
      cx="80" cy="214" rx="34" ry="6" fill="rgba(0,0,0,0.5)"
      animate={{ opacity: [0.5, 0.25, 0.5], scaleX: [1, 0.85, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    {/* Helmet — rounded dome + brim */}
    <motion.g
      animate={{ rotate: [0, -2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "80px 60px" }}
    >
      <path d="M50 62 a30 26 0 0 1 60 0 z" fill="#F5A623" />
      <rect x="46" y="60" width="68" height="8" rx="4" fill="#F5A623" />
      <circle cx="80" cy="42" r="4" fill="#FFE9B8" />
    </motion.g>
    {/* Head */}
    <circle cx="80" cy="78" r="17" fill="none" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />
    {/* Body */}
    <line x1="80" y1="95" x2="80" y2="150" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />

    {/* LEFT arm — reaches toward the N and rests flat on it (a short
        resting hand, no tool). This is the arm nearest the word, on the
        low-x side that overlaps the letter. */}
    <line x1="80" y1="108" x2="42" y2="92" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />
    <line x1="42" y1="92" x2="30" y2="97" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />

    {/* RIGHT arm — holds the wrench out to the side, swinging gently,
        with periodic "clink" sparks. */}
    <motion.g
      animate={{ rotate: [0, 12, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "80px 108px" }}
    >
      <line x1="80" y1="108" x2="118" y2="140" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(112,148) rotate(35) scale(1.3)">
        <g transform="translate(-12,-12)">
          <Wrench />
          <WrenchSparks />
        </g>
      </g>
    </motion.g>

    {/* Legs */}
    <line x1="80" y1="150" x2="60" y2="212" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />
    <line x1="80" y1="150" x2="100" y2="212" stroke="#f5f5f5" strokeWidth="3" strokeLinecap="round" />
  </motion.svg>
);

// Sparse, slow-drifting flecks for a little atmosphere — kept subtle to
// match the plain black background in the reference (no glow orb).
const Particles = () => {
  const seeds = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {seeds.map((i) => {
        const left = (i * 137) % 100;
        const size = 2 + (i % 3);
        const duration = 7 + (i % 5);
        const delay = (i % 7) * 0.6;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${left}%`, bottom: -10, width: size, height: size, background: "rgba(245,166,35,0.35)" }}
            animate={{ y: ["0vh", "-110vh"], opacity: [0, 0.6, 0] }}
            transition={{ duration, repeat: Infinity, delay, ease: "linear" }}
          />
        );
      })}
    </div>
  );
};

export const MaintenancePage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-8 text-center px-6 bg-black text-white relative overflow-hidden">
    <Seo title="Down for Maintenance" description="VC Typing is temporarily down for maintenance." path="/" noindex />
    <Particles />

    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm text-white/70 relative"
    >
      <Clock />
      Be right back.
    </motion.div>

    <div className="flex items-center justify-center relative">
      <h1 className="text-7xl sm:text-9xl font-black tracking-tight font-mono leading-none">
        <ShadowText>{LETTERS.join("")}</ShadowText>
      </h1>
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.8 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 140, damping: 14 }}
        className="ml-[-2.2rem] sm:ml-[-3rem] mb-[-1rem] relative z-10"
      >
        <ConstructionWorker />
      </motion.div>
    </div>

    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay: 0.9, duration: 0.5 }}
      className="flex items-center gap-4 w-full max-w-xs relative"
    >
      <span className="h-px flex-1 bg-white/20" />
      <Gear />
      <span className="h-px flex-1 bg-white/20" />
    </motion.div>

    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.05 }}
      className="text-white/60 max-w-md relative"
    >
      VC Typing is temporarily down for <span style={{ color: "#F5A623" }}>maintenance</span>.
      <br />
      We're tightening a few bolts — check back shortly.
    </motion.p>

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      className="relative"
    >
      <motion.div
        animate={{ boxShadow: ["0 0 0px rgba(245,166,35,0.4)", "0 0 18px rgba(245,166,35,0.7)", "0 0 0px rgba(245,166,35,0.4)"] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium"
        style={{ borderColor: "#F5A623", color: "#F5A623" }}
      >
        <Clock size={14} />
        Thanks for your patience!
      </motion.div>
    </motion.div>
  </div>
);
