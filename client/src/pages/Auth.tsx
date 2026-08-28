import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { KeyboardArt } from "../components/KeyboardArt";
import { OtpInput } from "../components/OtpInput";

// Per-character blur/slide-in text — same effect family as motion-primitives'
// TextEffect, built directly on framer-motion so no extra CLI/package/path-alias
// setup is needed in this project.
const BlurText = ({ text, className }: { text: string; className?: string }) => {
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.025 } },
  };
  const item = {
    hidden: { opacity: 0, filter: "blur(8px)", y: 6 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.35 } },
  };
  return (
    <motion.span variants={container} initial="hidden" animate="visible" className={className}>
      {text.split("").map((ch, i) => (
        <motion.span key={i} variants={item} className="inline-block">
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </motion.span>
  );
};

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
  </svg>
);

type Step = "login" | "register" | "otp" | "googleSetup";

const inputClass =
  "bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2 w-full outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors";

// Google's Identity Services script renders its button into a real DOM node
// exactly once. If that node ever unmounts (e.g. because it lives inside a
// step-keyed AnimatePresence block that gets torn down on every Sign In <->
// Register switch), the button is gone for good until a full page reload.
// This hook owns that one persistent node and its one-time init, completely
// decoupled from whatever step the form is currently on.
function useGoogleSignIn(onCredential: (credential: string) => void, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    // Google's script tag is async/defer, so on a hard refresh it can still
    // be loading when this effect first runs. Poll briefly until it's ready
    // instead of a single check that can miss the window entirely.
    const tryInit = () => {
      if (initializedRef.current || !window.google || !containerRef.current) return false;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, { theme: "outline", size: "large", width: 320 });
      initializedRef.current = true;
      return true;
    };
    if (tryInit()) return;
    const interval = setInterval(() => {
      if (tryInit()) clearInterval(interval);
    }, 150);
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return { containerRef, visible: enabled };
}

