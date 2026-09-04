import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SupportSection } from "../components/SupportSection";
import { TypingHero } from "../components/TypingHero";
import { Seo, SITE_ORIGIN, SITE_NAME } from "../components/Seo";

// vctyping.dpdns.org — the public marketing splash. "Start" takes people
// into the actual app at /home; scrolling down leads to the support/donate
// section. This page itself has no app functionality.
export const Landing = () => (
  <div className="flex flex-col items-center">
    <Seo
      title={`${SITE_NAME} – Free Online Typing Test & Practice`}
      description="VC Typing is a free online typing test and practice platform. Measure your WPM and accuracy, play typing games, and follow a typing tutor — with your history saved to your account."
      path="/"
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_ORIGIN,
        },
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any (web browser)",
          url: SITE_ORIGIN,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
      ]}
    />
    <div className="w-full flex flex-col items-center text-center gap-6 px-6 min-h-[calc(100vh-6rem)] justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6 }}
      >
        <TypingHero />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="text-black/50 max-w-md"
      >
        Typing tests, games, and a tutor — all in one place. WPM, accuracy, and full history saved to your account.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, type: "spring", stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <Link to="/home" className="inline-block px-8 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold">
          Start typing test
        </Link>
      </motion.div>
      <motion.nav
        aria-label="Explore VC Typing"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-black/40 dark:text-white/40"
      >
        <Link to="/home/tests" className="hover:underline">Typing test</Link>
        <span aria-hidden>·</span>
        <Link to="/home/typing-games" className="hover:underline">Typing games</Link>
        <span aria-hidden>·</span>
        <Link to="/home/tutor" className="hover:underline">Typing tutor</Link>
      </motion.nav>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1 }, y: { delay: 1, duration: 1.6, repeat: Infinity } }}
        className="mt-4 text-black/30 text-xs"
      >
        ↓ scroll to support us
      </motion.div>
    </div>

    <div className="w-full min-h-[calc(100vh-6rem)] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
        className="w-full flex justify-center"
      >
        <SupportSection />
      </motion.div>
    </div>
  </div>
);
