import { motion, useScroll, useSpring } from "framer-motion";

export function AnimationLayer() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress,{stiffness:180,damping:32,mass:.35});
  return <motion.div className="mt-scroll-progress" style={{scaleX:smoothProgress}} aria-hidden="true"/>;
};
