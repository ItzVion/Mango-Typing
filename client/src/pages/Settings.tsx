import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { BackButton } from "../components/BackButton";
import { Seo } from "../components/Seo";

const inputClass =
  "bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-2 w-full outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors text-sm";

function Message({ text, kind }: { text: string; kind: "error" | "success" }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="text-sm"
      style={{ color: kind === "error" ? "var(--error)" : "var(--accent)" }}
    >
      {text}
    </motion.p>
  );
}

// ---- Username section -------------------------------------------------------
function UsernameSection() {
  const { user, setUser } = useAuthStore();
  const [newUsername, setNewUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "error" | "success" } | null>(null);

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await api.changeUsername(newUsername.trim(), password);
      setUser(user ? { ...user, username: res.username } : user);
      setMsg({ text: "Username updated.", kind: "success" });
      setNewUsername("");
      setPassword("");
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 flex flex-col gap-3">
      <h2 className="font-bold">Change Username</h2>
      <p className="text-black/40 text-xs">Currently: {user?.username}</p>
      <input className={inputClass} placeholder="New username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
      <input className={inputClass} type="password" placeholder="Current password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <AnimatePresence>{msg && <Message key={msg.text} {...msg} />}</AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        disabled={loading || !newUsername || !password}
        onClick={submit}
        className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold text-sm disabled:opacity-40 self-start px-5"
      >
        {loading ? "Saving…" : "Save"}
      </motion.button>
    </motion.div>
  );
}

// ---- Password section --------------------------------------------------------
function PasswordSection() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "error" | "success" } | null>(null);

  const submit = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword, confirm);
      setMsg({ text: "Password updated.", kind: "success" });
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6 flex flex-col gap-3">
      <h2 className="font-bold">Change Password</h2>
      <input className={inputClass} type="password" placeholder="Current password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
      <input className={inputClass} type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      <input className={inputClass} type="password" placeholder="Retype new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <AnimatePresence>{msg && <Message key={msg.text} {...msg} />}</AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        disabled={loading || !oldPassword || !newPassword || !confirm}
        onClick={submit}
        className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold text-sm disabled:opacity-40 self-start px-5"
      >
        {loading ? "Saving…" : "Save"}
      </motion.button>
    </motion.div>
  );
}

// ---- Email section: password -> OTP to old email -> OTP to new email --------
type EmailStep = "idle" | "password" | "otp-old" | "otp-new";

