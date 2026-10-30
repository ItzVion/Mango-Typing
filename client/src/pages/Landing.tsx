import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { SupportSection } from "../components/SupportSection";
import { TypingHero } from "../components/TypingHero";
import { Seo, SITE_ORIGIN, SITE_NAME } from "../components/Seo";

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL;", "ZXCVBNM"];
const HOME_ROW_KEYS = "ASDFGHJKL;";

const practiceOptions = [
  {
    title: "Timed tests",
    text: "Choose an easy, medium, or hard passage and review your speed and accuracy at the end.",
    action: "Choose a passage",
    to: "/home/tests",
  },
  {
    title: "Typing games",
    text: "Practise timing and accuracy in Balloon, Car, and Boss challenges.",
    action: "Browse games",
    to: "/home/typing-games",
  },
  {
    title: "Typing tutor",
    text: "Work through guided lessons from home-row keys to longer passages.",
    action: "Open the tutor",
    to: "/home/tutor",
  },
];

export const Landing = () => {
  const reduceMotion = useReducedMotion();

  return (
    <main className="w-full text-[var(--text-primary)]">
      <Seo
        title="Mango Typing: Free Online Typing Tests, Games & Tutor"
        brandSuffix={false}
        description="Mango Typing (MangoTyping) is a free online typing practice website. Take timed typing tests, practise with printable passages, play typing games, and learn with guided lessons."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          alternateName: "MangoTyping",
          description: "Mango Typing is a free online typing practice website for timed typing tests, printable passages, typing games, and guided lessons.",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any (web browser)",
          url: SITE_ORIGIN,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.42, ease: "easeOut" }}
        className="mx-auto grid min-h-[70vh] w-full max-w-6xl items-center gap-10 px-1 py-8 sm:gap-14 sm:py-12 md:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a623]">Mango Typing</p>
          <TypingHero />
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.15 }}
            className="mt-6 max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg sm:leading-8"
          >
            Choose a passage, set a timer from 30 seconds to 10 minutes, then check your words per minute and accuracy. Practise on screen or print a sheet for paper-based practice.
          </motion.p>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <motion.div whileHover={reduceMotion ? undefined : { y: -2, scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
              <Link
                to="/home/tests"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f5a623] px-5 py-3 text-sm font-semibold text-[#18140b] transition-colors hover:bg-[#ffc15b]"
              >
                Take a typing test <span aria-hidden="true">→</span>
              </Link>
            </motion.div>
            <motion.div whileHover={reduceMotion ? undefined : { y: -2 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
              <Link
                to="/home/typing-games"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--card-border)] px-5 py-3 text-sm font-semibold transition-colors hover:border-[#f5a623]"
              >
                Explore typing games
              </Link>
            </motion.div>
          </motion.div>
          <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
            Free to start. Practise with a timer and review your own results.
          </p>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : 0.12, ease: "easeOut" }}
          className="mx-auto w-full max-w-lg"
        >
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] pb-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Start with the home row</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">A useful starting position for touch typing.</p>
              </div>
              <span className="select-none font-mono text-sm text-[#f5a623]" aria-hidden="true">A / J</span>
            </div>

            <div className="mt-6 space-y-2.5" role="img" aria-label="Keyboard diagram with A, S, D, F, J, K, L and semicolon highlighted as home-row keys">
              {KEY_ROWS.map((row, rowIndex) => (
                <div
                  key={row}
                  className={["flex justify-center gap-1.5 sm:gap-2", rowIndex === 1 ? "px-1" : rowIndex === 2 ? "px-5 sm:px-8" : ""].join(" ")}
                >
                  {row.split("").map((key, keyIndex) => {
                    const isHomeRow = HOME_ROW_KEYS.includes(key);
                    return (
                      <span
                        key={key}
                        className={[
                          "mt-keycap flex h-9 min-w-0 flex-1 items-center justify-center rounded-md border font-mono text-xs sm:h-11 sm:text-sm",
                          isHomeRow
                            ? "border-[#f5a623] bg-[#f5a623] font-semibold text-[#18140b]"
                            : "border-[var(--card-border)] bg-[var(--bg-main)] text-[var(--text-muted)]",
                        ].join(" ")}
                        style={{ animationDelay: reduceMotion ? "0ms" : `${Math.min(rowIndex * 80 + keyIndex * 22, 450)}ms` }}
                      >
                        {key}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
              Rest your fingers on A, S, D, F and J, K, L, ; before you begin. Accuracy first; speed can follow.
            </p>
          </div>
        </motion.div>
      </motion.section>

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduceMotion ? 0 : 0.42, ease: "easeOut" }}
        className="mx-auto max-w-6xl border-t border-[var(--card-border)] px-1 py-10 sm:py-14"
      >
        <div className="mb-7 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pick a way to practise</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Use a timed passage, practise through a game, or work through guided lessons at your own pace.
          </p>
        </div>
        <div className="grid gap-7 md:grid-cols-3 md:gap-8">
          {practiceOptions.map((option, index) => (
            <motion.div
              key={option.title}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: reduceMotion ? 0 : 0.34, delay: reduceMotion ? 0 : index * 0.07 }}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              className="h-full"
            >
              <Link to={option.to} className="group block h-full border-t border-[var(--card-border)] py-5 transition-colors hover:border-[#f5a623]">
                <h3 className="text-lg font-semibold">{option.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{option.text}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-[#f5a623]">
                  {option.action} <span aria-hidden="true">→</span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduceMotion ? 0 : 0.42 }}
        className="mx-auto flex max-w-6xl justify-center border-t border-[var(--card-border)] px-1 py-10 sm:py-14"
      >
        <SupportSection />
      </motion.section>
    </main>
  );
};
