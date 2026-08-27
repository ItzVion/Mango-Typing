import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Boxed one-digit-per-cell OTP input, built to match our own design system
// (dark/light aware via CSS vars, orange accent) rather than a copy-pasted
// shadcn/base-ui block — same idea (input-otp), our own styling and no new
// dependency.
export const OtpInput = ({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[Math.min(value.length, length - 1)]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDigit = (index: number, digit: string) => {
    const clean = digit.replace(/\D/g, "").slice(-1);
    const chars = value.split("");
    chars[index] = clean;
    const next = chars.join("").slice(0, length);
    onChange(next);
    if (clean && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <motion.input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          maxLength={1}
          animate={value[i] ? { scale: [1.15, 1] } : {}}
          transition={{ duration: 0.15 }}
          className="w-11 h-14 text-center text-2xl font-bold rounded-xl border outline-none bg-transparent"
          style={{
            borderColor: value[i] ? "#F5A623" : "var(--card-border)",
            color: "var(--text-primary)",
          }}
        />
      ))}
    </div>
  );
};
