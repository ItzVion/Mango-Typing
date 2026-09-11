import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// MangoTyping is intentionally dark-mode only. No theme preference or toggle
// is read from the browser; the dark class is always applied at startup.
document.documentElement.classList.add("dark");
document.documentElement.style.colorScheme = "dark";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
