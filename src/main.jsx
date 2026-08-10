import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary";
import { DesktopAuthProvider } from "./auth/DesktopAuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <DesktopAuthProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </DesktopAuthProvider>
  </StrictMode>,
);
