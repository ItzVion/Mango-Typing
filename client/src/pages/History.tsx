import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { BackButton } from "../components/BackButton";

type Test = {
  id: string;
  wpm: number;
  accuracy: number;
  mode: string;
  createdAt: string;
  sheet: { title: string; topic: string };
};

export const History = () => {
  const user = useAuthStore((s) => s.user);
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    if (user) api.myTests().then(setTests).catch(console.error);
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton to="/" label="Back" />
        <div className="text-center text-black/50">
          Sign in to see your saved history. <Link to="/auth" className="underline">Sign in</Link>
        </div>
      </div>
    );
  }

  const best = tests.reduce((m, t) => Math.max(m, t.wpm), 0);
  const avg = tests.length ? tests.reduce((s, t) => s + t.wpm, 0) / tests.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <BackButton to="/" label="Back" />
      <h1 className="text-3xl font-bold">{user.username}'s Results</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center"><div className="text-2xl font-bold">{tests.length}</div><div className="text-black/40 text-xs">Tests</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold">{best}</div><div className="text-black/40 text-xs">Best WPM</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold">{avg.toFixed(0)}</div><div className="text-black/40 text-xs">Avg WPM</div></div>
      </div>

      <h2 className="font-semibold text-black/70">Recent Tests</h2>
      <div className="flex flex-col gap-2">
        {tests.map((t) => (
          <div key={t.id} className="card p-4 flex justify-between text-sm flex-wrap gap-2">
            <span>{t.sheet.title}</span>
            <span className="text-black/40 text-xs">{t.mode === "screen" ? "Screen to Screen" : "Paper to Screen"}</span>
            <span>{Math.round(t.wpm)} WPM</span>
            <span>{t.accuracy.toFixed(1)}%</span>
            <span className="text-black/40">{new Date(t.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
        {tests.length === 0 && <p className="text-black/40">No tests yet. Go type something.</p>}
      </div>
    </div>
  );
};
