import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export const Footer = () => {
  const [supportEmail, setSupportEmail] = useState("support@mangotyping.fun");

  useEffect(() => {
    api.publicSettings().then((s) => {
      if (s.supportEmail) setSupportEmail(s.supportEmail);
    }).catch(() => {});
  }, []);

  return (
    <footer className="mt-16 mb-6 flex flex-col items-center gap-3 px-4 pb-4 text-center text-xs text-[var(--text-muted)]">
      <a href={`mailto:${supportEmail}`} className="inline-flex min-h-11 items-center justify-center px-2 underline-offset-4 hover:underline">
        {supportEmail}
      </a>
      <nav aria-label="Legal and project information" className="flex max-w-3xl flex-wrap justify-center gap-x-4 gap-y-1.5">
        <Link to="/about" className="inline-flex min-h-11 items-center px-1 hover:underline">About Us</Link>
        <Link to="/third-party-notice" className="inline-flex min-h-11 items-center px-1 hover:underline">Third-party Notice</Link>
        <Link to="/privacy" className="inline-flex min-h-11 items-center px-1 hover:underline">Privacy Policy</Link>
        <Link to="/refund" className="inline-flex min-h-11 items-center px-1 hover:underline">Refund Policy</Link>
        <Link to="/terms" className="inline-flex min-h-11 items-center px-1 hover:underline">Terms &amp; Conditions</Link>
      </nav>
      <span>© {new Date().getFullYear()} MangoTyping</span>
    </footer>
  );
};
