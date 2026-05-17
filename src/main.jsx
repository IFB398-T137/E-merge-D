import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

import { msalConfig } from "./authConfig";

import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary";

const msalInstance = new PublicClientApplication(msalConfig);

async function startApp() {
  try {
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise();
  } catch (err) {
    // don't block the app render for MSAL/browser auth errors; log for debugging
    // BrowserAuthError like `no_token_request_cache_error` can happen when
    // no token is present in cache — handle downstream where tokens are needed.
    // We catch it here so the UI can mount and show a clear error or sign-in CTA.
    // eslint-disable-next-line no-console
    console.warn("MSAL init/redirect error (proceeding to render):", err);
  }

  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MsalProvider>
    </StrictMode>
  );
}

startApp();