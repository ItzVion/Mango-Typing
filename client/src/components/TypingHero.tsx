import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const FULL_TEXT = "VC TYPING";
const KEY_CHARS = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");

type Keycap = {
  id: number;
  char: string;
  left: number; // vw %
  delay: number;
  duration: number;
  size: number;
};

// Deterministic-ish scatter of floating keycaps drifting up behind the hero.
// Kept sparse and low-opacity so it reads as texture, not noise.
function useKeycaps(count: number): Keycap[] {
  return useMemo(() => {
    const caps: Keycap[] = [];
    for (let i = 0; i < count; i++) {
      caps.push({
        id: i,
        char: KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)],
        left: 4 + Math.random() * 92,
        delay: Math.random() * 8,
        duration: 9 + Math.random() * 7,
        size: 28 + Math.random() * 22,
      });
    }
    return caps;
  }, [count]);
}

const KeycapField = () => {
  const caps = useKeycaps(14);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      {caps.map((k) => (
        <motion.div
          key={k.id}
          className="absolute bottom-0 flex items-center justify-center rounded-lg border font-mono font-bold select-none"
          style={{
            left: `${k.left}%`,
            width: k.size,
            height: k.size,
            fontSize: k.size * 0.38,
            borderColor: "var(--card-border)",
            color: "var(--text-muted)",
            background: "var(--card-bg)",
          }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: "-120vh", opacity: [0, 0.5, 0.5, 0] }}
          transition={{
            delay: k.delay,
            duration: k.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {k.char}
        </motion.div>
      ))}
    </div>
  );
};

export const TypingHero = () => {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setTyped(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, 90);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full flex justify-center">
      <KeycapField />
      <motion.h1
        className="text-5xl sm:text-6xl font-bold font-mono tracking-tight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {typed}
        <motion.span
          aria-hidden
          className="inline-block w-[0.5ch] ml-1 align-middle"
          style={{ backgroundColor: "#F5A623", height: "0.85em" }}
          animate={done ? { opacity: [1, 0, 1] } : { opacity: 1 }}
          transition={done ? { duration: 0.9, repeat: Infinity, ease: "linear" } : {}}
        />
      </motion.h1>
    </div>
  );
};
