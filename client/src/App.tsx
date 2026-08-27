import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { BugReportButton } from "./components/BugReportButton";
import { Dashboard } from "./pages/Dashboard";
import { Sheets } from "./pages/Sheets";
import { TypingTest } from "./pages/TypingTest";
import { TestResult } from "./pages/TestResult";
import { Download } from "./pages/Download";
import { History } from "./pages/History";
import { Auth } from "./pages/Auth";
import { AdminPanel } from "./pages/AdminPanel";
import { Privacy } from "./pages/legal/Privacy";
import { Refund } from "./pages/legal/Refund";
import { Terms } from "./pages/legal/Terms";
import { GamesHub } from "./pages/Games/GamesHub";
import { BalloonGame } from "./pages/Games/BalloonGame";
import { CarGame } from "./pages/Games/CarGame";
import { BossGame } from "./pages/Games/BossGame";
import { TutorHub } from "./pages/Tutor/TutorHub";
import { LessonRunner } from "./pages/Tutor/LessonRunner";
import { DonationHistory } from "./pages/DonationHistory";
import { Settings } from "./pages/Settings";
import { NotFound } from "./pages/NotFound";
import { api } from "./api/client";
import { useAuthStore } from "./stores/authStore";

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();

  useEffect(() => {
    if (localStorage.getItem("vc_token")) {
      api.me().then(setUser).catch(() => localStorage.removeItem("vc_token"));
    }
  }, [setUser]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <>
      <Navbar />
      <div className="pt-32 pb-4 px-6 max-w-6xl mx-auto min-h-[70vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageTransition}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sheets" element={<Sheets />} />
              <Route path="/test/:sheetId" element={<TypingTest />} />
              <Route path="/test-result" element={<TestResult />} />
              <Route path="/download" element={<Download />} />
              <Route path="/results" element={<History />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/games" element={<GamesHub />} />
              <Route path="/games/balloon" element={<BalloonGame />} />
              <Route path="/games/car" element={<CarGame />} />
              <Route path="/games/boss" element={<BossGame />} />
              <Route path="/tutor" element={<TutorHub />} />
              <Route path="/tutor/:lessonId" element={<LessonRunner />} />
              <Route path="/donations" element={<DonationHistory />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      <Footer />
      <BugReportButton />
    </>
  );
}