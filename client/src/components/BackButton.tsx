import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export const BackButton = ({ to, label = "Back", onClick }: { to?: string; label?: string; onClick?: () => void }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      whileHover={{ x: -2 }}
      onClick={() => (onClick ? onClick() : to ? navigate(to) : navigate(-1))}
      className="self-start inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--card-border)] px-3.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] mb-1"
    >
      <span aria-hidden>←</span> {label}
    </motion.button>
  );
};
