import { Link } from "react-router-dom";

export const Footer = () => (
  <footer className="mt-16 mb-6 px-6 text-center text-xs text-black/40 flex flex-col items-center gap-2">
    <a href="mailto:vctyping.11@gmail.com" className="hover:text-black/70">
      vctyping.11@gmail.com
    </a>
    <div className="flex gap-4">
      <Link to="/privacy" className="hover:text-black/70">Privacy Policy</Link>
      <Link to="/refund" className="hover:text-black/70">Refund Policy</Link>
      <Link to="/terms" className="hover:text-black/70">Terms of Service</Link>
    </div>
    <span>© {new Date().getFullYear()} VC Typing</span>
  </footer>
);
