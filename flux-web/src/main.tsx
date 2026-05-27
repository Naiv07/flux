import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("[Flux] Service Worker registered"))
      .catch((err) => console.log("[Flux] SW registration failed:", err));

    // Auto-reload when a new SW takes control — picks up fresh HTML + JS bundle
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);