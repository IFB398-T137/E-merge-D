import { useState } from "react";
import "./PreviewPage.css";
import { mergeContent } from "../utils/mergingFunc";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

import { loginRequest } from "../authConfig";
import { createOutlookDraft } from "../utils/outlookDrafts";

function PreviewPage({ csvData, body, onBack }) {
  const [selectedRow, setSelectedRow] = useState(0);
  const [status, setStatus] = useState("");

  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const merged = csvData.map((row) => {
    const content = mergeContent(body, row);
    return {
      to: row.RecipientEmail,
      content,
      warnings: validateRow(row, content),
    };
  });

  async function signIn() {
    await instance.loginRedirect(loginRequest);
  }

  async function getAccessToken() {
    if (!accounts[0]) {
      await signIn();
      return null;
    }

    try {
      const result = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      return result.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect(loginRequest);
        return null;
      }

      throw error;
    }
  }

  async function sendSingleDraft(index) {
    try {
      setStatus("Creating draft...");

      if (!isAuthenticated) {
        setStatus("You need to sign in before creating Outlook drafts.");
        await signIn();
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const email = merged[index];

      await createOutlookDraft(accessToken, {
        to: email.to,
        subject: "E-merge-D Test Email",
        htmlBody: email.content,
      });

      setStatus(`Draft created for ${email.to}`);
    } catch (error) {
      console.error(error);
      setStatus(error.message);
    }
  }

  async function sendAllDrafts() {
    try {
      setStatus("Creating Outlook drafts...");

      if (!isAuthenticated) {
        setStatus("You need to sign in before creating Outlook drafts.");
        await signIn();
        return;
      }

      const accessToken = await getAccessToken();
      if (!accessToken) return;

      for (const email of merged) {
        await createOutlookDraft(accessToken, {
          to: email.to,
          subject: "E-merge-D Test Email",
          htmlBody: email.content,
        });
      }

      setStatus(`Created ${merged.length} drafts.`);
    } catch (error) {
      console.error(error);
      setStatus(error.message);
    }
  }

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
        </aside>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "12px", color: "gray", marginBottom: "8px" }}>
            Previewing {selectedRow + 1} of {merged.length}
          </p>

          <div
            style={{
              border: "1px solid #eee",
              minHeight: "300px",
              padding: "16px",
            }}
            dangerouslySetInnerHTML={{ __html: merged[selectedRow]?.content }}
          />
        </div>
      </div>

      {status && <p style={{ marginTop: "16px" }}>{status}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
        <button onClick={onBack}>Back</button>

        <button onClick={() => sendSingleDraft(selectedRow)}>
          Send this email only
        </button>

        <button onClick={sendAllDrafts}>
          Send all to Outlook drafts
        </button>
      </div>
    </div>
  );
}

export default PreviewPage;