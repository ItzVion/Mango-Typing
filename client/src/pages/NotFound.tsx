import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-sm text-black/40"
    >
      This page doesn't exist :&lt;
    </motion.div>

    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 14 }}
      className="text-8xl font-mono font-bold"
      style={{ color: "#F5A623" }}
    >
      404
    </motion.div>

    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="text-black/50 max-w-sm"
    >
      Whatever you were looking for took a wrong turn somewhere between the
      keys. Let's get you back to something that actually exists.
    </motion.p>

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
      <Link to="/">
        <motion.span
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block px-6 py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold"
        >
          Back to Dashboard
        </motion.span>
      </Link>
    </motion.div>
  </div>
);
