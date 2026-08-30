import { useEffect, useRef, useState } from "react";

/**
 * Counts up from its previous value to `value` whenever it changes.
 * Same effect family as motion-primitives' AnimatedNumber — built directly
 * on requestAnimationFrame so no extra dependency is needed here.
 */
export const AnimatedNumber = ({
  value,
  duration = 700,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) => {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number.isFinite(value) ? value : 0;
    const start = performance.now();

    let frame: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic — quick start, gentle settle, no bounce/overshoot
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
};
