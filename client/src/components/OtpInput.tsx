import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

// Polished six-digit OTP control. The styling intentionally stays inside the
// component so every auth flow gets the same focused, dark-first treatment.
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
    <div className="flex justify-center gap-2.5 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => {
        const filled = Boolean(value[i]);
        return (
          <motion.input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={value[i] ?? ""}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.currentTarget.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            animate={filled ? { scale: [1.08, 1] } : { scale: 1 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="h-14 w-11 sm:h-16 sm:w-12 rounded-2xl border bg-white/[0.035] text-center text-2xl sm:text-[27px] font-bold tracking-normal outline-none transition-all duration-200 placeholder:text-white/10 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#F5A623]/20"
            style={{
              borderColor: filled ? "rgba(245,166,35,.75)" : "var(--card-border)",
              color: "var(--text-primary)",
              boxShadow: filled ? "0 0 0 1px rgba(245,166,35,.08), 0 8px 24px rgba(245,166,35,.08)" : "none",
            }}
            aria-label={`Verification digit ${i + 1}`}
          />
        );
      })}
    </div>
  );
};
