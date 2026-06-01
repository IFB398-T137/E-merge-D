import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";

import { msalConfig } from "./authConfig";

import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary";

const msalInstance = new PublicClientApplication(msalConfig);
const redirectTokenKey = "emerged.microsoftRedirectToken";

async function startApp() {
  try {
    await msalInstance.initialize();
    const redirectResult = await msalInstance.handleRedirectPromise();

    if (redirectResult?.account) {
      msalInstance.setActiveAccount(redirectResult.account);

      if (redirectResult.accessToken) {
        sessionStorage.setItem(
          redirectTokenKey,
          JSON.stringify({
            accessToken: redirectResult.accessToken,
            expiresOn: redirectResult.expiresOn?.toISOString() || null,
            scopes: redirectResult.scopes || [],
          }),
        );
      }
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        msalInstance.setActiveAccount(accounts[0]);
      }
    }
  } catch (err) {
    // don't block the app render for MSAL/browser auth errors; log for debugging
    // BrowserAuthError like `no_token_request_cache_error` can happen when
    // no token is present in cache - handle downstream where tokens are needed.
    // We catch it here so the UI can mount and show a clear error or sign-in CTA.
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