function EmailSection() {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState<EmailStep>("idle");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "error" | "success" } | null>(null);

  const resetFlow = () => {
    setStep("idle");
    setPassword("");
    setNewEmail("");
    setCode("");
  };

  const sendToOld = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await api.requestEmailChange(password);
      setMsg({ text: `Code sent to ${user?.email}.`, kind: "success" });
      setStep("otp-old");
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  const verifyOldAndSendNew = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await api.verifyEmailChangeOld(code, newEmail.trim());
      setMsg({ text: `Code sent to ${newEmail.trim()}.`, kind: "success" });
      setCode("");
      setStep("otp-new");
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  const verifyNew = async () => {
    setMsg(null);
    setLoading(true);
    try {
      const res = await api.verifyEmailChangeNew(code);
      setUser(user ? { ...user, email: res.email } : user);
      setMsg({ text: "Email updated.", kind: "success" });
      resetFlow();
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 flex flex-col gap-3">
      <h2 className="font-bold">Change Email</h2>
      <p className="text-black/40 text-xs">Currently: {user?.email}</p>

      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep("password")}
              className="rounded-xl py-2 px-5 font-semibold text-sm border border-[var(--card-border)]"
            >
              Change Email
            </motion.button>
          </motion.div>
        )}

        {step === "password" && (
          <motion.div key="password" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3">
            <input className={inputClass} type="password" placeholder="Current password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={loading || !password}
                onClick={sendToOld}
                className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold text-sm disabled:opacity-40 px-5"
              >
                {loading ? "Sending…" : "Send code to current email"}
              </motion.button>
              <button onClick={resetFlow} className="text-black/40 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}

        {step === "otp-old" && (
          <motion.div key="otp-old" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3">
            <input className={inputClass} inputMode="numeric" placeholder="6-digit code (sent to current email)" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <input className={inputClass} type="email" placeholder="New email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={loading || code.length !== 6 || !newEmail}
                onClick={verifyOldAndSendNew}
                className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold text-sm disabled:opacity-40 px-5"
              >
                {loading ? "Verifying…" : "Verify & Continue"}
              </motion.button>
              <button onClick={resetFlow} className="text-black/40 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}

        {step === "otp-new" && (
          <motion.div key="otp-new" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3">
            <input className={inputClass} inputMode="numeric" placeholder="6-digit code (sent to new email)" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={loading || code.length !== 6}
                onClick={verifyNew}
                className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2 font-semibold text-sm disabled:opacity-40 px-5"
              >
                {loading ? "Verifying…" : "Confirm New Email"}
              </motion.button>
              <button onClick={resetFlow} className="text-black/40 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{msg && <Message key={msg.text} {...msg} />}</AnimatePresence>
    </motion.div>
  );
}

// ---- Delete account: password -> OTP -> permanent delete ---------------------
type DeleteStep = "idle" | "password" | "otp";

function DeleteSection() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<DeleteStep>("idle");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "error" | "success" } | null>(null);

  const resetFlow = () => {
    setStep("idle");
    setPassword("");
    setCode("");
  };

  const sendCode = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await api.requestAccountDeletion(password);
      setMsg({ text: "Confirmation code sent to your email.", kind: "success" });
      setStep("otp");
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    setMsg(null);
    setLoading(true);
    try {
      await api.confirmAccountDeletion(code);
      logout();
      navigate("/");
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="card p-6 flex flex-col gap-3 border"
      style={{ borderColor: "var(--error)" }}
    >
      <h2 className="font-bold" style={{ color: "var(--error)" }}>Delete Account</h2>
      <p className="text-black/40 text-xs">
        This permanently deletes your account, typing history, and donation records. This cannot be undone.
      </p>

      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep("password")}
              className="rounded-xl py-2 px-5 font-semibold text-sm text-white"
              style={{ backgroundColor: "var(--error)" }}
            >
              Delete My Account
            </motion.button>
          </motion.div>
        )}

        {step === "password" && (
          <motion.div key="password" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3">
            <input className={inputClass} type="password" placeholder="Current password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={loading || !password}
                onClick={sendCode}
                className="rounded-xl py-2 px-5 font-semibold text-sm text-white disabled:opacity-40"
                style={{ backgroundColor: "var(--error)" }}
              >
                {loading ? "Sending…" : "Send confirmation code"}
              </motion.button>
              <button onClick={resetFlow} className="text-black/40 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="flex flex-col gap-3">
            <input className={inputClass} inputMode="numeric" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={loading || code.length !== 6}
                onClick={confirmDelete}
                className="rounded-xl py-2 px-5 font-semibold text-sm text-white disabled:opacity-40"
                style={{ backgroundColor: "var(--error)" }}
              >
                {loading ? "Deleting…" : "Permanently Delete"}
              </motion.button>
              <button onClick={resetFlow} className="text-black/40 text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{msg && <Message key={msg.text} {...msg} />}</AnimatePresence>
    </motion.div>
  );
}

// ---- Avatar section ---------------------------------------------------------
function resizeToSquareJpeg(file: File, size = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported."));
      // Center-crop to a square, then scale down — avoids stretching non-square photos.
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Failed to process image."))), "image/jpeg", 0.85);
    };
    img.onerror = () => reject(new Error("Couldn't read that image."));
    img.src = url;
  });
}

function AvatarSection() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "error" | "success" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMsg(null);
    setLoading(true);
    try {
      const resized = await resizeToSquareJpeg(file);
      const { avatarUrl } = await api.uploadAvatar(resized);
      setUser(user ? { ...user, avatarUrl } : user);
      setMsg({ text: "Avatar updated.", kind: "success" });
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await api.removeAvatar();
      setUser(user ? { ...user, avatarUrl: null } : user);
      setMsg({ text: "Avatar removed.", kind: "success" });
    } catch (e: any) {
      setMsg({ text: e.message, kind: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 flex flex-col gap-3">
      <h2 className="font-semibold">Profile picture</h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden border border-[var(--card-border)] flex items-center justify-center bg-black/5 dark:bg-white/5 shrink-0">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-black/30 dark:text-white/30">
              {user?.username?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl px-4 py-2 text-sm font-semibold border border-[var(--card-border)] disabled:opacity-50"
          >
            {loading ? "Uploading…" : "Upload"}
          </motion.button>
          {user?.avatarUrl && (
            <button
              disabled={loading}
              onClick={remove}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-black/40 dark:text-white/40 disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <AnimatePresence mode="wait">{msg && <Message key={msg.text} text={msg.text} kind={msg.kind} />}</AnimatePresence>
    </motion.div>
  );
}

export const Settings = () => {
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <Seo title="Settings" description="Manage your VC Typing account settings." path="/settings" noindex />
      <BackButton to="/home" label="Back" />
      <h1 className="text-2xl font-bold">Settings</h1>
      <AvatarSection />
      <UsernameSection />
      <PasswordSection />
      <EmailSection />
      <DeleteSection />
    </div>
  );
};
