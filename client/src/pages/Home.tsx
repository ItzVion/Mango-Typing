import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";

const OPTIONS = [
  {
    number: "01",
    key: "test",
    title: "Timed typing test",
    desc: "Choose an easy, medium, or hard passage, set your timer, and review your speed and accuracy.",
    action: "Choose a test",
    to: "/home/tests",
  },
  {
    number: "02",
    key: "games",
    title: "Typing games",
    desc: "Practise your timing in Balloon, Car, and Boss challenges at different difficulty levels.",
    action: "Browse games",
    to: "/home/typing-games",
  },
  {
    number: "03",
    key: "tutor",
    title: "Typing tutor",
    desc: "Build familiarity with the keyboard through guided lessons, from the home row to full sentences.",
    action: "Open the tutor",
    to: "/home/tutor",
  },
];

export const Home = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl flex-col justify-center gap-8 px-1 py-8">
      <Seo
        title="Choose Your Typing Practice"
        description="Choose a timed typing test, a typing game, or a guided typing lesson on MangoTyping."
        path="/home"
      />
      <BackButton to="/" label="Back to MangoTyping" />

      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }}
        className="max-w-2xl"
      >
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Choose your next practice</h1>
        <p className="mt-3 text-base leading-7 text-[var(--text-muted)]">
          Start with a passage, warm up with a game, or learn key placement step by step.
        </p>
      </motion.header>

      <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
        {OPTIONS.map((option, index) => (
          <motion.button
            key={option.key}
            type="button"
            onClick={() => navigate(option.to)}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.34, delay: reduceMotion ? 0 : 0.07 + index * 0.07, ease: "easeOut" }}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            className="group flex min-h-64 flex-col items-start border-t border-[var(--card-border)] py-5 text-left transition-colors hover:border-[#f5a623] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f5a623]"
          >
            <span className="font-mono text-sm text-[#f5a623]">{option.number}</span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight">{option.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{option.desc}</p>
            <span className="mt-auto pt-6 text-sm font-semibold">
              {option.action} <span className="text-[#f5a623]" aria-hidden="true">→</span>
            </span>
          </motion.button>
        ))}
      </div>
    </main>
  );
};
