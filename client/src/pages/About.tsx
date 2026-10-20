import { Seo } from "../components/Seo";
import { BackButton } from "../components/BackButton";
import { Link } from "react-router-dom";

const cards = [
  { title: "Practise", text: "Take a typing test, try a game, or follow guided lessons at your own pace." },
  { title: "Track progress", text: "When you sign in, MangoTyping can save your typing results so you can review your speed and accuracy over time." },
  { title: "Support the project", text: "Optional donations help pay for hosting, domains, and development. Donations do not buy scores or guaranteed results." },
];

export const About = () => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-1 pb-8 text-[var(--text-primary)]">
    <Seo title="About Us" description="Learn about MangoTyping, an independent free typing-practice project offering typing tests, games, guided lessons, and progress tracking." path="/about" />
    <BackButton to="/" label="Back to MangoTyping" />
    <header className="rounded-3xl bg-[var(--card-bg)] p-6 sm:p-10">
      <p className="mb-3 inline-flex rounded-full bg-[#fff3bd] px-3 py-1 text-xs font-semibold text-black">ABOUT MANGOTYPING</p>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Typing practice for everyone.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
        MangoTyping is an independent typing-practice project built to make improving keyboard skills approachable. The site offers free typing tests, printable practice sheets, typing games, and step-by-step tutor lessons.
      </p>
    </header>
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="What MangoTyping offers">
      {cards.map((card) => (
        <article className="card flex flex-col gap-3 p-5 sm:p-6" key={card.title}>
          <h2 className="text-base font-bold">{card.title}</h2>
          <p className="text-sm leading-6 text-[var(--text-muted)]">{card.text}</p>
        </article>
      ))}
    </section>
    <section className="card flex flex-col gap-3 p-6 sm:p-8">
      <h2 className="text-xl font-bold">Independent project, transparent services</h2>
      <p className="text-sm leading-7 text-[var(--text-muted)]">
        MangoTyping is not owned by or officially affiliated with Google, Razorpay, Neon, or Vercel. Those companies provide separate services that may be used to sign in, process optional donations, store data, or host the website. Each provider remains responsible for its own services and policies.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-3 text-sm font-semibold">
        <Link className="underline underline-offset-4" to="/third-party-notice">Third-party services notice</Link>
        <Link className="underline underline-offset-4" to="/privacy">Privacy Policy</Link>
        <Link className="underline underline-offset-4" to="/terms">Terms &amp; Conditions</Link>
        <Link className="underline underline-offset-4" to="/refund">Refund Policy</Link>
      </div>
    </section>
    <section className="rounded-3xl bg-[var(--card-bg)] p-6 sm:p-8">
      <h2 className="text-lg font-bold">Contact</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">For questions about the service, privacy, security, or donations, email <a className="underline underline-offset-4" href="mailto:support@mangotyping.fun">support@mangotyping.fun</a>.</p>
    </section>
  </main>
);
