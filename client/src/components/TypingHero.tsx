import { motion, useReducedMotion } from "framer-motion";

export const TypingHero = () => {
  const reduceMotion = useReducedMotion();

  const lineInitial = reduceMotion ? false : { opacity: 0, y: 16 };
  const lineTransition = (delay: number) => ({
    duration: reduceMotion ? 0 : 0.46,
    delay: reduceMotion ? 0 : delay,
    ease: "easeOut" as const,
  });

  return (
    <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
      <motion.span
        className="block"
        initial={lineInitial}
        animate={{ opacity: 1, y: 0 }}
        transition={lineTransition(0.04)}
      >
        Test your speed.
      </motion.span>
      <motion.span
        className="mt-2 block"
        initial={lineInitial}
        animate={{ opacity: 1, y: 0 }}
        transition={lineTransition(0.16)}
      >
        Train your{" "}
        <motion.span
          className="inline-block text-[#f5a623]"
          whileHover={reduceMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.14 }}
        >
          accuracy.
        </motion.span>
      </motion.span>
    </h1>
  );
};
