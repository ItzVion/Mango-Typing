import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api/client";
import { useAuthStore } from "../stores/authStore";

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

type Step = "login" | "register" | "otp";

const inputClass = "bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2 w-full outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors";

export const Auth = () => {
  const [step, setStep] = useState<Step>("login");
  const [form, setForm] = useState({ username: "", email: "", password: "", identifier: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const googleBtnRef = useRef<HTMLDivElement>(null);

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
      navigate("/");
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
      navigate("/");
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

  const handleGoogleCredential = async (response: any) => {
    if (!agreed) {
      setError("Please agree to the Terms, Privacy Policy and Refund Policy first.");
      return;
    }
    setError("");
    try {
      const res = await api.googleLogin(response.credential);
      login(res.token, res.user);
      navigate("/");
    } catch (e: any) {
      setError(e.message || "Google sign-in failed");
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google || !googleBtnRef.current || step === "otp") return;
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
    window.google.accounts.id.renderButton(googleBtnRef.current, { theme: "outline", size: "large", width: 320 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-sm mx-auto card p-6 flex flex-col gap-4 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {step !== "otp" ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: step === "register" ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step === "register" ? -40 : 40 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col gap-4"
          >
            <motion.h2
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold text-center"
            >
              {step === "login" ? "Sign In" : "Create Account"}
            </motion.h2>

            <div className="relative">
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className={`flex justify-center transition-opacity ${!agreed ? "opacity-40" : ""}`} />
              ) : (
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
              {!agreed && (
                <div
                  className="absolute inset-0 cursor-not-allowed"
                  onClick={() => setNotice("Check the box below to agree to our Terms, Privacy Policy and Refund Policy first.")}
                />
              )}
            </div>

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
                onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError(""); }}
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
                </a>
                {" "}and{" "}
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
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="flex flex-col gap-4"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }} className="text-4xl text-center">
              ✉️
            </motion.div>
            <h2 className="text-xl font-bold text-center">Check your email</h2>
            <p className="text-black/50 text-sm text-center">
              We sent a 6-digit code to <span className="font-semibold">{form.email}</span>. Enter it below to finish creating your account.
            </p>

            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              className={`${inputClass} text-center text-2xl tracking-[0.5em] font-bold`}
            />

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

            <button
              onClick={resend}
              disabled={resendCooldown > 0}
              className="text-black/40 text-sm disabled:opacity-40"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </button>

            <button onClick={() => setStep("register")} className="text-black/30 text-xs">
              ← Wrong email? Go back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};