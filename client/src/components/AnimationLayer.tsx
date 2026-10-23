import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Global visual ambience with a tiny motion footprint:
 * a single scroll-progress spring and two slow CSS-transformed gradients.
 * No pointer polling, DOM-wide mutation observers, per-click nodes, or
 * particle loops are needed for the new design.
 */
export function AnimationLayer() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 32,
    mass: 0.35,
  });

  return (
    <>
      <motion.div className="mt-scroll-progress" style={{ scaleX: smoothProgress }} aria-hidden="true" />
      <div className="mt-ambient" aria-hidden="true">
        <div className="mt-orb mt-orb-one" />
        <div className="mt-orb mt-orb-two" />
      </div>
    </>
  );
}
