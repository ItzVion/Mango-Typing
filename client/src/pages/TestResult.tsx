import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BackButton } from "../components/BackButton";
import { AnimatedNumber } from "../components/AnimatedNumber";

export const TestResult = () => {
  const { state } = useLocation() as { state: any };

  if (!state) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton to="/" label="Back" />
        <div className="text-center text-black/50">
          No result data. <Link to="/sheets" className="underline">Pick a sheet</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <BackButton to="/sheets" label="Back" />

      <motion.div
        initial={{ opacity: 0, y: -12, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div
          className="absolute inset-0 -z-10 blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
        />
        <h1 className="text-4xl font-bold">Completed</h1>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
        <Stat label="WPM" value={Math.round(state.wpm)} delay={0.1} />
        <Stat label="Raw WPM" value={Math.round(state.rawWpm)} delay={0.18} />
        <Stat label="Accuracy" value={state.accuracy} decimals={1} suffix="%" delay={0.26} />
        <Stat label="Errors" value={state.errors} delay={0.34} />
      </div>

      {!state.saved && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-black/40 text-sm"
        >
          Sign in to save your scores to your account. <Link to="/auth" className="underline">Sign in</Link>
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
        className="card p-6 w-full max-w-3xl h-64"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={state.secondStats}>
            <XAxis dataKey="sec" stroke="#8A8A8A" />
            <YAxis stroke="#8A8A8A" />
            <Tooltip contentStyle={{ background: "#0b0b0b", border: "1px solid #181818" }} />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="var(--accent)"
              dot={false}
              strokeWidth={2}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
          <Link
            to="/sheets"
            className="inline-block px-6 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold"
          >
            Try Another Sheet
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

const Stat = ({
  label,
  value,
  decimals = 0,
  suffix = "",
  delay = 0,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.92 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 260, damping: 20 }}
    whileHover={{ y: -3 }}
    className="card p-4 text-center"
  >
    <div className="text-2xl font-bold">
      <AnimatedNumber value={value} decimals={decimals} suffix={suffix} duration={800} />
    </div>
    <div className="text-black/40 text-xs">{label}</div>
  </motion.div>
);
