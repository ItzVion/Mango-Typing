import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useLocation } from "react-router-dom";

const PARTICLES = Array.from({ length: 22 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  top: `${(index * 61 + 7) % 100}%`,
  delay: `${(index % 8) * 0.55}s`,
  duration: `${6 + (index % 5) * 1.3}s`,
  size: `${2 + (index % 3)}px`,
}));

export function AnimationLayer() {
  const location = useLocation();
  const animationRootRef = useRef<HTMLDivElement | null>(null);
  const cursorX = useSpring(0, { stiffness: 260, damping: 28, mass: 0.35 });
  const cursorY = useSpring(0, { stiffness: 260, damping: 28, mass: 0.35 });
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 180, damping: 32, mass: 0.35 });
  const particles = useMemo(() => PARTICLES, []);

  useEffect(() => {
    const root = animationRootRef.current;
    const appRoot = document.getElementById("root");
    if (!root || !appRoot) return;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      cursorX.set(event.clientX);
      cursorY.set(event.clientY);
      document.documentElement.style.setProperty("--mt-pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--mt-pointer-y", `${event.clientY}px`);

      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnetic], button, a");
      if (target && !target.closest("input, textarea, .type-box")) {
        const rect = target.getBoundingClientRect();
        const distanceX = event.clientX - (rect.left + rect.width / 2);
        const distanceY = event.clientY - (rect.top + rect.height / 2);
        const strength = target.hasAttribute("data-magnetic") ? 0.16 : 0.035;
        target.style.setProperty("--mt-mx", `${Math.max(-12, Math.min(12, distanceX * strength))}px`);
        target.style.setProperty("--mt-my", `${Math.max(-8, Math.min(8, distanceY * strength))}px`);
      }
    };

    const resetMagnetic = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-magnetic], button, a");
      if (target) {
        target.style.setProperty("--mt-mx", "0px");
        target.style.setProperty("--mt-my", "0px");
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("button, a, [role='button']");
      if (!target || target.closest("input, textarea, .type-box")) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "mt-click-ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      target.classList.add("mt-ripple-host");
      target.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    };

    const reveal = (element: Element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.closest(".type-box, textarea, input, button, a")) return;
      element.classList.add("mt-reveal");
    };

    const mark = () => {
      appRoot.querySelectorAll<HTMLElement>("section, article, .card, [class*='rounded-2xl'], [class*='rounded-3xl']").forEach(reveal);
      appRoot.querySelectorAll<HTMLElement>(".grid > *, .space-y-4 > *, .space-y-6 > *").forEach((element, index) => {
        if (!element.closest(".type-box, textarea, input, button, a")) {
          element.classList.add("mt-reveal");
          element.style.setProperty("--mt-reveal-delay", `${Math.min(index, 8) * 45}ms`);
        }
      });
      appRoot.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((element) => element.classList.add("mt-magnetic"));
      appRoot.querySelectorAll<HTMLElement>("button:not(.type-box button), a:not(.type-box a)").forEach((element) => element.classList.add("mt-motion-control"));
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("mt-reveal-visible");
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });

    const observeAll = () => {
      mark();
      appRoot.querySelectorAll<HTMLElement>(".mt-reveal").forEach((element) => observer.observe(element));
    };

    observeAll();
    const mutation = new MutationObserver(() => observeAll());
    mutation.observe(appRoot, { childList: true, subtree: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", resetMagnetic, { passive: true });
    window.addEventListener("click", onClick, { passive: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", resetMagnetic);
      window.removeEventListener("click", onClick);
    };
  }, [cursorX, cursorY]);

  return (
    <>
      <motion.div className="mt-scroll-progress" style={{ scaleX: smoothProgress }} />
      <div ref={animationRootRef} className="mt-ambient" aria-hidden="true">
        <div className="mt-orb mt-orb-one" />
        <div className="mt-orb mt-orb-two" />
        <div className="mt-grid-glow" />
        {particles.map((particle, index) => (
          <span
            key={index}
            className="mt-particle"
            style={{ left: particle.left, top: particle.top, animationDelay: particle.delay, animationDuration: particle.duration, width: particle.size, height: particle.size }}
          />
        ))}
      </div>
      <motion.div className="mt-cursor-glow" style={{ x: cursorX, y: cursorY }} />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="mt-route-wipe"
          initial={{ scaleX: 1, transformOrigin: "left" }}
          animate={{ scaleX: 0, transformOrigin: "right" }}
          exit={{ scaleX: 1, transformOrigin: "left" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
    </>
  );
}
