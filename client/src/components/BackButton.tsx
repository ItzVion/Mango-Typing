import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export const BackButton = ({ to, label = "Back", onClick }: { to?: string; label?: string; onClick?: () => void }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      whileHover={{ x: -2 }}
      onClick={() => (onClick ? onClick() : to ? navigate(to) : navigate(-1))}
      className="self-start flex items-center gap-1 text-sm font-semibold text-black/50 hover:text-black dark:hover:text-white mb-2"
    >
      <span aria-hidden>←</span> {label}
    </motion.button>
  );
};
