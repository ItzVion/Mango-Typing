import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useTestGuardStore } from "../stores/testGuardStore";
import { ConfirmModal } from "./ConfirmModal";
import { FiChevronDown, FiMenu, FiStar, FiX } from "react-icons/fi";

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const testInProgress = useTestGuardStore((s) => s.testInProgress);
  const setTestInProgress = useTestGuardStore((s) => s.setTestInProgress);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const links = [
    { name: "Dashboard", path: "/" },
    { name: "Download", path: "/download" },
    { name: "Results", path: "/results" },
    { name: "Games", path: "/home/typing-games" },
    ...(user?.isOwner ? [{ name: "Admin", path: "/admin" }] : []),
  ];

  useEffect(() => {
    if (!menuOpen && !mobileNavOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) setMobileNavOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, mobileNavOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  // Any nav link goes through this instead of navigating directly. Mid-test,
  // it intercepts and asks first — this is the actual fix for "Dashboard
  // doesn't work while I'm in a test": previously it just silently discarded
  // the test guard state without ever asking anything.
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (testInProgress && path !== location.pathname) {
      e.preventDefault();
      setPendingPath(path);
    }
  };

  const confirmLeaveTest = () => {
    setTestInProgress(false);
    const dest = pendingPath;
    setPendingPath(null);
    if (dest) navigate(dest);
  };

  return (
    <div className="fixed top-3 left-0 right-0 z-50 flex flex-col items-center px-3 sm:px-4">
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="glass-nav grid grid-cols-[auto_1fr_auto] items-center w-full max-w-6xl px-3 sm:px-5 py-2.5 gap-4"
      >
        <Link
          to="/"
          onClick={(e) => handleNavClick(e, "/")}
          aria-label="Mango Typing home"
          className="font-bold text-base sm:text-lg tracking-wider shrink-0 flex items-center justify-self-start"
        >
          <img src="/logo-light-bg.svg" alt="Mango Typing" className="h-9 w-9 rounded-lg" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center justify-center gap-1 overflow-x-auto no-scrollbar min-w-0 justify-self-center">
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              onClick={(e) => handleNavClick(e, l.path)}
              className="relative shrink-0 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors"
              style={
                location.pathname === l.path
                  ? { color: "var(--accent)", backgroundColor: "var(--accent-soft)" }
                  : { color: "var(--text-muted)" }
              }
            >
              {l.name}
              {location.pathname === l.path && (
                <motion.span
                  layoutId="nav-active-underline"
                  className="absolute left-2.5 right-2.5 -bottom-0.5 h-[2px] rounded-full"
                  style={{ backgroundColor: "var(--accent)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        {/* Mobile: hamburger replaces the cramped link row */}
        <div className="flex sm:hidden justify-self-center relative" ref={mobileNavRef}>
          <button
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-navigation-menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--card-border)] text-[var(--text-primary)]"
          >
            {mobileNavOpen ? <FiX size={19} /> : <FiMenu size={19} />}
          </button>

          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                id="mobile-navigation-menu"
                className="card absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] w-48 max-w-[calc(100vw-2rem)] py-2 flex flex-col overflow-hidden z-50"
              >
                {links.map((l) => (
                  <Link
                    key={l.path}
                    to={l.path}
                    onClick={(e) => {
                      handleNavClick(e, l.path);
                      if (!(testInProgress && l.path !== location.pathname)) setMobileNavOpen(false);
                    }}
                    className="min-h-11 flex items-center px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
                    style={location.pathname === l.path ? { color: "var(--text-primary)" } : { color: "var(--text-muted)" }}
                  >
                    {l.name}
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-self-end">
          {user ? (
            <div className="relative" ref={menuRef}>
              <motion.button
                whileTap={{ scale: 0.94, y: 1 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setMenuOpen((o) => !o)}
                className="min-h-11 max-w-[42vw] sm:max-w-none px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl accent-bg whitespace-nowrap flex items-center gap-1.5"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {user.username[0]?.toUpperCase()}
                  </span>
                )}
                <span className="max-w-[24vw] truncate sm:max-w-none">{user.username}</span>{user.hasDonated && <FiStar size={12} aria-label="Supporter" className="shrink-0 text-[#e7a23a]" />}
<FiChevronDown size={14} className="shrink-0 text-current" />
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="card absolute right-0 top-[calc(100%+8px)] w-48 py-2 flex flex-col overflow-hidden z-50"
                  >
                    <Link
                      to="/donations"
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
                    >
                      Donation History
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2.5 text-sm font-semibold text-left hover:bg-white/5 transition-colors"
                      style={{ color: "var(--error)" }}
                    >
                      Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/auth">
              <motion.span
                whileTap={{ scale: 0.94, y: 1 }}
                whileHover={{ scale: 1.03 }}
                className="inline-block px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl accent-bg whitespace-nowrap"
              >
                Sign In
              </motion.span>
            </Link>
          )}
        </div>
      </motion.nav>
      <ConfirmModal
        open={pendingPath !== null}
        title="Cancel this test?"
        message="You have a typing test in progress. Leaving now will discard it — this can't be undone."
        confirmLabel="Yes, leave"
        cancelLabel="Stay"
        onConfirm={confirmLeaveTest}
        onCancel={() => setPendingPath(null)}
      />
    </div>
  );
};
