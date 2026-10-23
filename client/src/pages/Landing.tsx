import { Link } from "react-router-dom";
import { SupportSection } from "../components/SupportSection";
import { TypingHero } from "../components/TypingHero";
import { Seo, SITE_ORIGIN, SITE_NAME } from "../components/Seo";

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL;", "ZXCVBNM"];
const HOME_ROW_KEYS = "ASDFGHJKL;";

export const Landing = () => (
  <main className="w-full text-[var(--text-primary)]">
    <Seo
      title="MangoTyping: Free Typing Tests, Games & Tutor"
      brandSuffix={false}
      description="Practise with timed typing tests, printable passages, typing games, and guided lessons. Check your words per minute and accuracy on MangoTyping."
      path="/"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Any (web browser)",
        url: SITE_ORIGIN,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      }}
    />

    <section className="mx-auto grid min-h-[70vh] w-full max-w-6xl items-center gap-10 px-1 py-8 sm:gap-14 sm:py-12 md:grid-cols-[1.1fr_0.9fr]">
      <div className="max-w-2xl">
        <TypingHero />
        <p className="mt-6 max-w-xl text-base leading-7 text-[var(--text-muted)] sm:text-lg sm:leading-8">
          Choose a passage, set a timer from 30 seconds to 10 minutes, then check your words per minute and accuracy. Practise on screen or print a sheet for paper-based practice.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/home/tests"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f5a623] px-5 py-3 text-sm font-semibold text-[#18140b] transition-colors hover:bg-[#ffc15b]"
          >
            Take a typing test <span aria-hidden="true">→</span>
          </Link>
          <Link
            to="/home/typing-games"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--card-border)] px-5 py-3 text-sm font-semibold transition-colors hover:border-[#f5a623]"
          >
            Explore typing games
          </Link>
        </div>
        <p className="mt-5 text-sm leading-6 text-[var(--text-muted)]">
          Free to start. Practise with a timer and review your own results.
        </p>
      </div>

      <div className="mx-auto w-full max-w-lg">
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
                {row.split("").map((key) => {
                  const isHomeRow = HOME_ROW_KEYS.includes(key);
                  return (
                    <span
                      key={key}
                      className={[
                        "flex h-9 min-w-0 flex-1 items-center justify-center rounded-md border font-mono text-xs sm:h-11 sm:text-sm",
                        isHomeRow
                          ? "border-[#f5a623] bg-[#f5a623] font-semibold text-[#18140b]"
                          : "border-[var(--card-border)] bg-[var(--bg-main)] text-[var(--text-muted)]",
                      ].join(" ")}
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
      </div>
    </section>

    <section className="mx-auto max-w-6xl border-t border-[var(--card-border)] px-1 py-10 sm:py-14">
      <div className="mb-7 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pick a way to practise</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          Use a timed passage, practise through a game, or work through guided lessons at your own pace.
        </p>
      </div>
      <div className="grid gap-7 md:grid-cols-3 md:gap-8">
        <Link to="/home/tests" className="group border-t border-[var(--card-border)] py-5 transition-colors hover:border-[#f5a623]">
          <h3 className="text-lg font-semibold">Timed tests</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Choose an easy, medium, or hard passage and review your speed and accuracy at the end.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#f5a623]">Choose a passage <span aria-hidden="true">→</span></span>
        </Link>
        <Link to="/home/typing-games" className="group border-t border-[var(--card-border)] py-5 transition-colors hover:border-[#f5a623]">
          <h3 className="text-lg font-semibold">Typing games</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Practise timing and accuracy in Balloon, Car, and Boss challenges.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#f5a623]">Browse games <span aria-hidden="true">→</span></span>
        </Link>
        <Link to="/home/tutor" className="group border-t border-[var(--card-border)] py-5 transition-colors hover:border-[#f5a623]">
          <h3 className="text-lg font-semibold">Typing tutor</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Work through guided lessons from home-row keys to longer passages.</p>
          <span className="mt-4 inline-block text-sm font-semibold text-[#f5a623]">Open the tutor <span aria-hidden="true">→</span></span>
        </Link>
      </div>
    </section>

    <section className="mx-auto flex max-w-6xl justify-center border-t border-[var(--card-border)] px-1 py-10 sm:py-14">
      <SupportSection />
    </section>
  </main>
);
