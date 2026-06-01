import { useEffect, useRef, useState } from "react";
import "./PreviewPage.css";
import { mergeContent } from "../utils/mergingFunc";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

import { loginRequest } from "../authConfig";
import { createOutlookDraft } from "../utils/outlookDrafts";

const pendingDraftActionKey = "emerged.pendingDraftAction";
const redirectTokenKey = "emerged.microsoftRedirectToken";

function readTokenClaims(accessToken) {
  try {
    const [, payload] = accessToken.split(".");
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const decodedPayload = atob(paddedPayload);

    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

function validateGraphToken(accessToken) {
  if (typeof accessToken !== "string" || !accessToken.trim()) {
    return "Microsoft returned an empty access token.";
  }

  if (accessToken === "[object Object]") {
    return "Microsoft returned an invalid access token value.";
  }

  return null;
}

function summarizeGraphToken(accessToken) {
  const claims = readTokenClaims(accessToken);

  if (!claims) {
    return "Token received but not locally readable.";
  }

  const expiresAt = claims.exp
    ? new Date(claims.exp * 1000).toLocaleString()
    : "unknown";

  return `Token audience: ${claims.aud || "unknown"}; scopes: ${claims.scp || "none"}; tenant: ${claims.tid || "unknown"}; expires: ${expiresAt}.`;
}

async function verifyGraphProfileAccess(accessToken) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Microsoft Graph rejected the access token before draft creation: ${response.status}${errorText ? ` - ${errorText}` : ""}`,
    );
  }
}

// simple row validator used in preview to surface missing email warnings
function validateRow(row) {
  const warnings = [];

  const hasRecipient =
    row && (row.RecipientEmail || row.Email || row.recipientemail || row.email);

  if (!hasRecipient) warnings.push("missing-recipient");

  return warnings;
}

function PreviewPage({ csvData, body, subject = "E-merge-D Test Email", onBack }) {
  const [selectedRow, setSelectedRow] = useState(0);
  const [status, setStatus] = useState("");
  const hasResumedDraftAction = useRef(false);

  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const merged = csvData.map((row) => {
    const content = mergeContent(body, row);
    const to =
      (row && (row.RecipientEmail || row.Email || row.recipientemail || row.email)) || "";

    return {
      to,
      content,
      warnings: validateRow(row),
    };
  });

  async function signIn() {
    await instance.loginRedirect({
      ...loginRequest,
      redirectStartPage: window.location.href,
    });
  }

  function savePendingDraftAction(action) {
    if (!action) return;

    sessionStorage.setItem(pendingDraftActionKey, JSON.stringify(action));
  }

  function readPendingDraftAction() {
    try {
      return JSON.parse(sessionStorage.getItem(pendingDraftActionKey));
    } catch {
      return null;
    }
  }

  function clearPendingDraftAction() {
    sessionStorage.removeItem(pendingDraftActionKey);
  }

  function consumeRedirectAccessToken() {
    try {
      const savedToken = JSON.parse(sessionStorage.getItem(redirectTokenKey));
      sessionStorage.removeItem(redirectTokenKey);

      if (!savedToken?.accessToken) {
        return null;
      }

      const tokenProblem = validateGraphToken(savedToken.accessToken);
      if (tokenProblem) {
        throw new Error(tokenProblem);
      }

      return savedToken.accessToken;
    } catch (error) {
      sessionStorage.removeItem(redirectTokenKey);
      throw error;
    }
  }

  async function requestInteractiveToken(account, pendingAction) {
    setStatus("Microsoft needs permission to create Outlook drafts...");

    savePendingDraftAction(pendingAction);
    await instance.acquireTokenRedirect({
      ...loginRequest,
      account,
      redirectStartPage: window.location.href,
    });

    return null;
  }

  async function getAccessToken({
    forceRefresh = false,
    pendingAction,
    allowInteractive = true,
  } = {}) {
    const redirectAccessToken = consumeRedirectAccessToken();
    if (redirectAccessToken) {
      return redirectAccessToken;
    }

    const account = instance.getActiveAccount() || accounts[0];

    if (!account) {
      await signIn();
      return null;
    }

    try {
      const result = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
        forceRefresh,
      });

      if (!result.accessToken) {
        setStatus("Microsoft returned an empty access token. Requesting mail access again...");
        if (!allowInteractive) {
          throw new Error("Microsoft returned an empty access token after refresh.");
        }
        return requestInteractiveToken(account, pendingAction);
      }

      const tokenProblem = validateGraphToken(result.accessToken);
      if (tokenProblem) {
        setStatus(`${tokenProblem} Requesting mail access again...`);
        if (!allowInteractive) {
          throw new Error(tokenProblem);
        }
        return requestInteractiveToken(account, pendingAction);
      }

      return result.accessToken;
    } catch (error) {
      // msal can throw different error types when a silent token cannot be
      // retrieved. Treat InteractionRequiredAuthError and the specific
      // no_token_request_cache_error the same way: redirect to acquire a token.
      const isNoTokenCacheError = error && error.errorCode === "no_token_request_cache_error";

      if (error instanceof InteractionRequiredAuthError || isNoTokenCacheError) {
        if (!allowInteractive) {
          throw error;
        }
        return requestInteractiveToken(account, pendingAction);
      }

      throw error;
    }
  }

  async function createDraftWithFreshToken(email, accessToken, draftSubject) {
    try {
      await verifyGraphProfileAccess(accessToken);
      await createOutlookDraft(accessToken, {
        to: email.to,
        subject: draftSubject,
        htmlBody: email.content,
      });

      return accessToken;
    } catch (error) {
      if (error.status !== 401) throw error;

      const refreshedToken = await getAccessToken({
        forceRefresh: true,
        allowInteractive: false,
      });
      if (!refreshedToken) return;

      await verifyGraphProfileAccess(refreshedToken);
      await createOutlookDraft(refreshedToken, {
        to: email.to,
        subject: draftSubject,
        htmlBody: email.content,
      });

      return refreshedToken;
    }
  }

  async function sendSingleDraft(index, accessTokenFromRedirect = "") {
    let accessToken = "";

    try {
      setStatus("Creating draft...");

      if (!isAuthenticated) {
        setStatus("You need to sign in before creating Outlook drafts.");
        await signIn();
        return;
      }

      const pendingAction = { type: "single", index };
      accessToken =
        typeof accessTokenFromRedirect === "string" && accessTokenFromRedirect
          ? accessTokenFromRedirect
          : await getAccessToken({ pendingAction });
      if (!accessToken) return;

      const email = merged[index];

      if (!email.to) {
        setStatus("Cannot create draft because this row is missing an email address.");
        return;
      }

      await createDraftWithFreshToken(email, accessToken, subject);

      clearPendingDraftAction();
      setStatus(`Draft created for ${email.to}`);
    } catch (error) {
      console.error(error);
      setStatus(`${error.message} ${summarizeGraphToken(accessToken)}`);
    }
  }

  async function sendAllDrafts(accessTokenFromRedirect = "") {
    let accessToken = "";

    try {
      setStatus("Creating Outlook drafts...");

      if (!isAuthenticated) {
        setStatus("You need to sign in before creating Outlook drafts.");
        await signIn();
        return;
      }

      const pendingAction = { type: "all" };
      accessToken =
        typeof accessTokenFromRedirect === "string" && accessTokenFromRedirect
          ? accessTokenFromRedirect
          : await getAccessToken({ pendingAction });
      if (!accessToken) return;

      const missingRecipientCount = merged.filter((email) => !email.to).length;

      if (missingRecipientCount > 0) {
        setStatus(
          `Cannot create drafts because ${missingRecipientCount} row${missingRecipientCount === 1 ? " is" : "s are"} missing an email address.`,
        );
        return;
      }

      for (const email of merged) {
        accessToken = await createDraftWithFreshToken(email, accessToken, subject);
        if (!accessToken) return;
      }

      clearPendingDraftAction();
      setStatus(`Created ${merged.length} drafts.`);
    } catch (error) {
      console.error(error);
      setStatus(`${error.message} ${summarizeGraphToken(accessToken)}`);
    }
  }

  useEffect(() => {
    if (hasResumedDraftAction.current) return;

    const pendingAction = readPendingDraftAction();
    if (!pendingAction) return;

    let accessToken;
    try {
      accessToken = consumeRedirectAccessToken();
    } catch (error) {
      setTimeout(() => setStatus(error.message), 0);
      clearPendingDraftAction();
      return;
    }

    if (!accessToken) return;

    hasResumedDraftAction.current = true;
    setTimeout(() => {
      setStatus("Permission approved. Creating Outlook draft...");

      if (pendingAction.type === "single") {
        sendSingleDraft(pendingAction.index, accessToken);
      } else if (pendingAction.type === "all") {
        sendAllDrafts(accessToken);
      } else {
        clearPendingDraftAction();
      }
    }, 0);
    // The pending redirect token should be consumed once when Preview mounts.
    // Re-running this for every render would risk creating duplicate drafts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1>Preview Page</h1>

      <div style={{ display: "flex", gap: "1.5rem" }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: "500", marginBottom: "8px" }}>
            {merged.length} recipients
          </p>

          {merged.map((item, index) => (
            <div
              key={index}
              onClick={() => setSelectedRow(index)}
              style={{
                padding: "7px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                background: selectedRow === index ? "#f0f4ff" : "transparent",
                border: "1px solid #eee",
                marginBottom: "6px",
              }}
            >
              <span className="recipient-email">
                {item.to || <em>(missing)</em>}
              </span>
              {item.warnings.length > 0 && (
                <span className="warning-badge" title="Has validation issues">
                  ⚠
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "12px", color: "gray", marginBottom: "8px" }}>
            Previewing {selectedRow + 1} of {merged.length}
          </p>

          <iframe
            title="Email preview"
            className="email-preview-frame"
            srcDoc={`
              <!doctype html>
              <html>
                <head>
                  <meta charset="utf-8" />
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      font-size: 14px;
                      line-height: 1.5;
                      margin: 0;
                      padding: 16px;
                      color: #111827;
                      background: white;
                    }

                    p {
                      margin: 0 0 12px;
                    }

                    img {
                      max-width: 100%;
                    }

                    table {
                      border-collapse: collapse;
                    }
                  </style>
                </head>
                <body>
                  ${merged[selectedRow]?.content || ""}
                </body>
              </html>
            `}
          />
        </div>
      </div>

      {status && <p style={{ marginTop: "16px" }}>{status}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
        <button onClick={onBack}>Back</button>

        <button onClick={() => sendSingleDraft(selectedRow)}>
          Send this email only
        </button>

        <button onClick={() => sendAllDrafts()}>
          Send all to Outlook drafts
        </button>
      </div>
    </div>
  );
}

export default PreviewPage;
