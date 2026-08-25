import { useLocation, Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { BackButton } from "../components/BackButton";

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
      <h1 className="text-4xl font-bold">Completed</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
        <Stat label="WPM" value={Math.round(state.wpm)} />
        <Stat label="Raw WPM" value={Math.round(state.rawWpm)} />
        <Stat label="Accuracy" value={`${state.accuracy.toFixed(1)}%`} />
        <Stat label="Errors" value={state.errors} />
      </div>

      {!state.saved && (
        <p className="text-black/40 text-sm">
          Sign in to save your scores to your account. <Link to="/auth" className="underline">Sign in</Link>
        </p>
      )}

      <div className="card p-6 w-full max-w-3xl h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={state.secondStats}>
            <XAxis dataKey="sec" stroke="#8A8A8A" />
            <YAxis stroke="#8A8A8A" />
            <Tooltip contentStyle={{ background: "#0b0b0b", border: "1px solid #181818" }} />
            <Line type="monotone" dataKey="wpm" stroke="#ffffff" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <Link to="/sheets" className="px-6 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold">
        Try Another Sheet
      </Link>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="card p-4 text-center">
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-black/40 text-xs">{label}</div>
  </div>
);
