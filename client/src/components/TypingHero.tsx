import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const FULL_TEXT = "VC TYPING";
const KEY_CHARS = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");

type Keycap = {
  id: number;
  char: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
};

function useKeycaps(count: number): Keycap[] {
  return useMemo(() => {
    const caps: Keycap[] = [];
    for (let i = 0; i < count; i++) {
      caps.push({
        id: i,
        char: KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)],
        left: 4 + Math.random() * 92,
        delay: Math.random() * 8,
        duration: 8 + Math.random() * 6,
        size: 30 + Math.random() * 26,
      });
    }
    return caps;
  }, [count]);
}

const KeycapField = () => {
  const caps = useKeycaps(20);
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
          animate={{ y: "-120vh", opacity: [0, 0.7, 0.7, 0] }}
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
  const containerRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

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
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full flex justify-center"
      style={{ perspective: 800 }}
    >
      <KeycapField />
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        <motion.h1
          className="text-5xl sm:text-6xl font-bold font-mono tracking-tight relative"
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
          <motion.div
            aria-hidden
            className="absolute left-0 -bottom-2 h-1 rounded-full"
            style={{ background: "linear-gradient(90deg, #F5A623, transparent)" }}
            initial={{ width: 0 }}
            animate={{ width: done ? "100%" : 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </motion.h1>
      </motion.div>
    </div>
  );
};