import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";

// Motion-primitives-style "Magnetic" effect: the element nudges slightly
// toward the cursor within its own bounds, then springs back on leave.
// Used sparingly (just the logo) — this is a flourish, not a workhorse.
function useMagnetic(strength = 0.25) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    setOffset({ x, y });
  };
  const onMouseLeave = () => setOffset({ x: 0, y: 0 });
  return { ref, offset, onMouseMove, onMouseLeave };
}

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const links = [
    { name: "Dashboard", path: "/home" },
    { name: "Download", path: "/download" },
    { name: "Results", path: "/results" },
    { name: "Games", path: "/home/typing-games" },
    ...(user?.isOwner ? [{ name: "Admin", path: "/admin" }] : []),
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const magnetic = useMagnetic();

  return (
    <div className="fixed top-5 left-0 right-0 z-50 flex flex-col items-center px-4 gap-2">
      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-nav grid grid-cols-[auto_1fr_auto] items-center w-full max-w-5xl px-4 sm:px-6 py-3 rounded-2xl gap-2 transition-shadow"
        style={scrolled ? { boxShadow: "0 8px 30px -12px rgba(0,0,0,0.25)" } : {}}
      >
        <Link
          to="/"
          className="font-bold text-base sm:text-lg tracking-wider shrink-0 flex items-center justify-self-start"
          ref={magnetic.ref as React.RefObject<HTMLAnchorElement>}
          onMouseMove={magnetic.onMouseMove}
          onMouseLeave={magnetic.onMouseLeave}
        >
          <motion.img
            animate={{ x: magnetic.offset.x, y: magnetic.offset.y }}
            transition={{ type: "spring", stiffness: 150, damping: 12 }}
            whileHover={{ rotate: -6, scale: 1.06 }}
            src={theme === "light" ? "/logo-dark-bg.svg" : "/logo-light-bg.svg"}
            alt="VC Typing"
            className="w-9 h-9 rounded-md"
          />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center justify-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar min-w-0 justify-self-center">
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className="relative shrink-0 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap hover:text-black dark:hover:text-white"
              style={
                location.pathname === l.path
                  ? { color: "var(--text-primary)" }
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
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label="Open navigation"
            className="w-9 h-9 rounded-xl flex flex-col items-center justify-center gap-1 border border-[var(--card-border)]"
          >
            <motion.span
              animate={mobileNavOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
              className="w-4 h-[2px] rounded-full"
              style={{ backgroundColor: "var(--text-primary)" }}
            />
            <motion.span
              animate={mobileNavOpen ? { opacity: 0 } : { opacity: 1 }}
              className="w-4 h-[2px] rounded-full"
              style={{ backgroundColor: "var(--text-primary)" }}
            />
            <motion.span
              animate={mobileNavOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
              className="w-4 h-[2px] rounded-full"
              style={{ backgroundColor: "var(--text-primary)" }}
            />
          </motion.button>

          <AnimatePresence>
            {mobileNavOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="card absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] w-44 py-2 flex flex-col overflow-hidden z-50"
              >
                {links.map((l) => (
                  <Link
                    key={l.path}
                    to={l.path}
                    className="px-4 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
          <motion.button
            onClick={toggle}
            aria-label="Toggle theme"
            whileTap={{ scale: 0.85, y: 1 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--card-border)] text-sm overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.25 }}
              >
                {theme === "light" ? "🌙" : "☀️"}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <motion.button
                whileTap={{ scale: 0.94, y: 1 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setMenuOpen((o) => !o)}
                className="px-3 sm:px-4 py-2 text-xs font-semibold rounded-xl accent-bg whitespace-nowrap flex items-center gap-1.5"
              >
                {user.username}{user.hasDonated ? " ⭐" : ""}
                <motion.span
                  animate={{ rotate: menuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[10px]"
                >
                  ▾
                </motion.span>
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
                      className="px-4 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      Donation History
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2.5 text-sm font-semibold text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
      <motion.p
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="text-[11px] sm:text-xs tracking-wide text-black/40 dark:text-white/40 select-none"
      >
        Practice typing. Track progress. Get faster.
      </motion.p>
    </div>
  );
};
