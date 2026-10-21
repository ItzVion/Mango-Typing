import { Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { BugReportButton } from "./components/BugReportButton";
import { AnimationLayer } from "./components/AnimationLayer";
import { api } from "./api/client";
import { useAuthStore } from "./stores/authStore";
import { LoadingState } from "./components/LoadingState";

const Landing = lazy(() => import("./pages/Landing").then((module) => ({ default: module.Landing })));
const Home = lazy(() => import("./pages/Home").then((module) => ({ default: module.Home })));
const Sheets = lazy(() => import("./pages/Sheets").then((module) => ({ default: module.Sheets })));
const TypingTest = lazy(() => import("./pages/TypingTest").then((module) => ({ default: module.TypingTest })));
const TestResult = lazy(() => import("./pages/TestResult").then((module) => ({ default: module.TestResult })));
const Download = lazy(() => import("./pages/Download").then((module) => ({ default: module.Download })));
const History = lazy(() => import("./pages/History").then((module) => ({ default: module.History })));
const Auth = lazy(() => import("./pages/Auth").then((module) => ({ default: module.Auth })));
const AdminPanel = lazy(() => import("./pages/AdminPanel").then((module) => ({ default: module.AdminPanel })));
const Privacy = lazy(() => import("./pages/legal/Privacy").then((module) => ({ default: module.Privacy })));
const Refund = lazy(() => import("./pages/legal/Refund").then((module) => ({ default: module.Refund })));
const Terms = lazy(() => import("./pages/legal/Terms").then((module) => ({ default: module.Terms })));
const About = lazy(() => import("./pages/About").then((module) => ({ default: module.About })));
const ThirdPartyNotice = lazy(() => import("./pages/ThirdPartyNotice").then((module) => ({ default: module.ThirdPartyNotice })));
const GamesHub = lazy(() => import("./pages/Games/GamesHub").then((module) => ({ default: module.GamesHub })));
const BalloonGame = lazy(() => import("./pages/Games/BalloonGame").then((module) => ({ default: module.BalloonGame })));
const CarGame = lazy(() => import("./pages/Games/CarGame").then((module) => ({ default: module.CarGame })));
const BossGame = lazy(() => import("./pages/Games/BossGame").then((module) => ({ default: module.BossGame })));
const TutorHub = lazy(() => import("./pages/Tutor/TutorHub").then((module) => ({ default: module.TutorHub })));
const LessonRunner = lazy(() => import("./pages/Tutor/LessonRunner").then((module) => ({ default: module.LessonRunner })));
const DonationHistory = lazy(() => import("./pages/DonationHistory").then((module) => ({ default: module.DonationHistory })));
const Settings = lazy(() => import("./pages/Settings").then((module) => ({ default: module.Settings })));
const NotFound = lazy(() => import("./pages/NotFound").then((module) => ({ default: module.NotFound })));
const MaintenancePage = lazy(() => import("./pages/MaintenancePage").then((module) => ({ default: module.MaintenancePage })));

const pageTransition = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } };

export default function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthInitialized = useAuthStore((s) => s.setAuthInitialized);
  const setAuthError = useAuthStore((s) => s.setAuthError);
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.authInitialized);
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceReady, setMaintenanceReady] = useState(false);

  useEffect(() => {
    api.me().then((u) => { setUser(u); setAuthError(false); }).catch((e: any) => {
      if (e?.status === 401) setUser(null); else setAuthError(true);
    }).finally(() => setAuthInitialized(true));
  }, [setUser, setAuthInitialized, setAuthError]);

  useEffect(() => {
    let active = true;
    let requestSequence = 0;

    const refreshMaintenance = () => {
      // Avoid requests while hidden; refresh immediately when the tab returns.
      if (document.visibilityState === "hidden") return;
      const sequence = ++requestSequence;
      api.publicSettings(true)
        .then((settings) => {
          if (active && sequence === requestSequence) {
            setMaintenance(!!settings.maintenanceMode);
            setMaintenanceReady(true);
          }
        })
        .catch(() => {
          // Fail open if the first settings request is unavailable; keep
          // the last known value on subsequent refresh failures.
          if (active && sequence === requestSequence) setMaintenanceReady(true);
        });
    };

    refreshMaintenance();
    const interval = window.setInterval(refreshMaintenance, 10_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshMaintenance();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", refreshMaintenance);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", refreshMaintenance);
    };
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); }, [location.pathname]);

  const isOwner = !!user?.isOwner;
  const allowedDuringMaintenance = location.pathname === "/auth" || location.pathname === "/admin" || location.pathname === "/privacy" || location.pathname === "/terms" || location.pathname === "/refund" || location.pathname === "/about" || location.pathname === "/third-party-notice";

  // Prevent a flash of the normal site before public settings load, and don't
  // mistake an owner for a guest while their session is still being restored.
  if (!allowedDuringMaintenance && !maintenanceReady) {
    return <LoadingState label="Checking site availability…" />;
  }
  if (maintenance && !authInitialized && !allowedDuringMaintenance) {
    return <LoadingState label="Checking maintenance access…" />;
  }
  if (maintenance && authInitialized && !isOwner && !allowedDuringMaintenance) {
    return <Suspense fallback={<LoadingState label="Loading maintenance page…" />}><MaintenancePage /></Suspense>;
  }

  return <>
    <AnimationLayer />
    <Navbar />
    <div className="pt-32 pb-4 px-4 sm:px-6 max-w-6xl mx-auto min-h-[70vh]">
      <Suspense fallback={<LoadingState label="Loading page…" />}>
      <AnimatePresence mode="wait">
        <motion.div key={location.pathname} initial="initial" animate="animate" exit="exit" variants={pageTransition} transition={{ duration: 0.28, ease: "easeOut" }}>
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
            <Route path="/auth" element={authInitialized && user ? <Navigate to="/" replace /> : <Auth />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund" element={<Refund />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            <Route path="/third-party-notice" element={<ThirdPartyNotice />} />
            <Route path="/donations" element={<DonationHistory />} />
            <Route path="/settings" element={<Settings />} />
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
      </Suspense>
    </div>
    <Footer />
    <BugReportButton />
  </>;
}

function LegacyTestRedirect() {
  const { sheetId } = useParams();
  return <Navigate to={`/home/tests/${sheetId}`} replace />;
}

function LegacyTutorRedirect() {
  const { lessonId } = useParams();
  return <Navigate to={`/home/tutor/${lessonId}`} replace />;
}
