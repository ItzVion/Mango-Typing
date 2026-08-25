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
        theme: { color: "#000000" },
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

      <div className="relative w-full max-w-md rounded-3xl bg-white text-black p-7 overflow-hidden shadow-xl">
        <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-orange-300 opacity-70" />
        <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400 opacity-70" />
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-yellow-300 to-transparent opacity-60 rounded-bl-full" />

        <motion.div
          className="relative flex items-start justify-between"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.span
            className="text-3xl"
            animate={{ rotate: [0, -8, 8, -8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5 }}
          >
            ⭐
          </motion.span>
          <h3 className="text-xl font-extrabold tracking-tight">SUPPORT US</h3>
        </motion.div>

        <p className="relative text-sm mt-4" style={{ color: "rgba(0,0,0,0.6)" }}>{message}</p>

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
              <p className="text-xs" style={{ color: "rgba(0,0,0,0.5)" }}>
                Sign in first so your donation adds a star next to your name — or skip that and tip anonymously right now.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/auth")}
                className="w-full py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold tracking-wide text-sm"
              >
                Sign In to Support
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAmountPicker(true)}
                className="w-full py-3 rounded-xl border border-black/15 font-bold tracking-wide text-sm hover:bg-black/5"
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
              <div className="flex items-center border border-black/10 rounded-xl overflow-hidden">
                <span className="px-3 py-3 bg-black/5 font-semibold text-sm">₹</span>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 px-3 py-3 outline-none text-sm"
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
                    className="flex-1 py-2 rounded-lg text-xs font-semibold border border-black/10 hover:bg-black/5"
                  >
                    ₹{v}
                  </motion.button>
                ))}
              </div>

              {error && <p className="text-red-600 text-xs">{error}</p>}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={donate}
                disabled={loading}
                className="mt-1 w-full py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold tracking-wide"
              >
                {loading ? "Opening…" : user ? "DONATE" : "TIP ANONYMOUSLY"}
              </motion.button>

              {!user && (
                <motion.button
                  whileHover={{ x: -2 }}
                  onClick={() => setShowAmountPicker(false)}
                  className="text-xs" style={{ color: "rgba(0,0,0,0.4)" }}
                >
                  ← Back
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
                <motion.span
                  className="text-[9rem] leading-none drop-shadow-[0_0_40px_rgba(255,215,0,0.8)]"
                  animate={{ rotate: [0, 12, -12, 12, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  ⭐
                </motion.span>
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
                <div className="text-5xl text-center mb-2">⭐</div>
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
