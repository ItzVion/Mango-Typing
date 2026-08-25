import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { BackButton } from "../../components/BackButton";
import { Keyboard } from "../../components/Keyboard";
import { LESSONS, generateLessonText } from "../../data/tutorLessons";

export const LessonRunner = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const lesson = LESSONS.find((l) => l.id === Number(lessonId));

  const [text, setText] = useState(() => (lesson ? generateLessonText(lesson) : ""));
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!lesson) return;
    setText(generateLessonText(lesson));
    setTyped("");
    setStartedAt(null);
    setDone(false);
    setTimeout(() => inputRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [typed]);

  if (!lesson) {
    return (
      <div className="flex flex-col gap-4">
        <BackButton to="/tutor" label="Back" />
        <p className="text-black/40">Lesson not found.</p>
      </div>
    );
  }

  const handleChange = (val: string) => {
    if (val.length > text.length) return; // don't type past the end
    if (!startedAt) setStartedAt(Date.now());
    setTyped(val);
    if (val.length === text.length) {
      setDone(true);
    }
  };

  const correctCount = [...typed].filter((c, i) => c === text[i]).length;
  const errorCount = typed.length - correctCount;
  const elapsedSec = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const wpm = elapsedSec > 2 ? Math.round(correctCount / 5 / (elapsedSec / 60)) : 0;
  const accuracy = typed.length ? Math.round((correctCount / typed.length) * 100) : 100;
  const nextChar = text[typed.length] ?? null;

  const idx = LESSONS.findIndex((l) => l.id === lesson.id);
  const nextLesson = LESSONS[idx + 1];
  const prevLesson = LESSONS[idx - 1];

  const restart = () => {
    setText(generateLessonText(lesson));
    setTyped("");
    setStartedAt(null);
    setDone(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col items-center gap-6 mt-4" onClick={() => inputRef.current?.focus()}>
      <div className="w-full flex items-center justify-between flex-wrap gap-2">
        <BackButton to="/tutor" label="Back" />
        <h2 className="font-semibold">{lesson.title}</h2>
      </div>

      <div className="flex gap-8 text-center">
        <div><div className="text-2xl font-bold">{wpm}</div><div className="text-black/40 text-xs">WPM</div></div>
        <div><div className="text-2xl font-bold">{accuracy}%</div><div className="text-black/40 text-xs">Accuracy</div></div>
        <div><div className="text-2xl font-bold">{errorCount}</div><div className="text-black/40 text-xs">Errors</div></div>
      </div>

      <textarea
        ref={inputRef}
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        autoFocus
        className="opacity-0 absolute w-1 h-1"
      />

      {/* Fixed responsive box — text wraps to fit any screen, no horizontal scroll. */}
      <div className="type-box card p-6 text-lg sm:text-xl">
        {[...text].map((c, i) => {
          const isTyped = i < typed.length;
          const isCorrect = isTyped && typed[i] === c;
          const isCurrent = i === typed.length;
          return (
            <span
              key={i}
              ref={isCurrent ? caretRef : undefined}
              className={
                isTyped
                  ? isCorrect
                    ? "text-black dark:text-white"
                    : "text-[var(--error)] bg-[var(--error)]/10"
                  : "text-black/25 dark:text-white/25"
              }
              style={isCurrent ? { borderLeft: "2px solid currentColor" } : undefined}
            >
              {c}
            </span>
          );
        })}
      </div>

      <Keyboard activeKey={nextChar} />

      {done && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6 flex flex-col items-center gap-3 w-full max-w-md"
        >
          <h3 className="text-xl font-bold">Lesson complete</h3>
          <p className="text-black/40 text-sm">{wpm} WPM · {accuracy}% accuracy</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={restart} className="px-5 py-2 rounded-xl border border-[var(--card-border)] text-sm font-semibold">
              Retry
            </button>
            {prevLesson && (
              <button
                onClick={() => navigate(`/tutor/${prevLesson.id}`)}
                className="px-5 py-2 rounded-xl border border-[var(--card-border)] text-sm font-semibold"
              >
                ← {prevLesson.title}
              </button>
            )}
            {nextLesson ? (
              <button
                onClick={() => navigate(`/tutor/${nextLesson.id}`)}
                className="px-5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold"
              >
                Next: {nextLesson.title} →
              </button>
            ) : (
              <button
                onClick={() => navigate("/tutor")}
                className="px-5 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold"
              >
                All Lessons
              </button>
            )}
          </div>
        </motion.div>
      )}

      {!done && (
        <p className="text-black/40 text-xs text-center max-w-md">
          Click anywhere on this page to keep typing — no need to scroll down to a button.
        </p>
      )}
    </div>
  );
};
