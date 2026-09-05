import { type FC } from "react";
import { motion } from "framer-motion";
import { IoMoon, IoMoonOutline, IoSunny, IoSunnyOutline } from "react-icons/io5";
import { useThemeStore } from "../stores/themeStore";

// Adapted from a pasted component: ported off next-themes onto this
// project's own useThemeStore (zustand + a `.dark` class on <html>, no
// Next.js here), and off `motion/react` onto the `framer-motion` already
// in use everywhere else in the app. Colors default to the project's own
// card/border tokens instead of the original's standalone palette, so it
// matches the rest of the navbar instead of introducing a new look.
interface SwitchModeProps {
  width?: number;
  height?: number;
  darkColor?: string;
  lightColor?: string;
  knobDarkColor?: string;
  knobLightColor?: string;
  borderDarkColor?: string;
  borderLightColor?: string;
}

export const SwitchMode: FC<SwitchModeProps> = ({
  width = 56,
  height = 28,
  darkColor = "#161616",
  lightColor = "#f7f7f7",
  knobDarkColor = "#262626",
  knobLightColor = "#e2e2e2",
  borderDarkColor = "#262626",
  borderLightColor = "#e2e2e2",
}) => {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === "dark";
  const iconSize = height * 0.45;

  return (
    <motion.button
      onClick={toggle}
      aria-label="Toggle theme"
      whileTap={{ scale: 0.92 }}
      className="relative flex items-center rounded-full border-2 transition-colors shrink-0"
      style={{ width, height, borderColor: isDark ? borderDarkColor : borderLightColor }}
    >
      {/* TRACK */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ backgroundColor: isDark ? darkColor : lightColor }}
        transition={{ duration: 0.3 }}
      />

      {/* SLIDING KNOB */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="absolute rounded-full border-2 z-10"
        style={{
          width: height - 4,
          height: height - 4,
          right: isDark ? 1 : undefined,
          left: isDark ? undefined : 1,
          backgroundColor: isDark ? knobDarkColor : knobLightColor,
          borderColor: isDark ? borderDarkColor : borderLightColor,
        }}
      />

      {/* SUN */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: height, height }}>
        {isDark ? (
          <IoSunnyOutline style={{ width: iconSize, height: iconSize, color: "#6b6b6b" }} />
        ) : (
          <IoSunny style={{ width: iconSize, height: iconSize, color: "#F5A623" }} />
        )}
      </div>

      {/* MOON */}
      <div className="relative z-10 flex items-center justify-center ml-auto" style={{ width: height, height }}>
        {isDark ? (
          <IoMoon style={{ width: iconSize, height: iconSize, color: "#F5A623" }} />
        ) : (
          <IoMoonOutline style={{ width: iconSize, height: iconSize, color: "#9a9a9a" }} />
        )}
      </div>
    </motion.button>
  );
};
