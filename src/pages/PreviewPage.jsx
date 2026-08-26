import { useState } from "react";
import "./PreviewPage.css";
import { mergeContent } from "../utils/mergingFunc";
import RichTextEditor from "../components/RichTextEditor";
import { useDesktopAuth } from "../auth/DesktopAuthContext.jsx";
import { createOutlookDraft } from "../utils/outlookDrafts";
import { validateRow } from "../utils/validateCsv";
import { processRecipientArrays } from "../utils/processRecipients.js";


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
    const error = new Error(
      `Microsoft Graph rejected the access token before draft creation: ${response.status}${errorText ? ` - ${errorText}` : ""}`,
    );
    error.status = response.status;
    throw error;
  }
}

function EmailEditorModal({ 
  content, 
  onCancel, 
  onSave,
}) {
  const [editedContent, setEditedContent] = useState(content);

  return (
    <div className="email-editor-overlay" role="dialog" aria-modal="true" aria-label="Edit email">
      <div className="email-editor-modal">
        <div className="email-editor-header">
          <h2>Edit email</h2>
          <button type="button" className="email-editor-close" onClick={onCancel} aria-label="Close editor">
            ×
          </button>
        </div>

        <RichTextEditor
          value={editedContent}
          onChange={setEditedContent}
          ariaLabel="Email content"
          autoFocus
        />

        <div className="email-editor-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="email-editor-save"
            onClick={() => onSave(editedContent)}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewPage({
  csvData,
  body,
  subject = "E-merge-D Test Email",
  cc,
  bcc,
  csvHasCc,
  csvHasBcc,
  emailEdits = {},
  onSaveEmailEdit,
  onBack,
}) {
  const [selectedRow, setSelectedRow] = useState(0);
  const [status, setStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const { signIn, getAccessToken, isAuthenticated } = useDesktopAuth();

  // CC not working - check object types, csv saved in array, manual entry cc is cleaned up and then save in an array, if hasCc then no action but if !hasCc, use manualCcs

  const merged = csvData.map((row, index) => {
    const isEdited = Object.prototype.hasOwnProperty.call(emailEdits, index);
    const content = isEdited ? emailEdits[index] : mergeContent(body, row);
    const to = (row && (row.RecipientEmail || row.Email || row.recipientemail || row.email)) || "";
    const { cc: rowCc, bcc: rowBcc } = processRecipientArrays({
      row,
      csvHasCc,
      csvHasBcc,
      manualCc: cc,
      manualBcc: bcc,
    })

    return {
      to,
      cc: rowCc,
      bcc: rowBcc,
      content,
      isEdited,
      warnings: validateRow(row),
    };
  });

  async function createDraftWithFreshToken(email, accessToken, draftSubject) {
    try {
      await verifyGraphProfileAccess(accessToken);
      await createOutlookDraft(accessToken, {
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
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

      await verifyGraphProfileAccess(refreshedToken);
      await createOutlookDraft(refreshedToken, {
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: draftSubject,
        htmlBody: email.content,
      });

      return refreshedToken;
    }
  }

  async function ensureSignedIn() {
    if (isAuthenticated) return true;

    setStatus("Sign in with Microsoft to create Outlook drafts.");
    await signIn();
    return true;
  }

  async function sendSingleDraft(index) {
    let accessToken = "";

    try {
      setStatus("Creating draft...");
      await ensureSignedIn();

      accessToken = await getAccessToken();
      const email = merged[index];

      if (!email?.to) {
        setStatus("Cannot create draft because this row is missing an email address.");
        return;
      }

      await createDraftWithFreshToken(email, accessToken, subject);
      setStatus(`Draft created for ${email.to}`);
    } catch (error) {
      console.error(error);
      setStatus(`${error.message} ${summarizeGraphToken(accessToken)}`);
    }
  }

  async function sendAllDrafts() {
    let accessToken = "";

    try {
      setStatus("Creating Outlook drafts...");
      await ensureSignedIn();

      const missingRecipientCount = merged.filter((email) => !email.to).length;

      if (missingRecipientCount > 0) {
        setStatus(
          `Cannot create drafts because ${missingRecipientCount} row ${missingRecipientCount === 1 ? " is" : "s are"} missing an email address.`,
        );
        return;
      }

      accessToken = await getAccessToken();

      for (const email of merged) {
        accessToken = await createDraftWithFreshToken(email, accessToken, subject);
      }

      setStatus(`Created ${merged.length} drafts.`);
    } catch (error) {
      console.error(error);
      setStatus(`${error.message} ${summarizeGraphToken(accessToken)}`);
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
                border: item.isEdited ? "2px solid #7c3aed" : "1px solid #eee",
                marginBottom: "6px",
              }}
            >
              <span className="recipient-email">
                To: {item.to || <em>(missing)</em>}
              </span>
              {item.isEdited && (<span className="edited-badge">Edited</span>)}
              {item.warnings.length > 0 && (
                <span className="warning-badge" title="Has validation issues"> ⚠ </span>
              )}

              <span className="recipient-email">
                CC: {Array.isArray(item.cc) ? item.cc.join(", ") : item.cc || <em>(missing)</em>}
              </span>
              <span className="recipient-email">
                BCC: {Array.isArray(item.bcc) ? item.bcc.join(", ") : item.bcc || <em>(missing)</em>}
              </span>
              {item.isEdited && <span className="edited-badge">Edited</span>}
              {item.warnings.length > 0 && (
                <span className="warning-badge" title="Has validation issues">
                  ⚠
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <div className="preview-email-heading">
            <p style={{ fontSize: "12px", color: "gray", marginBottom: "8px" }}>
              Previewing {selectedRow + 1} of {merged.length}
            </p>
            <button type="button" onClick={() => setIsEditing(true)} disabled={!merged.length}>
              Edit this email
            </button>
          </div>

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

      {isEditing && merged[selectedRow] && (
        <EmailEditorModal
          content={merged[selectedRow].content}
          onCancel={() => setIsEditing(false)}
          onSave={(content) => {
            onSaveEmailEdit(selectedRow, mergeContent(content, csvData[selectedRow] || {}));
            setIsEditing(false);
          }}
        />
      )}

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