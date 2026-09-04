import { motion } from "framer-motion";
import { Seo } from "../components/Seo";

// Redone against the reference image: glossy chrome-white 3D "DOWN"
// wordmark (extrusion layers + a shine sweep clipped to the letterforms),
// a rounder-helmeted stick-figure worker resting a hand on the N, floating
// ambient particles, a gear divider, and a glowing "thanks for your
// patience" pill. Original SVG/CSS — no image asset, no stock art.

const LETTERS = "DOWN".split("");

function Extruded3DText({ children }: { children: string }) {
  const depth = 16;
  const layers = Array.from({ length: depth });
  return (
    <span className="relative inline-flex">
      {/* Ground glow pooling under the letters, like light bouncing off a floor */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 -bottom-3 h-6 w-[85%] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(245,166,35,0.5), transparent 70%)", filter: "blur(6px)" }}
        animate={{ opacity: [0.5, 0.9, 0.5], scaleX: [0.9, 1.05, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {children.split("").map((ch, li) => (
        <motion.span
          key={li}
          className="relative inline-block"
          initial={{ opacity: 0, y: -60, rotate: -8 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.12 * li, type: "spring", stiffness: 260, damping: 14 }}
        >
          {/* Extrusion: stacked offset copies, warm-dark near the base */}
          {layers.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute inset-0 select-none"
              style={{
                transform: `translate(${(depth - i) * 0.55}px, ${(depth - i) * 0.55}px)`,
                color: `hsl(28 20% ${Math.max(6, 26 - i * 1.5)}%)`,
                zIndex: -i,
              }}
            >
              {ch}
            </span>
          ))}
          {/* Glossy chrome face: gradient fill for the highlight-to-shadow look */}
          <span
            className="relative"
            style={{
              backgroundImage: "linear-gradient(180deg, #ffffff 0%, #f2f2f2 35%, #d9d9d9 60%, #f5f5f5 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {ch}
          </span>
          {/* Shine sweep, clipped to the glyph shape via the same gradient-text trick */}
          <motion.span
            aria-hidden
            className="absolute inset-0 select-none pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.9) 48%, rgba(255,255,255,0.9) 52%, transparent 70%)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
            animate={{ backgroundPosition: ["160% 0%", "-60% 0%"] }}
            transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut", delay: 1.2 + li * 0.05 }}
          >
            {ch}
          </motion.span>
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
// "clinking" against the bolt it's supposedly tightening.
const WrenchSparks = () => (
  <g>
    {[0, 1, 2].map((i) => (
      <motion.circle
        key={i}
        cx="0"
        cy="-22"
        r="1.6"
        fill="#FFE9B8"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 1, 0],
          cx: [0, (i - 1) * 10],
          cy: [-22, -22 - 10 - i * 2],
        }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.6, delay: 1.8 + i * 0.12, ease: "easeOut" }}
      />
    ))}
  </g>
);

// Stick-figure worker — rounder dome helmet to match the reference image,
// right hand resting on the top of the N, left hand holding a wrench with
// a small idle swing and periodic "clink" sparks. Gentle idle bob + sway.
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
    <circle cx="80" cy="78" r="17" fill="none" stroke="#f5f5f5" strokeWidth="3" />
    {/* Body */}
    <line x1="80" y1="95" x2="80" y2="150" stroke="#f5f5f5" strokeWidth="3" />
    {/* Right arm — reaches up to rest on the N */}
    <line x1="80" y1="108" x2="120" y2="88" stroke="#f5f5f5" strokeWidth="3" />
    {/* Left arm holding wrench, swinging gently, with clink sparks */}
    <motion.g
      animate={{ rotate: [0, 10, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "80px 108px" }}
    >
      <line x1="80" y1="108" x2="48" y2="140" stroke="#f5f5f5" strokeWidth="3" />
      <g transform="translate(40,150) rotate(-30)">
        <rect x="-4" y="-20" width="8" height="34" rx="2" fill="#F5A623" />
        <circle cx="0" cy="-22" r="8" fill="none" stroke="#F5A623" strokeWidth="4" />
        <WrenchSparks />
      </g>
    </motion.g>
    {/* Legs */}
    <line x1="80" y1="150" x2="60" y2="212" stroke="#f5f5f5" strokeWidth="3" />
    <line x1="80" y1="150" x2="100" y2="212" stroke="#f5f5f5" strokeWidth="3" />
  </motion.svg>
);

// Slow-drifting ambient particles for atmosphere behind everything.
const Particles = () => {
  const seeds = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      {seeds.map((i) => {
        const left = (i * 137) % 100;
        const size = 2 + (i % 3);
        const duration = 6 + (i % 5);
        const delay = (i % 7) * 0.6;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${left}%`, bottom: -10, width: size, height: size, background: "rgba(245,166,35,0.5)" }}
            animate={{ y: ["0vh", "-110vh"], opacity: [0, 0.8, 0] }}
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

    {/* Ambient glow behind everything */}
    <motion.div
      aria-hidden
      className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
      style={{ background: "radial-gradient(circle, rgba(245,166,35,0.2), transparent 70%)" }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    />

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
        <Extruded3DText>{LETTERS.join("")}</Extruded3DText>
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
