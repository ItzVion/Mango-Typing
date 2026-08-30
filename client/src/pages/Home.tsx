import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";

// vctyping.dpdns.org/home — the actual app entry, reached by clicking
// "Start" on the public landing page. This used to be the "choose" phase
// of the old combined Dashboard component.
const OPTIONS = [
  { key: "test", title: "Typing Test", desc: "Print a sheet, type from paper — or type straight from the screen.", to: "/home/tests", emoji: "📄" },
  { key: "games", title: "Typing Games", desc: "Balloon pop, car racing, and boss battles, with three difficulty tiers.", to: "/home/typing-games", emoji: "🎮" },
  { key: "tutor", title: "Typing Tutor", desc: "Step-by-step lessons, home row to full sentences, with an on-screen keyboard.", to: "/home/tutor", emoji: "⌨️" },
];

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-6 min-h-[calc(100vh-10rem)] justify-center px-6">
      <BackButton to="/" label="Back" />
      <h1 className="text-2xl font-bold">What do you want to do?</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
        {OPTIONS.map((o, i) => (
          <motion.button
            key={o.key}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ y: -6, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(o.to)}
            className="card p-6 flex flex-col items-center gap-2 text-left"
          >
            <motion.span
              className="text-3xl"
              initial={{ rotate: -15, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.15, type: "spring", stiffness: 300 }}
            >
              {o.emoji}
            </motion.span>
            <h3 className="font-semibold">{o.title}</h3>
            <p className="text-black/40 text-xs text-center">{o.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
