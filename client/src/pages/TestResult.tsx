import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BackButton } from "../components/BackButton";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { Seo } from "../components/Seo";

export const TestResult = () => {
  const { state } = useLocation() as { state: any };

  if (!state) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton to="/home" label="Back" />
        <div className="text-center text-black/50">
          No result data. <Link to="/home/tests" className="underline">Pick a sheet</Link>
        </div>
      </div>
    );
  }

  const secondStats = Array.isArray(state?.secondStats)
    ? state.secondStats.filter(
        (sample: any) =>
          Number.isFinite(sample?.sec) &&
          Number.isFinite(sample?.wpm) &&
          Number.isFinite(sample?.raw),
      )
    : [];

  return (
    <div className="flex flex-col items-center gap-8">
      <Seo title="Test Result" description="Your MangoTyping test result." path="/home/test-result" noindex />
      <BackButton to="/home/tests" label="Back" />

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
        <Stat label="NET WPM" value={Math.round(state.wpm)} delay={0.1} />
        <Stat label="GROSS WPM" value={Math.round(state.rawWpm)} delay={0.18} />
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
        className="card flex w-full max-w-3xl flex-col p-5 sm:p-6"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Typing pace</h2>
          <span className="text-xs text-[var(--text-muted)]">Words per minute</span>
        </div>
        {secondStats.length > 0 ? (
          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={secondStats} margin={{ top: 6, right: 10, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="sec"
                  stroke="#8A8A8A"
                  tickLine={false}
                  axisLine={{ stroke: "#343434" }}
                  tickFormatter={(value) => `${value}s`}
                />
                <YAxis
                  stroke="#8A8A8A"
                  width={38}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(value) => `Time: ${value}s`}
                  formatter={(value, name) => [
                    `${Math.round(Number(value))} WPM`,
                    String(name),
                  ]}
                  contentStyle={{
                    background: "#111111",
                    border: "1px solid #343434",
                    borderRadius: "12px",
                    color: "#f5f5f5",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="wpm"
                  name="Net WPM"
                  stroke="#F5A623"
                  dot={secondStats.length === 1 ? { r: 3, fill: "#F5A623" } : false}
                  strokeWidth={2.5}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="raw"
                  name="Gross WPM"
                  stroke="#60A5FA"
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--card-border)] bg-black/5 text-2xl dark:bg-white/5" aria-hidden="true">
              📈
            </div>
            <p className="font-semibold">Pace graph unavailable for this attempt</p>
            <p className="max-w-md text-sm text-[var(--text-muted)]">
              The final score is still available, but this result has no saved per-second samples. New tests will record the pace graph.
            </p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
          <Link
            to="/home/tests"
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
