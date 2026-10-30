import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiArrowLeft } from "react-icons/fi";

export const BackButton = ({ to, label = "Back", onClick }: { to?: string; label?: string; onClick?: () => void }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      whileHover={{ x: -2 }}
      onClick={() => (onClick ? onClick() : to ? navigate(to) : navigate(-1))}
      className="self-start inline-flex min-h-9 items-center gap-2 px-1 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] mb-1"
    >
      <FiArrowLeft size={15} aria-hidden="true" /> {label}
    </motion.button>
  );
};
