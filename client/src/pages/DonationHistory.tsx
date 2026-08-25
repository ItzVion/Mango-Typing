import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { BackButton } from "../components/BackButton";

type Donation = { id: string; amountRupees: number; status: string; createdAt: string };

export const DonationHistory = () => {
  const [donations, setDonations] = useState<Donation[] | null>(null);

  useEffect(() => {
    api.myDonations().then(setDonations).catch(() => setDonations([]));
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <BackButton to="/" label="Back" />
      <h1 className="text-2xl font-bold">Donation History</h1>

      {donations === null ? (
        <p className="text-black/40 text-sm">Loading…</p>
      ) : donations.length === 0 ? (
        <p className="text-black/40 text-sm">No donations yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {donations.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4 flex items-center justify-between"
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