export const Auth = () => {
  const [step, setStep] = useState<Step>("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", identifier: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const agreedRef = useRef(false);
  useEffect(() => {
    agreedRef.current = agreed;
  }, [agreed]);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || "/";

  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const [googleSetupForm, setGoogleSetupForm] = useState({ username: "", password: "" });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const doLogin = async () => {
    if (!agreed) {
      setError("Please agree to the Terms, Privacy Policy and Refund Policy first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.login(form.identifier, form.password);
      login(res.token, res.user);
      navigate(redirectTo);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!agreed) {
      setError("Please agree to the Terms, Privacy Policy and Refund Policy first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.register(form.username, form.email, form.password);
      setStep("otp");
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const doVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await api.verifyOtp(form.email, otp);
      login(res.token, res.user);
      navigate(redirectTo);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await api.resendOtp(form.email);
      setNotice("New code sent.");
      setResendCooldown(30);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      if (!agreedRef.current) {
        setError("Please agree to the Terms, Privacy Policy and Refund Policy first.");
        return;
      }
      setError("");
      try {
        const res = await api.googleLogin(credential);
        if (res.needsSetup) {
          setPendingGoogleCredential(credential);
          setGoogleSetupForm({ username: res.suggestedUsername || "", password: "" });
          setStep("googleSetup");
          return;
        }
        login(res.token, res.user);
        navigate(redirectTo);
      } catch (e: any) {
        setError(e.message || "Google sign-in failed");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [redirectTo]
  );

  const completeGoogleSetup = async () => {
    if (!pendingGoogleCredential) return;
    setError("");
    setLoading(true);
    try {
      const res = await api.googleComplete(pendingGoogleCredential, googleSetupForm.username, googleSetupForm.password);
      login(res.token, res.user);
      navigate(redirectTo);
    } catch (e: any) {
      setError(e.message || "Couldn't finish setting up your account");
    } finally {
      setLoading(false);
    }
  };

  const showGoogleAndHeading = step === "login" || step === "register";
  const google = useGoogleSignIn(handleGoogleCredential, showGoogleAndHeading);

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 rounded-2xl overflow-hidden border border-[var(--card-border)]">
      {/* Left: branded panel with the tilted keyboard illustration */}
      <div className="hidden md:flex relative flex-col justify-between bg-black text-white p-8 overflow-hidden">
        <div className="absolute -right-24 -bottom-24 w-[420px] h-[420px] opacity-90" style={{ transform: "rotate(45deg)" }}>
          <KeyboardArt />
        </div>
        <div
          className="absolute -right-10 -bottom-10 w-[300px] h-[300px] rounded-full blur-3xl opacity-20"
          style={{ background: "#F5A623" }}
        />
        <div className="relative z-10">
          <BlurText text="VC TYPING" className="text-2xl font-bold font-mono" />
        </div>
        <div className="relative z-10 max-w-xs">
          <BlurText
            text={step === "login" ? "Welcome back." : "Type faster, track everything."}
            className="text-xl font-semibold block mb-2"
          />
          <p className="text-white/50 text-sm">
            Practice tests, games, and a tutor — with your full history saved to one account.
          </p>
        </div>
      </div>

      {/* Right: the actual form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 flex flex-col gap-4 overflow-hidden bg-[var(--card-bg)]"
      >
        {/* Heading and Google button both live OUTSIDE the step-keyed
            AnimatePresence block below, so switching Sign In <-> Register
            never unmounts either of them — that unmount is what used to
            make the Google button vanish for good. Visual order is fixed:
            heading, then Google, then "or", then the manual form. */}
        {showGoogleAndHeading && (
          <AnimatePresence mode="wait">
            <motion.h2
              key={step}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="text-2xl font-bold text-center"
            >
              {step === "login" ? "Sign In" : "Create Account"}
            </motion.h2>
          </AnimatePresence>
        )}

        <div className={`relative ${google.visible ? "" : "hidden"}`}>
          {GOOGLE_CLIENT_ID && (
            <div ref={google.containerRef} className={`flex justify-center transition-opacity ${!agreed ? "opacity-40" : ""}`} />
          )}
          {GOOGLE_CLIENT_ID && !agreed && (
            <div
              className="absolute inset-0 cursor-not-allowed"
              onClick={() => setNotice("Check the box below to agree to our Terms, Privacy Policy and Refund Policy first.")}
            />
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === "login" || step === "register" ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: step === "register" ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: step === "register" ? -40 : 40 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col gap-4"
            >
              {!GOOGLE_CLIENT_ID && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => {
                    if (!agreed) {
                      setNotice("Check the box below to agree to our Terms, Privacy Policy and Refund Policy first.");
                      return;
                    }
                    setNotice("Google sign-in isn't set up yet — coming soon.");
                  }}
                  className="flex items-center justify-center gap-2 border border-[var(--card-border)] rounded-xl py-2 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <GoogleLogo />
                  Continue with Google
                </motion.button>
              )}

              <div className="flex items-center gap-3 text-black/30 text-xs">
                <div className="flex-1 h-px bg-black/10" />
                or
                <div className="flex-1 h-px bg-black/10" />
              </div>

              {step === "register" && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={inputClass}
                />
              )}

              {step === "login" ? (
                <input
                  placeholder="Email or username"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  className={inputClass}
                />
              ) : (
                <input
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              )}

              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
              />

              {step === "login" && (
                <button
                  type="button"
                  onClick={() => setNotice("Password reset isn't set up yet — coming soon.")}
                  className="text-black/40 text-xs text-left -mt-2"
                >
                  Forgot password?
                </button>
              )}

              <label className="flex items-start gap-3 text-xs leading-relaxed text-black/50 dark:text-white/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError("");
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#F5A623]"
                />
                <span>
                  By {step === "login" ? "signing in to" : "signing up on"} VC Typing, you agree to our{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#D98C1F] dark:text-[#F5A623] underline">
                    Terms &amp; Conditions
                  </a>
                  ,{" "}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#D98C1F] dark:text-[#F5A623] underline">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="/refund" target="_blank" rel="noopener noreferrer" className="text-[#D98C1F] dark:text-[#F5A623] underline">
                    Refund Policy
                  </a>
                  .
                </span>
              </label>

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--error)] text-sm">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              {notice && <p className="text-black/40 text-sm">{notice}</p>}

              <motion.button
                whileHover={{ scale: agreed ? 1.02 : 1 }}
                whileTap={{ scale: agreed ? 0.96 : 1 }}
                onClick={step === "login" ? doLogin : doRegister}
                disabled={loading || !agreed}
                className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold disabled:opacity-40"
              >
                {loading ? "Please wait…" : step === "login" ? "Sign In" : "Send verification code"}
              </motion.button>

              <button
                onClick={() => {
                  setError("");
                  setStep(step === "login" ? "register" : "login");
                }}
                className="text-black/40 text-sm"
              >
                {step === "login" ? "Need an account? Register" : "Have an account? Sign In"}
              </button>
            </motion.div>
          ) : step === "otp" ? (
            <motion.div
              key="otp"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="flex flex-col gap-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="text-4xl text-center"
              >
                ✉️
              </motion.div>
              <h2 className="text-xl font-bold text-center">Check your email</h2>
              <p className="text-black/50 text-sm text-center">
                We sent a 6-digit code to <span className="font-semibold">{form.email}</span>. Enter it below to finish creating your account.
              </p>

              <OtpInput value={otp} onChange={setOtp} length={6} />

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--error)] text-sm text-center">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              {notice && <p className="text-black/40 text-sm text-center">{notice}</p>}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={doVerify}
                disabled={loading || otp.length !== 6}
                className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold disabled:opacity-40"
              >
                {loading ? "Verifying…" : "Verify & Create Account"}
              </motion.button>

              <button onClick={resend} disabled={resendCooldown > 0} className="text-black/40 text-sm disabled:opacity-40">
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>

              <button onClick={() => setStep("register")} className="text-black/30 text-xs">
                ← Wrong email? Go back
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="googleSetup"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="flex flex-col gap-4"
            >
              <h2 className="text-xl font-bold text-center">Almost done</h2>
              <p className="text-black/50 text-sm text-center">
                First time signing in with Google — pick a username and password so you can also log in with email later.
              </p>

              <input
                placeholder="Username"
                value={googleSetupForm.username}
                onChange={(e) => setGoogleSetupForm({ ...googleSetupForm, username: e.target.value })}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Password"
                value={googleSetupForm.password}
                onChange={(e) => setGoogleSetupForm({ ...googleSetupForm, password: e.target.value })}
                className={inputClass}
              />

              <AnimatePresence>
                {error && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[var(--error)] text-sm text-center">
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={completeGoogleSetup}
                disabled={loading || googleSetupForm.username.trim().length < 3 || googleSetupForm.password.length < 6}
                className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold disabled:opacity-40"
              >
                {loading ? "Creating account…" : "Finish Sign Up"}
              </motion.button>

              <button
                onClick={() => {
                  setPendingGoogleCredential(null);
                  setError("");
                  setStep("login");
                }}
                className="text-black/30 text-xs"
              >
                ← Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
