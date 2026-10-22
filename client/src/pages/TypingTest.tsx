import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api/client";
import { BackButton } from "../components/BackButton";
import { calculateTypingMetrics, diffWords } from "../utils/typingDiff";
import { useTestGuardStore } from "../stores/testGuardStore";
import { Seo } from "../components/Seo";

function formatTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}


const DURATIONS = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
];
type Mode = "paper" | "screen";
type Phase = "setup" | "running";

export const TypingTest = () => {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [sheetLoading, setSheetLoading] = useState(true);
  const [sheetLoadError, setSheetLoadError] = useState(false);
  const [mode, setMode] = useState<Mode>("screen");
  const [phase, setPhase] = useState<Phase>("setup");
  const [duration, setDuration] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [allowBackspace, setAllowBackspace] = useState(true);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const setTestInProgress = useTestGuardStore((s) => s.setTestInProgress);
  const [timeLeft, setTimeLeft] = useState(0);
  type SecondStat = { sec: number; wpm: number; raw: number; errors: number };
  const secondStatsRef = useRef<SecondStat[]>([]);
  const typedRef = useRef("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finishedRef = useRef(false);
  const caretRef = useRef<HTMLSpanElement>(null);

  const loadSheet = () => {
    const id = Number(sheetId);
    setSheetLoading(true);
    setSheetLoadError(false);
    if (!sheetId || !Number.isSafeInteger(id) || id < 1) {
      setSheetLoadError(true);
      setSheetLoading(false);
      return;
    }
    api.sheet(id)
      .then((s: { content: string }) => {
        if (typeof s?.content !== "string" || !s.content.trim()) throw new Error("The test sheet is empty.");
        setText(s.content);
      })
      .catch((err) => {
        console.error("Failed to load typing test sheet:", err);
        setSheetLoadError(true);
      })
      .finally(() => setSheetLoading(false));
  };

  useEffect(() => { loadSheet(); }, [sheetId]);

  useEffect(() => {
    if (!startedAt || !duration) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, Math.round(duration - elapsed));
      setTimeLeft(remaining);

      // Use refs for samples so the final submit always includes the latest
      // values. State captured by the interval callback can be stale at finish.
      const metrics = calculateTypingMetrics(typedRef.current, text, elapsed);
      const nextStats = [...secondStatsRef.current, {
        sec: Math.floor(elapsed),
        wpm: metrics.wpm,
        raw: metrics.rawWpm,
        errors: metrics.errors,
      }];
      secondStatsRef.current = nextStats;

      if (remaining <= 0 && !finishedRef.current) {
        clearInterval(interval);
        finish();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, duration, text]);

  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [typed]);

  const startTest = () => {
    start(selectedDuration);
  };

  const start = (secs: number) => {
    setDuration(secs);
    setTimeLeft(secs);
    setTyped("");
    typedRef.current = "";
    secondStatsRef.current = [];
    setStartedAt(null);
    finishedRef.current = false;
    setPhase("running");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleChange = (val: string) => {
    if (finishedRef.current || timeLeft <= 0) return;
    if (!startedAt) {
      setStartedAt(Date.now());
      setTestInProgress(true);
    }
    if (!allowBackspace && val.length < typed.length) return;
    typedRef.current = val;
    setTyped(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (finishedRef.current || timeLeft <= 0) {
      e.preventDefault();
      return;
    }
    if (!allowBackspace && e.key === "Backspace") e.preventDefault();
  };

  const [submitError, setSubmitError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [lastTyped, setLastTyped] = useState("");

  useEffect(() => {
    // Register once and read a synchronous ref so the browser warning is active
    // immediately, even before React has rendered the saving overlay.
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setTestInProgress(false);
    setTimeLeft(0);
    setSubmitError(false);
    inputRef.current?.blur();
    // Submit directly from the ref instead of waiting for a state updater.
    // That makes the saving overlay appear immediately when the timer expires.
    void submit(typedRef.current);
  };

  const cancelTest = () => {
    finishedRef.current = true; // stop the timer's own finish() from also firing/submitting
    setTestInProgress(false);
    navigate("/home/tests");
  };

  // Safety net for any other way this component unmounts mid-test (browser
  // back/forward, a future nav path that doesn't go through cancelTest).
  useEffect(() => {
    return () => setTestInProgress(false);
  }, [setTestInProgress]);

  const submit = async (finalTyped: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setLastTyped(finalTyped);
    setSubmitError(false);
    const elapsedDuration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 1;
    const durationSec = Math.max(1, Math.min(duration || 1, elapsedDuration));
    const metrics = calculateTypingMetrics(finalTyped, text, durationSec);
    const { wpm, rawWpm, accuracy, errors } = metrics;

    try {
      const result = await api.submitTest({
        sheetId: Number(sheetId),
        mode,
        wpm,
        rawWpm,
        accuracy,
        errors,
        durationSec,
        secondStats: secondStatsRef.current,
      });
      navigate("/home/test-result", { state: result });
    } catch (err) {
      // Previously this only logged to the console and reset the finished
      // flag — from the person's side the Submit button just looked broken,
      // with no indication anything had gone wrong or any way to retry.
      console.error("Submit test failed:", err);
      finishedRef.current = false;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmitError(true);
    }
  };

  const retrySubmit = () => {
    if (isSubmittingRef.current) return;
    finishedRef.current = true;
    submit(lastTyped);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 },
  };

  return (
    <>
      <Seo
        title="Typing Test"
        description="Take a timed typing test, track your WPM and accuracy, and save your result to your history."
        path={`/home/tests/${sheetId}`}
      />
      {sheetLoading ? (
        <div className="flex flex-col gap-5 mt-16 max-w-lg mx-auto">
          <BackButton to="/home/tests" label="Back" />
          <div className="card p-8 text-center text-black/50">Loading test sheet…</div>
        </div>
      ) : sheetLoadError ? (
        <div className="flex flex-col gap-5 mt-16 max-w-lg mx-auto">
          <BackButton to="/home/tests" label="Back" />
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-black/50 text-sm">Couldn't load this test sheet. It may have been removed or the server may be unavailable.</p>
            <button onClick={loadSheet} className="px-5 py-2 rounded-xl border border-[var(--card-border)] font-semibold text-sm">Retry</button>
          </div>
        </div>
      ) : (
      <AnimatePresence mode="wait">
      {phase === "setup" && (
        <motion.div
          key="setup"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col items-center gap-8 mt-16 w-full max-w-lg mx-auto"
        >
          <BackButton to="/home/tests" label="Back" />
          <h2 className="text-2xl font-bold">Set up your test</h2>

          <div className="card p-6 w-full flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-black/40">Mode</span>
              <div className="flex gap-3">
                {(
                  [
                    { key: "paper" as Mode, title: "Paper to Screen", desc: "Type from a printed sheet." },
                    { key: "screen" as Mode, title: "Screen to Screen", desc: "Text shown on screen." },
                  ]
                ).map((m) => (
                  <motion.button
                    key={m.key}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setMode(m.key)}
                    className={`flex-1 rounded-xl p-4 text-left border transition-colors ${
                      mode === m.key
                        ? "border-black dark:border-white bg-black/[0.03] dark:bg-white/[0.06]"
                        : "border-[var(--card-border)]"
                    }`}
                  >
                    <div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-black/40 text-xs mt-0.5">{m.desc}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="duration-select" className="text-xs uppercase tracking-wide text-black/40">
                Time
              </label>
              <select
                id="duration-select"
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="w-full rounded-xl px-4 py-3 border border-[var(--card-border)] bg-transparent font-semibold"
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-black/40">Backspace</span>
              <div className="flex gap-3">
                {[
                  { label: "Allowed", value: true },
                  { label: "Not Allowed", value: false },
                ].map((b) => (
                  <motion.button
                    key={b.label}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setAllowBackspace(b.value)}
                    className={`flex-1 rounded-xl py-3 text-sm font-semibold border transition-colors ${
                      allowBackspace === b.value
                        ? "border-black dark:border-white bg-black/[0.03] dark:bg-white/[0.06]"
                        : "border-[var(--card-border)]"
                    }`}
                  >
                    {b.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={startTest}
            className="px-8 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold"
          >
            Start Test
          </motion.button>
        </motion.div>
      )}

      {phase === "running" && (
        <RunningTest
          key="running"
          text={text}
          mode={mode!}
          typed={typed}
          duration={duration!}
          timeLeft={timeLeft}
          startedAt={startedAt}
          inputRef={inputRef}
          caretRef={caretRef}
          handleChange={handleChange}
          handleKeyDown={handleKeyDown}
          onCancel={cancelTest}
          onSubmit={finish}
          submitError={submitError}
          isSubmitting={isSubmitting}
          onRetrySubmit={retrySubmit}
        />
      )}
      </AnimatePresence>
      )}
    </>
  );
};

function RunningTest({
  text,
  mode,
  typed,
  duration,
  timeLeft,
  startedAt,
  inputRef,
  caretRef,
  handleChange,
  handleKeyDown,
  onCancel,
  onSubmit,
  submitError,
  isSubmitting,
  onRetrySubmit,
}: {
  text: string;
  mode: Mode;
  typed: string;
  duration: number;
  timeLeft: number;
  startedAt: number | null;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  caretRef: React.RefObject<HTMLSpanElement | null>;
  handleChange: (v: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitError: boolean;
  isSubmitting: boolean;
  onRetrySubmit: () => void;
}) {
  const liveDiff = useMemo(() => diffWords(typed, text), [typed, text]);
  const elapsedSec = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const liveMetrics = useMemo(
    () => calculateTypingMetrics(typed, text, elapsedSec),
    [typed, text, elapsedSec],
  );
  const liveWpm = elapsedSec > 0 ? liveMetrics.wpm : 0;
  const liveAccuracy = liveDiff.typedChars ? Math.round(liveMetrics.accuracy) : 100;

  const targetWords = useMemo(() => (text.trim().length ? text.trim().split(/\s+/) : []), [text]);
  const endsWithSpace = /\s$/.test(typed);
  const typedWordsRaw = typed.trim().length ? typed.trim().split(/\s+/) : [];
  const currentPartial = !endsWithSpace ? typedWordsRaw[typedWordsRaw.length - 1] ?? "" : "";
  const currentWordIndex = liveDiff.results.findIndex((r) => r.status === "pending");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center gap-8 mt-8"
      onClick={() => timeLeft > 0 && inputRef.current?.focus()}
    >
      <AnimatePresence>
        {isSubmitting && !submitError && (
          <motion.div
            key="saving-result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-5 backdrop-blur-sm"
            role="status"
            aria-live="assertive"
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-white/10 bg-[#151515] px-7 py-8 text-center text-white shadow-2xl"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-[#F5A623]" aria-hidden="true" />
              <h2 className="text-xl font-bold">
                {timeLeft <= 0 ? "Time’s up!" : "Submitting your test…"}
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                Please wait while we save your result. Don’t refresh or close this page.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-8 text-center">
        {[
          { label: "Time Left", value: formatTime(timeLeft) },
          { label: "WPM", value: liveWpm },
          { label: "Accuracy", value: `${liveAccuracy}%` },
          { label: "Characters", value: typed.length },
        ].map((s) => (
          <div key={s.label}>
            <motion.div
              key={s.value}
              initial={{ scale: 1.3, y: -4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="text-3xl font-bold"
            >
              {s.value}
            </motion.div>
            <div className="text-black/40 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card w-full max-w-2xl h-3 overflow-hidden">
        <div
          className="h-full transition-all"
          style={{
            width: `${duration ? ((duration - timeLeft) / duration) * 100 : 0}%`,
            background: "linear-gradient(90deg, #F5A623, #FFE9B8)",
          }}
        />
      </div>

      <textarea
        ref={inputRef}
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={timeLeft <= 0}
        autoFocus
        className="opacity-0 absolute w-1 h-1"
      />

      <AnimatePresence mode="wait">
        {mode === "screen" ? (
          <motion.div
            key="screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="type-box card p-6"
          >
            {targetWords.map((word, i) => {
              const status = liveDiff.results[i]?.status ?? "pending";
              const isCurrentWord = i === currentWordIndex && currentPartial.length > 0;

              if (isCurrentWord) {
                return (
                  <span key={i}>
                    {[...word].map((c, ci) => {
                      const isTyped = ci < currentPartial.length;
                      const isCorrect = isTyped && currentPartial[ci] === c;
                      const isCaret = ci === currentPartial.length;
                      return (
                        <span
                          key={ci}
                          ref={isCaret ? caretRef : undefined}
                          className={
                            isTyped
                              ? isCorrect
                                ? "text-[var(--text-primary)]"
                                : "text-[var(--error)] bg-[var(--error)]/10"
                              : "text-black/25 dark:text-white/25"
                          }
                          style={isCaret ? { borderLeft: "2px solid currentColor" } : undefined}
                        >
                          {c}
                        </span>
                      );
                    })}
                    {currentPartial.length >= word.length && (
                      <span ref={caretRef} style={{ borderLeft: "2px solid currentColor" }} />
                    )}{" "}
                  </span>
                );
              }

              const className =
                status === "wrong" || status === "skipped"
                  ? "text-[var(--error)] bg-[var(--error)]/10"
                  : status === "correct"
                    ? "text-[var(--text-primary)]"
                    : "text-black/25 dark:text-white/25";

              return (
                <span key={i} className={className}>
                  {word}{" "}
                </span>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="paper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => inputRef.current?.focus()}
            className="type-box card p-6 w-full max-w-2xl min-h-[10rem] cursor-text whitespace-pre-wrap break-words font-mono"
          >
            {typed.length === 0 ? (
              <span className="text-black/40 text-sm">Click here and start typing what's on your printed sheet…</span>
            ) : (
              <>
                {typed}
                <span
                  ref={caretRef}
                  className="inline-block w-[2px] h-[1em] align-middle bg-current animate-pulse ml-[1px]"
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-8 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#dc2626" }}
        >
          CANCEL
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSubmit}
          disabled={isSubmitting || timeLeft <= 0}
          className="px-8 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#16a34a" }}
        >
          {isSubmitting ? "SAVING..." : "SUBMIT"}
        </motion.button>
      </div>

      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col items-center gap-3 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--error)] text-sm font-medium">
              Couldn't reach the server to save your result.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRetrySubmit}
              className="px-6 py-2.5 rounded-xl card font-semibold text-sm"
            >
              Retry
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
