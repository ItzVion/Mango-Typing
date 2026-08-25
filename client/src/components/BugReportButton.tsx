import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const MAX_FILES = 5;
const MAX_SIZE = 1 * 1024 * 1024; // 1MB

function getToken() {
  return localStorage.getItem("vc_token");
}

type Status = "idle" | "submitting" | "success" | "error";

export const BugReportButton = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setDescription("");
    setFiles([]);
    setFileError("");
    setStatus("idle");
    setErrorMsg("");
  };

  const closeModal = () => {
    setOpen(false);
    setTimeout(reset, 300);
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFileError("");
    const incomingArr = Array.from(incoming);
    const combined = [...files, ...incomingArr];

    if (combined.length > MAX_FILES) {
      setFileError(`Max ${MAX_FILES} screenshots.`);
      return;
    }
    const tooBig = incomingArr.find((f) => f.size > MAX_SIZE);
    if (tooBig) {
      setFileError(`"${tooBig.name}" is over 1MB. Each screenshot must be under 1MB.`);
      return;
    }
    const notImage = incomingArr.find((f) => !f.type.startsWith("image/"));
    if (notImage) {
      setFileError(`"${notImage.name}" isn't an image.`);
      return;
    }
    setFiles(combined);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError("");
  };

  const submit = async () => {
    if (description.trim().length < 5) {
      setErrorMsg("Please describe the bug in a bit more detail.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");
    try {
      const form = new FormData();
      form.append("description", description.trim());
      form.append("page", location.pathname);
      files.forEach((f) => form.append("screenshots", f));

      const token = getToken();
      const res = await fetch(`${window.location.origin}/api/bugreport`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send report.");

      setStatus("success");
      setTimeout(closeModal, 1800);
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong. Try again.");
      setStatus("error");
    }
  };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0, rotate: -30 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.6 }}
        whileHover={{ scale: 1.12, rotate: -8, boxShadow: "0 8px 28px rgba(245,166,35,0.35)" }}
        whileTap={{ scale: 0.88, rotate: 4 }}
        onClick={() => setOpen(true)}
        aria-label="Report a bug"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-xl accent-bg shadow-lg"
      >
        <motion.span
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          🐞
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 24 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="card w-full max-w-md p-6 flex flex-col gap-4 relative overflow-hidden"
            >
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.85 }}
                onClick={closeModal}
                className="absolute right-4 top-4 text-black/40 dark:text-white/40 text-lg"
                aria-label="Close"
              >
                ✕
              </motion.button>

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 py-8"
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 14 }}
                      className="text-5xl"
                    >
                      ✅
                    </motion.span>
                    <p className="font-semibold text-lg">Thanks! Report sent.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                  >
                    <motion.h2
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl font-bold"
                    >
                      Report a Bug
                    </motion.h2>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What went wrong? What did you do right before it happened?"
                      rows={4}
                      className="bg-transparent border border-[var(--card-border)] rounded-xl px-4 py-3 w-full outline-none focus:border-black/40 dark:focus:border-white/40 transition-colors resize-none text-sm"
                    />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-black/40 dark:text-white/40">
                          Screenshots (optional, up to {MAX_FILES}, 1MB each)
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          disabled={files.length >= MAX_FILES}
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--card-border)] disabled:opacity-40"
                        >
                          + Add
                        </motion.button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={(e) => {
                            handleFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </div>

                      <AnimatePresence>
                        {files.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-wrap gap-2"
                          >
                            {files.map((f, i) => (
                              <motion.div
                                key={f.name + i}
                                layout
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                                className="relative w-16 h-16 rounded-lg overflow-hidden border border-[var(--card-border)]"
                              >
                                <img
                                  src={URL.createObjectURL(f)}
                                  alt={f.name}
                                  className="w-full h-full object-cover"
                                />
                                <motion.button
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => removeFile(i)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center"
                                >
                                  ✕
                                </motion.button>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence>
                        {fileError && (
                          <motion.p
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: [0, -4, 4, -4, 4, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="text-[var(--error)] text-xs"
                          >
                            {fileError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {status === "error" && errorMsg && (
                        <motion.p
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: [0, -4, 4, -4, 4, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="text-[var(--error)] text-sm"
                        >
                          {errorMsg}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={submit}
                      disabled={status === "submitting"}
                      className="bg-black text-white dark:bg-white dark:text-black rounded-xl py-2.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {status === "submitting" ? (
                        <>
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                          />
                          Sending…
                        </>
                      ) : (
                        "Send Report"
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
