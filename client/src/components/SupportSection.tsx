import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

let razorpayCheckoutPromise: Promise<void> | null = null;

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayCheckoutPromise) {
    razorpayCheckoutPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpayCheckout = "true";
      script.onload = () => {
        if (window.Razorpay) resolve();
        else {
          razorpayCheckoutPromise = null;
          reject(new Error("Payment checkout could not be initialized. Please try again."));
        }
      };
      script.onerror = () => {
        script.remove();
        razorpayCheckoutPromise = null;
        reject(new Error("Could not load payment checkout. Check your connection and try again."));
      };
      document.head.appendChild(script);
    });
  }
  return razorpayCheckoutPromise;
}

const StarIcon = ({ size = 24, color = "#F5A623" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
    <path d="M12 2.5 14.9 8.6l6.6.7-4.9 4.5 1.3 6.6L12 17l-5.9 3.4 1.3-6.6-4.9-4.5 6.6-.7L12 2.5Z" fill={color} />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[#f5a623]" fill="none" aria-hidden="true">
    <path d="m5 10.25 3.1 3.1L15.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SupportSection = () => {
  const [message, setMessage] = useState("Every rupee helps keep the servers running, the domains renewed, and new features shipping. Thank you for supporting MangoTyping!");
  const [amount, setAmount] = useState("49");
  const [loading, setLoading] = useState(false);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [showAmountPicker, setShowAmountPicker] = useState(false);
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.publicSettings().then((s) => {
      if (s.donationMessage) setMessage(s.donationMessage);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) setShowAmountPicker(true);
  }, [user]);

  useEffect(() => {
    if (!paymentVerifying) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [paymentVerifying]);

  const donate = async () => {
    setError("");
    const rupees = Number(amount);
    if (!Number.isSafeInteger(rupees) || rupees < 1 || rupees > 100000) {
      setError("Enter a whole amount between ₹1 and ₹1,00,000.");
      return;
    }

    setLoading(true);
    try {
      // Load the payment provider only after the visitor explicitly starts a donation.
      await loadRazorpayCheckout();
      const order = await api.createDonationOrder(rupees);
      let paymentResolved = false;
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "MangoTyping",
        description: "Support MangoTyping",
        theme: { color: "#F5A623" },
        handler: async (response: any) => {
          paymentResolved = true;
          setPaymentVerifying(true);
          try {
            await api.verifyDonation({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (user) setUser({ ...user, hasDonated: true });
            setPaymentVerifying(false);
            setCelebrate(true);
          } catch {
            setPaymentVerifying(false);
            setError("Payment succeeded but verification failed — contact support.");
          }
        },
      });
      rzp.on("payment.failed", () => {
        paymentResolved = true;
        setPaymentVerifying(false);
        setError("Payment failed. Please try again.");
      });
      rzp.on("modal.ondismiss", () => {
        if (!paymentResolved) {
          setPaymentVerifying(false);
          setError("Payment cancelled.");
        }
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Couldn't start checkout");
    } finally {
      setLoading(false);
    }
  };

  const closeCelebration = () => { setCelebrate(false); setLetterOpen(false); };
  const busy = loading || paymentVerifying;

  return (
    <section id="support" aria-labelledby="support-title" className="w-full scroll-mt-28">
      <div className="grid w-full items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(360px,0.88fr)] md:gap-12 lg:gap-20">
        <div className="max-w-xl py-2">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(245,166,35,0.28)] bg-[rgba(245,166,35,0.07)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f5a623]">
            <StarIcon size={13} />
            Community powered
          </div>
          <h2 id="support-title" className="max-w-lg text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl lg:text-[2.75rem]">
            Help keep typing practice <span className="text-[#f5a623]">free for everyone.</span>
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--text-muted)] sm:text-base sm:leading-8">
            MangoTyping is built to make getting better at typing simple and accessible. Your contribution helps with the everyday costs behind it and gives us room to keep improving.
          </p>

          <div className="mt-7 space-y-3.5">
            {[
              "Keep the practice tools open and free",
              "Help cover hosting and domain costs",
              "Support new lessons, games and improvements",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
                <CheckIcon />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 border-l-2 border-[#f5a623] pl-4 text-sm leading-6 text-[var(--text-muted)]">
            No subscription or pressure. A one-time contribution of any amount makes a difference.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[470px]">
          <div className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,166,35,0.11),transparent_65%)]" />
          <div className="relative overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--card-border)] pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f5a623]">Support MangoTyping</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-2xl">Make a contribution</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">Choose an amount that feels right.</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(245,166,35,0.24)] bg-[rgba(245,166,35,0.08)]">
                <StarIcon size={22} />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!showAmountPicker ? (
                <motion.div
                  key="choice"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="pt-5"
                >
                  <p className="text-sm leading-6 text-[var(--text-muted)]">
                    Sign in to have a supporter star shown beside your name, or continue with an anonymous tip.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/auth")}
                    className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#f5a623] px-5 py-3 text-sm font-semibold text-[#18140b] transition-colors hover:bg-[#ffc15b]"
                  >
                    Sign in to support <span className="ml-2" aria-hidden="true">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAmountPicker(true)}
                    className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--card-border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[#f5a623]"
                  >
                    Continue anonymously
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="picker"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="pt-5"
                >
                  <label htmlFor="support-amount" className="mb-2 block text-xs font-semibold text-[var(--text-muted)]">
                    Contribution amount (INR)
                  </label>
                  <div className="flex min-h-14 items-center overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--bg-main)] transition-colors focus-within:border-[#f5a623]">
                    <span className="border-r border-[var(--card-border)] px-4 py-3.5 text-base font-semibold text-[var(--text-muted)]">₹</span>
                    <input
                      id="support-amount"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100000}
                      step={1}
                      value={amount}
                      disabled={busy}
                      onChange={(e) => { setAmount(e.target.value); setError(""); }}
                      className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-60"
                      placeholder="Enter amount"
                      aria-describedby="support-amount-hint"
                    />
                  </div>
                  <p id="support-amount-hint" className="mt-2 text-xs text-[var(--text-muted)]">Choose a preset or enter any whole amount up to ₹1,00,000.</p>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {[49, 99, 199, 499].map((value) => {
                      const selected = amount === String(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={selected}
                          disabled={busy}
                          onClick={() => { setAmount(String(value)); setError(""); }}
                          className={[
                            "min-h-11 rounded-lg border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                            selected
                              ? "border-[#f5a623] bg-[rgba(245,166,35,0.1)] text-[#f5a623]"
                              : "border-[var(--card-border)] text-[var(--text-primary)] hover:border-[#f5a623]",
                          ].join(" ")}
                        >
                          ₹{value}
                        </button>
                      );
                    })}
                  </div>

                  {error && <p role="alert" aria-live="polite" className="mt-4 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/5 px-3 py-2.5 text-xs leading-5 text-[var(--error)]">{error}</p>}

                  <button
                    type="button"
                    onClick={donate}
                    disabled={busy}
                    className="mt-5 inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-[#f5a623] px-5 py-3.5 text-sm font-bold text-[#18140b] transition-colors hover:bg-[#ffc15b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Preparing secure checkout…" : paymentVerifying ? "Confirming payment…" : user ? "Continue to secure payment" : "Tip anonymously"}
                    {!busy && <span className="ml-2" aria-hidden="true">→</span>}
                  </button>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <rect x="3.5" y="8" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M6.5 8V5.8a3.5 3.5 0 0 1 7 0V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    Secure one-time checkout powered by Razorpay
                  </div>

                  {!user && (
                    <button
                      type="button"
                      onClick={() => { setShowAmountPicker(false); setError(""); }}
                      className="mt-4 min-h-9 w-full text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      ← Back to support options
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {paymentVerifying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-verifying-title">
            <div className="w-[min(420px,88vw)] text-center px-6">
              <div className="mx-auto mb-6 h-2 w-full overflow-hidden rounded-full bg-white/15">
                <motion.div className="h-full w-1/3 rounded-full bg-[#F5A623]" animate={{ x: ["-140%", "420%"] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
              </div>
              <p id="payment-verifying-title" className="text-white text-lg font-bold">Confirming your payment…</p>
              <p className="text-white/60 text-sm mt-2">Please don’t close or refresh this page.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {celebrate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={!letterOpen ? undefined : closeCelebration}>
            {!letterOpen ? (
              <motion.button onClick={() => setLetterOpen(true)} className="flex flex-col items-center gap-4 cursor-pointer" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
                <motion.div style={{ filter: "drop-shadow(0 0 40px rgba(245,166,35,0.8))" }} animate={{ rotate: [0, 12, -12, 12, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }}><StarIcon size={120} /></motion.div>
                <motion.p className="text-white font-bold text-lg tracking-wide" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }}>Click the star</motion.p>
              </motion.button>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.7, rotateX: -30 }} animate={{ opacity: 1, scale: 1, rotateX: 0 }} transition={{ type: "spring", stiffness: 220, damping: 20 }} onClick={(e) => e.stopPropagation()} className="relative bg-[#fdfaf3] text-black rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md w-full" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                <div className="flex justify-center mb-2"><StarIcon size={40} /></div>
                <p className="text-xl font-bold text-center mb-4">Thank you{user ? `, ${user.username}` : ""}!</p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.75)" }}>Your support means the world to us. MangoTyping is built and kept alive by people like you — every contribution goes straight toward better servers, new features, and keeping this place free for everyone who wants to improve typing.{user ? " A star now shines next to your name across the site — wear it well." : " Thanks for tipping anonymously — it counts just as much."}</p>
                <p className="text-sm mt-4 italic" style={{ color: "rgba(0,0,0,0.6)" }}>— The MangoTyping Team</p>
                <button onClick={closeCelebration} className="mt-6 min-h-11 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white">Close</button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
