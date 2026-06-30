import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Disable the default browser context menu to make it feel like a native app
document.addEventListener("contextmenu", (e) => {
  // Allow context menu only if we're debugging or specifically want it later
  // For now, block it everywhere to prevent the "Reload/Stop" popup.
  e.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
