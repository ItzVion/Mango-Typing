import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api, OWNER_EMAIL } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { BackButton } from "../components/BackButton";

type Tab = "payments" | "editor" | "users" | "donations";
type LegalSlug = "privacy" | "refund" | "terms";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  hasDonated: boolean;
  createdAt: string;
  googleId: string | null;
};

type AdminDonation = {
  id: string;
  amountRupees: number;
  status: string;
  createdAt: string;
  username: string;
  email: string | null;
  anonymous: boolean;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "payments", label: "Payments" },
  { key: "editor", label: "Editor" },
  { key: "users", label: "Users" },
  { key: "donations", label: "Donations" },
];

export const AdminPanel = () => {
  const user = useAuthStore((s) => s.user);
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [tab, setTab] = useState<Tab>("payments");

  useEffect(() => {
    if (!user) return;
    if (user.email !== OWNER_EMAIL) {
      setLoaded(true);
      return;
    }
    api
      .ownerSettings()
      .then(() => setAllowed(true))
      .catch(() => setAllowed(false))
      .finally(() => setLoaded(true));
  }, [user]);

  if (!user) return <Navigate to="/auth" replace />;
  if (loaded && (!allowed || user.email !== OWNER_EMAIL)) return <Navigate to="/" replace />;
  if (!loaded) return <p className="text-black/40 text-center mt-16">Loading…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <BackButton to="/" label="Back" />
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <motion.button
            key={t.key}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold ${
              tab === t.key ? "bg-black text-white dark:bg-white dark:text-black" : "card"
            }`}
          >
            {t.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === "payments" && <PaymentsTab />}
          {tab === "editor" && <EditorTab />}
          {tab === "users" && <UsersTab />}
          {tab === "donations" && <DonationsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Payments ────────────────────────────────────────────────────────────
const PaymentsTab = () => {
  const [form, setForm] = useState({ razorpayKeyId: "", razorpayKeySecret: "", donationMessage: "", maintenanceMode: false, supportEmail: "" });
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.ownerSettings().then((s) => {
      setForm({
        razorpayKeyId: s.razorpayKeyId ?? "",
        razorpayKeySecret: s.razorpayKeySecret ?? "",
        donationMessage: s.donationMessage ?? "",
        maintenanceMode: s.maintenanceMode ?? false,
        supportEmail: s.supportEmail ?? "",
      });
      setReady(true);
    });
  }, []);

  const save = async () => {
    setStatus("Saving…");
    try {
      await api.updateSettings(form);
      setStatus("Saved.");
    } catch (e: any) {
      setStatus(e.message || "Failed to save");
    }
  };

  if (!ready) return <p className="text-black/40 text-sm">Loading…</p>;

  return (
    <div className="flex flex-col gap-5 card p-6">
      <label className="flex flex-col gap-1 text-sm">
        Razorpay Key ID
        <input
          value={form.razorpayKeyId}
          onChange={(e) => setForm({ ...form, razorpayKeyId: e.target.value })}
          className="bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2"
          placeholder="rzp_live_xxxxxxxx"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Razorpay Key Secret
        <input
          type="password"
          value={form.razorpayKeySecret}
          onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })}
          className="bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2"
          placeholder="••••••••••"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Donation Page Message
        <textarea
          value={form.donationMessage}
          onChange={(e) => setForm({ ...form, donationMessage: e.target.value })}
          className="bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2 min-h-24"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Support Email <span className="text-black/40 text-xs">(shown in the footer)</span>
        <input
          value={form.supportEmail}
          onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
          className="bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2"
          placeholder="support@example.com"
        />
      </label>

      <label className="flex items-center justify-between gap-3 text-sm card p-4" style={{ borderColor: form.maintenanceMode ? "var(--error)" : undefined }}>
        <div>
          <div className="font-semibold">Website Down</div>
          <div className="text-black/40 text-xs mt-0.5">
            When on, every visitor sees a "temporarily down" page instead of the site — you'll still be able to reach /admin.
          </div>
        </div>
        <input
          type="checkbox"
          checked={form.maintenanceMode}
          onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
          className="w-5 h-5 shrink-0 accent-[#dc2626]"
        />
      </label>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={save}
        className="px-6 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold"
      >
        Save
      </motion.button>
      {status && <p className="text-black/40 text-sm">{status}</p>}
    </div>
  );
};

// ── Editor (privacy / refund / terms) ──────────────────────────────────
const LEGAL_PAGES: { slug: LegalSlug; label: string }[] = [
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "refund", label: "Refund Policy" },
  { slug: "terms", label: "Terms of Service" },
];

const EditorTab = () => {
  const [slug, setSlug] = useState<LegalSlug>("privacy");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    api.adminLegalPage(slug).then((p) => {
      setContent(p.content);
      setReady(true);
    });
  }, [slug]);

  const save = async () => {
    setStatus("Saving…");
    try {
      await api.adminUpdateLegalPage(slug, content);
      setStatus("Saved.");
    } catch (e: any) {
      setStatus(e.message || "Failed to save");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {LEGAL_PAGES.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSlug(p.slug)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              slug === p.slug ? "bg-black text-white dark:bg-white dark:text-black" : "card"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!ready ? (
        <p className="text-black/40 text-sm">Loading…</p>
      ) : (
        <div className="card p-6 flex flex-col gap-4">
          <p className="text-black/40 text-xs">
            Separate paragraphs with a blank line — each becomes its own paragraph on the live page.
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-3 min-h-80 text-sm leading-relaxed font-mono"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={save}
            className="self-start px-6 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black font-semibold"
          >
            Save
          </motion.button>
          {status && <p className="text-black/40 text-sm">{status}</p>}
        </div>
      )}
    </div>
  );
};

// ── Users ────────────────────────────────────────────────────────────────
const UsersTab = () => {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.adminUsers().then(setUsers);
  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    await api.adminDeleteUser(id);
    setConfirmId(null);
    load();
  };

  const createUser = async () => {
    setError("");
    if (!form.email || !form.username || !form.password) {
      setError("Fill in all fields");
      return;
    }
    try {
      await api.adminCreateUser(form);
      setForm({ email: "", username: "", password: "" });
      setShowAdd(false);
      load();
    } catch (e: any) {
      setError(e.message || "Failed to create user");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowAdd(true)}
        className="self-start px-5 py-2.5 rounded-xl font-bold text-white text-sm"
        style={{ background: "linear-gradient(90deg, #dc2626, #ea580c)" }}
      >
        + Add User Manually
      </motion.button>

      {!users ? (
        <p className="text-black/40 text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  {u.username} {u.hasDonated && <span>⭐</span>}
                </p>
                <p className="text-black/40 text-xs truncate">{u.email}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setConfirmId(u.id)}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 text-lg"
                title="Delete user"
              >
                🗑️
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-6 max-w-xs w-full text-center"
            >
              <p className="font-semibold mb-1">Delete this user?</p>
              <p className="text-black/40 text-xs mb-5">This can't be undone.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => remove(confirmId)}
                  className="px-5 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="px-5 py-2 rounded-xl card font-semibold text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add user manually */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="card p-7 max-w-md w-full"
            >
              <h2 className="text-xl font-extrabold">ADD USER MANUALLY</h2>
              <p className="text-black/40 text-sm mt-1 mb-5">
                Creates an account directly — no OTP required. Useful for giving staff access.
              </p>

              <label className="text-xs font-semibold text-black/50 tracking-wide">EMAIL</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full mt-1 mb-4 bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2.5"
              />

              <label className="text-xs font-semibold text-black/50 tracking-wide">USERNAME</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full mt-1 mb-4 bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2.5"
              />

              <label className="text-xs font-semibold text-black/50 tracking-wide">PASSWORD</label>
              <div className="relative mt-1 mb-5">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2.5 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 text-sm"
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>

              {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={createUser}
                className="w-full py-3 rounded-2xl font-bold text-white"
                style={{ background: "linear-gradient(90deg, #dc2626, #ea580c)" }}
              >
                CREATE USER
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Donations ────────────────────────────────────────────────────────────
const DonationsTab = () => {
  const [donations, setDonations] = useState<AdminDonation[] | null>(null);

  useEffect(() => {
    api.adminDonations().then(setDonations);
  }, []);

  if (!donations) return <p className="text-black/40 text-sm">Loading…</p>;
  if (donations.length === 0) return <p className="text-black/40 text-sm">No donations yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {donations.map((d) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="font-semibold text-sm">
              {d.anonymous ? "Anonymous" : d.username}
              {!d.anonymous && " "}
              {!d.anonymous && <span>⭐</span>}
            </p>
            <p className="text-black/40 text-xs">{new Date(d.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold">₹{d.amountRupees}</p>
            <p
              className={`text-xs font-semibold ${
                d.status === "paid" ? "text-green-500" : d.status === "failed" ? "text-red-500" : "text-black/40"
              }`}
            >
              {d.status}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
