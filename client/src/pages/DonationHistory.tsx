import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";

type Donation = { id: string; amountRupees: number; status: string; createdAt: string };

export const DonationHistory = () => {
  const [donations, setDonations] = useState<Donation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadDonations = () => {
    setLoading(true);
    setLoadError(false);
    api.myDonations()
      .then(setDonations)
      .catch((err) => {
        console.error("Failed to load donation history:", err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDonations();
  }, []);

  return (
    <div className="mt-page max-w-3xl">
      <Seo title="Donation History" description="Your MangoTyping donation history." path="/donations" noindex />
      <BackButton to="/home" label="Back to practice" />
      <header className="mt-page-header"><span className="mt-eyebrow">Your support</span><h1 className="mt-page-title">Donation history</h1><p className="mt-page-description">A record of your contributions to keeping MangoTyping free.</p></header>

      {loading ? (
        <p className="text-black/40 text-sm">Loading donation history…</p>
      ) : loadError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[var(--error)] text-sm">Couldn't load your donation history. Your records haven't been changed.</p>
          <button onClick={loadDonations} className="px-4 py-2 rounded-xl card text-sm font-semibold">Retry</button>
        </div>
      ) : !donations || donations.length === 0 ? (
        <p className="text-black/40 text-sm">No donations yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {donations.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card flex items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="font-semibold">₹{d.amountRupees}</p>
                <p className="text-black/40 text-xs">
                  {new Date(d.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--accent)", color: "#000" }}>
                Paid
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
