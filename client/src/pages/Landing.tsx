import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SupportSection } from "../components/SupportSection";
import { TypingHero } from "../components/TypingHero";

// vctyping.dpdns.org — the public marketing splash. "Start" takes people
// into the actual app at /home; scrolling down leads to the support/donate
// section. This page itself has no app functionality.
export const Landing = () => (
  <div className="flex flex-col items-center">
    <div className="w-full flex flex-col items-center text-center gap-6 px-6 min-h-[calc(100vh-6rem)] justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
      >
        <TypingHero />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="text-black/50 max-w-md"
      >
        Typing tests, games, and a tutor — all in one place. WPM, accuracy, and full history saved to your account.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, type: "spring", stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <Link to="/home" className="inline-block px-8 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold">
          Start
        </Link>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1 }, y: { delay: 1, duration: 1.6, repeat: Infinity } }}
        className="mt-10 text-black/30 text-xs"
      >
        ↓ scroll to support us
      </motion.div>
    </div>

    <div className="w-full min-h-[calc(100vh-6rem)] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="w-full flex justify-center"
      >
        <SupportSection />
      </motion.div>
    </div>
  </div>
);
