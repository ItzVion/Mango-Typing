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

// Small filled star icon — replaces the emoji used previously so it
// renders consistently everywhere instead of relying on the OS/browser's
// own emoji glyph.
const StarIcon = ({ size = 24, color = "#F5A623" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M12 2.5l2.9 6.1 6.6.7-4.9 4.5 1.3 6.6L12 17l-5.9 3.4 1.3-6.6-4.9-4.5 6.6-.7L12 2.5z" />
  </svg>
);

// Animated rotating conic-gradient ring around the card — a subtle glowing
// "aura" border, using the site's own accent color instead of a generic
// rainbow gradient. The card content sits in an inset div with the normal
// card background, so only a thin ring of the gradient shows.
const GlowBorder = ({ children }: { children: React.ReactNode }) => (
  <div className="relative rounded-3xl p-[2px] overflow-hidden">
    <motion.div
      className="absolute inset-[-50%]"
      style={{
        background: "conic-gradient(from 0deg, transparent 0%, #F5A623 15%, transparent 35%, transparent 65%, #F5A623 85%, transparent 100%)",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
    />
    <div className="relative rounded-[calc(1.5rem-2px)] bg-[var(--card-bg)] overflow-hidden">{children}</div>
  </div>
);

export const SupportSection = () => {
  const [message, setMessage] = useState(
    "Every rupee helps keep the servers running, the domains renewed, and new features shipping. Thank you for supporting VC Typing!"
  );
  const [amount, setAmount] = useState("49");
  const [loading, setLoading] = useState(false);
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

  // Signed-in users go straight to the amount picker; signed-out users
  // choose between signing in first (for the star) or tipping anonymously.
  useEffect(() => {
    if (user) setShowAmountPicker(true);
  }, [user]);

  const donate = async () => {
    setError("");
    const rupees = Math.round(Number(amount));
    if (!rupees || rupees < 1) {
      setError("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const order = await api.createDonationOrder(rupees);
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "VC Typing",
        description: "Support VC Typing",
        theme: { color: "#F5A623" },
        handler: async (response: any) => {
          try {
            await api.verifyDonation({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (user) setUser({ ...user, hasDonated: true });
            setCelebrate(true);
          } catch {
            setError("Payment succeeded but verification failed — contact support.");
          }
        },
      });
      rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
      rzp.open();
    } catch (e: any) {
      setError(e.message || "Couldn't start checkout");
    } finally {
      setLoading(false);
    }
  };

  const closeCelebration = () => {
    setCelebrate(false);
    setLetterOpen(false);
  };

  return (
    <div id="support" className="flex flex-col items-center gap-6 mt-4 scroll-mt-28">
      <h2 className="text-2xl font-bold text-center">Support Us</h2>

      <GlowBorder>
        <div className="relative w-full max-w-md p-7 overflow-hidden" style={{ minWidth: "min(24rem, 90vw)" }}>
          <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #F5A623, transparent 70%)" }} />
          <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #8b6bd8, transparent 70%)" }} />

          <motion.div
            className="relative flex items-center justify-between"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.span
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5 }}
            >
              <StarIcon size={26} />
            </motion.span>
            <h3 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">SUPPORT US</h3>
          </motion.div>

          <p className="relative text-sm mt-4 text-[var(--text-muted)]">{message}</p>

          <AnimatePresence mode="wait">
            {!showAmountPicker ? (
              <motion.div
                key="choice"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="relative mt-6 flex flex-col gap-3"
              >
                <p className="text-xs text-[var(--text-muted)]">
                  Sign in first so your donation adds a star next to your name — or skip that and tip anonymously right now.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/auth")}
                  className="w-full py-3 rounded-xl font-bold tracking-wide text-sm text-black"
                  style={{ backgroundColor: "#F5A623" }}
                >
                  Sign In to Support
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowAmountPicker(true)}
                  className="w-full py-3 rounded-xl border font-bold tracking-wide text-sm text-[var(--text-primary)]"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  Tip Anonymously
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="picker"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="relative mt-6 flex flex-col gap-3"
              >
                <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
                  <span className="px-3 py-3 font-semibold text-sm text-[var(--text-primary)]" style={{ backgroundColor: "var(--card-border)" }}>₹</span>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 px-3 py-3 outline-none text-sm bg-transparent text-[var(--text-primary)]"
                    placeholder="Amount"
                  />
                </div>

                <div className="flex gap-2">
                  {[49, 99, 199, 499].map((v) => (
                    <motion.button
                      key={v}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold border text-[var(--text-primary)]"
                      style={{ borderColor: amount === String(v) ? "#F5A623" : "var(--card-border)" }}
                    >
                      ₹{v}
                    </motion.button>
                  ))}
                </div>

                {error && <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={donate}
                  disabled={loading}
                  className="mt-1 w-full py-3 rounded-xl font-bold tracking-wide text-black disabled:opacity-60"
                  style={{ backgroundColor: "#F5A623" }}
                >
                  {loading ? "Opening…" : user ? "DONATE" : "TIP ANONYMOUSLY"}
                </motion.button>

                {!user && (
                  <motion.button
                    whileHover={{ x: -2 }}
                    onClick={() => setShowAmountPicker(false)}
                    className="text-xs text-[var(--text-muted)]"
                  >
                    ← Back
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlowBorder>

      {/* Post-payment celebration: big animated star, click to open a thank-you letter */}
      <AnimatePresence>
        {celebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={!letterOpen ? undefined : closeCelebration}
          >
            {!letterOpen ? (
              <motion.button
                onClick={() => setLetterOpen(true)}
                className="flex flex-col items-center gap-4 cursor-pointer"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
              >
                <motion.div
                  style={{ filter: "drop-shadow(0 0 40px rgba(245,166,35,0.8))" }}
                  animate={{ rotate: [0, 12, -12, 12, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  <StarIcon size={140} />
                </motion.div>
                <motion.p
                  className="text-white font-bold text-lg tracking-wide"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  Click the star
                </motion.p>
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.7, rotateX: -30 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-[#fdfaf3] text-black rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md w-[90%] mx-4"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                <div className="flex justify-center mb-2">
                  <StarIcon size={40} />
                </div>
                <p className="text-xl font-bold text-center mb-4">
                  Thank you{user ? `, ${user.username}` : ""}!
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.75)" }}>
                  Your support means the world to us. VC Typing is built and kept alive by people like
                  you — every contribution goes straight toward better servers, new features, and
                  keeping this place free for everyone who wants to improve their typing.
                  {user
                    ? " A star now shines next to your name across the site — wear it well."
                    : " Thanks for tipping anonymously — it counts just as much."}
                </p>
                <p className="text-sm mt-4 italic" style={{ color: "rgba(0,0,0,0.6)" }}>— The VC Typing Team</p>
                <button
                  onClick={closeCelebration}
                  className="mt-6 w-full py-2.5 rounded-xl bg-black text-white font-semibold text-sm"
                >
                  Close
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
