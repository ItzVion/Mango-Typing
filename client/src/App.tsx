import { Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { BugReportButton } from "./components/BugReportButton";
import { Landing } from "./pages/Landing";
import { Home } from "./pages/Home";
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
import { MaintenancePage } from "./pages/MaintenancePage";
import { api } from "./api/client";
import { useAuthStore } from "./stores/authStore";
import { useState } from "react";

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthInitialized = useAuthStore((s) => s.setAuthInitialized);
  const setAuthError = useAuthStore((s) => s.setAuthError);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("vc_token");
    if (!token) {
      setAuthInitialized(true);
      return;
    }

    api.me()
      .then((u) => {
        setUser(u);
        setAuthError(false);
      })
      .catch((e: any) => {
        // Only a real 401 (invalid/expired token) means "logged out" — the
        // api client already clears the token in that case. A network/server
        // error must NOT be treated as a logout, or a transient outage would
        // wrongly kick an owner out of their own session (and out of /admin).
        if (e?.status === 401) {
          setUser(null);
        } else {
          setAuthError(true);
        }
      })
      .finally(() => setAuthInitialized(true));
  }, [setUser, setAuthInitialized, setAuthError]);

  useEffect(() => {
    api.publicSettings().then((s) => setMaintenance(!!s.maintenanceMode)).catch(() => {});
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  // Maintenance mode blocks everyone except the owner and the /auth and
  // /admin routes, so the owner can always sign in and flip it back off.
  const isOwner = !!user?.isOwner;
  const allowedDuringMaintenance = location.pathname === "/auth" || location.pathname === "/admin";
  if (maintenance && !isOwner && !allowedDuringMaintenance) {
    return <MaintenancePage />;
  }

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
              <Route path="/" element={<Landing />} />
              <Route path="/home" element={<Home />} />
              <Route path="/home/tests" element={<Sheets />} />
              <Route path="/home/tests/:sheetId" element={<TypingTest />} />
              <Route path="/home/test-result" element={<TestResult />} />
              <Route path="/home/typing-games" element={<GamesHub />} />
              <Route path="/home/games/balloon" element={<BalloonGame />} />
              <Route path="/home/games/car" element={<CarGame />} />
              <Route path="/home/games/boss" element={<BossGame />} />
              <Route path="/home/tutor" element={<TutorHub />} />
              <Route path="/home/tutor/:lessonId" element={<LessonRunner />} />
              <Route path="/download" element={<Download />} />
              <Route path="/results" element={<History />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/refund" element={<Refund />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/donations" element={<DonationHistory />} />
              <Route path="/settings" element={<Settings />} />

              {/* Old URLs, kept working as redirects so existing links/bookmarks don't 404 */}
              <Route path="/sheets" element={<Navigate to="/home/tests" replace />} />
              <Route path="/test/:sheetId" element={<LegacyTestRedirect />} />
              <Route path="/test-result" element={<Navigate to="/home/test-result" replace />} />
              <Route path="/games" element={<Navigate to="/home/typing-games" replace />} />
              <Route path="/games/balloon" element={<Navigate to="/home/games/balloon" replace />} />
              <Route path="/games/car" element={<Navigate to="/home/games/car" replace />} />
              <Route path="/games/boss" element={<Navigate to="/home/games/boss" replace />} />
              <Route path="/tutor" element={<Navigate to="/home/tutor" replace />} />
              <Route path="/tutor/:lessonId" element={<LegacyTutorRedirect />} />

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

// Old dynamic routes (/test/:sheetId, /tutor/:lessonId) redirect to their
// new nested location under /home, preserving the param so old shared links
// still land on the right test/lesson instead of a dead end.
function LegacyTestRedirect() {
  const { sheetId } = useParams();
  return <Navigate to={`/home/tests/${sheetId}`} replace />;
}

function LegacyTutorRedirect() {
  const { lessonId } = useParams();
  return <Navigate to={`/home/tutor/${lessonId}`} replace />;
}