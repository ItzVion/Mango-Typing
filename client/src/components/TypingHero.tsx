import { motion, useReducedMotion } from "framer-motion";

function TypeOnText({
  text,
  startDelay = 0,
  className = "",
  reduceMotion,
  keyPrefix,
}: {
  text: string;
  startDelay?: number;
  className?: string;
  reduceMotion: boolean;
  keyPrefix: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      {Array.from(text).map((character, index) =>
        character === " " ? (
          <span key={`${keyPrefix}-space-${index}`} style={{ whiteSpace: "pre" }}> </span>
        ) : (
          <motion.span
            key={`${keyPrefix}-char-${index}`}
            className="inline-block"
            initial={reduceMotion ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.16,
              delay: reduceMotion ? 0 : startDelay + index * 0.024,
              ease: "easeOut",
            }}
          >
            {character}
          </motion.span>
        ),
      )}
    </span>
  );
}

export const TypingHero = () => {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <h1
      aria-label="Test your speed. Train your accuracy."
      className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
    >
      <span className="block">
        <TypeOnText
          text="Test your speed."
          startDelay={0.04}
          reduceMotion={reduceMotion}
          keyPrefix="speed"
        />
      </span>
      <span className="mt-2 block">
        <TypeOnText
          text="Train your "
          startDelay={0.48}
          reduceMotion={reduceMotion}
          keyPrefix="train"
        />
        <span className="inline-block text-[#f5a623]">
          <TypeOnText
            text="accuracy."
            startDelay={0.73}
            reduceMotion={reduceMotion}
            keyPrefix="accuracy"
          />
        </span>
        {!reduceMotion && (
          <motion.span
            aria-hidden="true"
            className="mt-type-caret ml-1 inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1] }}
            transition={{ duration: 1.05, times: [0, 0.82, 1], delay: 0.98 }}
          />
        )}
      </span>
    </h1>
  );
};
