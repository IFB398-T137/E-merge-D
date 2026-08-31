import { useState } from "react";
import "./PreviewPage.css";
import { mergeContent } from "../utils/mergingFunc";
import RichTextEditor from "../components/RichTextEditor";
import { useDesktopAuth } from "../auth/DesktopAuthContext.jsx";
import { createOutlookDraft } from "../utils/outlookDrafts";
import { validateRow } from "../utils/validateCsv";
import { processRecipientArrays } from "../utils/processRecipients.js";

import {
  formatFileSize,
  prepareGraphAttachments,
  validateAttachmentSelection,
} from "../utils/attachments";

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

function ConfirmationModal({ recipientCount, attachments, onCancel, onConfirm }) {
  return (
    <div
      className="confirmation-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <div className="confirmation-modal">
        <h2 id="confirmation-title">Create Outlook {recipientCount === 1 ? "draft" : "drafts"}?</h2>
        <p>
          This will create {recipientCount} draft{recipientCount === 1 ? "" : "s"}. It will not send any email.
        </p>
        <p>
          {attachments.length === 0
            ? "No attachments will be added."
            : `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} will be added to every draft.`}
        </p>
        <div className="confirmation-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" className="confirmation-create" onClick={onConfirm} autoFocus>
            Create {recipientCount === 1 ? "draft" : "drafts"}
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
  attachments = [],
  setAttachments,
  onSaveEmailEdit,
  onBack,
}) {
  const [selectedRow, setSelectedRow] = useState(0);
  const [status, setStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDraftAction, setPendingDraftAction] = useState(null);
  const [isCreatingDrafts, setIsCreatingDrafts] = useState(false);
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
    });

    return {
      to,
      cc: rowCc,
      bcc: rowBcc,
      content,
      isEdited,
      warnings: validateRow(row),
    };
  });

  async function createDraftWithFreshToken(
    email,
    accessToken,
    draftSubject,
    graphAttachments,
  ) {
    try {
      await verifyGraphProfileAccess(accessToken);
      await createOutlookDraft(accessToken, {
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: draftSubject,
        htmlBody: email.content,
        attachments: graphAttachments,
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
        attachments: graphAttachments,
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
      setIsCreatingDrafts(true);
      setStatus("Creating draft...");
      await ensureSignedIn();

      accessToken = await getAccessToken();
      const email = merged[index];

      if (!email?.to) {
        setStatus("Cannot create draft because this row is missing an email address.");
        return;
      }

      const graphAttachments = await prepareGraphAttachments(attachments);
      await createDraftWithFreshToken(email, accessToken, subject, graphAttachments);
      setStatus(`Draft created for ${email.to}`);
    } catch (error) {
      console.error(error);
      setStatus(`${error.message} ${summarizeGraphToken(accessToken)}`);
    } finally {
      setIsCreatingDrafts(false);
    }
  }

async function exportAllEmlFiles() {
  try {
    const missingRecipientCount = merged.filter(
      (email) => !email.to,
    ).length;

    if (missingRecipientCount > 0) {
      setStatus(
        `Cannot export .eml files because ${missingRecipientCount} row${
          missingRecipientCount === 1 ? " is" : "s are"
        } missing an email address.`,
      );
      return;
    }

    setStatus("Preparing .eml files...");

    const emlAttachments =
      await prepareGraphAttachments(attachments);

    const result =
      await window.eMergeDFiles.exportAllEml({
        emails: merged.map((email) => ({
          to: email.to,
          cc: email.cc,
          bcc: email.bcc,
          content: email.content,
        })),
        subject,
        attachments: emlAttachments,
      });

    if (result.canceled) {
      setStatus("EML export cancelled.");
      return;
    }

    setStatus(
      `Exported ${result.count} .eml file${
        result.count === 1 ? "" : "s"
      } to ${result.folder}`,
    );
  } catch (error) {
    console.error(error);

    setStatus(
      `Could not export .eml files: ${error.message}`,
    );
  }
}

  async function sendAllDrafts() {
    let accessToken = "";

    try {
      setIsCreatingDrafts(true);
      setStatus("Creating Outlook drafts...");
      await ensureSignedIn();

      const missingRecipientCount = merged.filter((email) => !email.to).length;

      if (missingRecipientCount > 0) {
        setStatus(
          `Cannot create drafts because ${missingRecipientCount} row${missingRecipientCount === 1 ? " is" : "s are"} missing an email address.`,
        );
        return;
      }

      accessToken = await getAccessToken();
      const graphAttachments = await prepareGraphAttachments(attachments);

      for (const [index, email] of merged.entries()) {
        setStatus(`Creating draft ${index + 1} of ${merged.length}...`);
        accessToken = await createDraftWithFreshToken(
          email,
          accessToken,
          subject,
          graphAttachments,
        );
      }

      setStatus(`Created ${merged.length} drafts.`);
    } catch (error) {
      console.error(error);
      setStatus(`${error.message} ${summarizeGraphToken(accessToken)}`);
    } finally {
      setIsCreatingDrafts(false);
    }
  }

  function handleAttachmentSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    const { validFiles, errors } = validateAttachmentSelection(selectedFiles);

    if (validFiles.length > 0) {
      setAttachments((currentAttachments) => {
        const existingFiles = new Set(
          currentAttachments.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
        );
        const newFiles = validFiles.filter(
          (file) => !existingFiles.has(`${file.name}:${file.size}:${file.lastModified}`),
        );

        return [...currentAttachments, ...newFiles];
      });
    }

    setStatus(errors.length > 0 ? errors.join(" ") : `${validFiles.length} attachment${validFiles.length === 1 ? "" : "s"} selected.`);
    event.target.value = "";
  }

  function requestAllDrafts() {
    const missingRecipientCount = merged.filter((email) => !email.to).length;

    if (missingRecipientCount > 0) {
      setStatus(
        `Cannot create drafts because ${missingRecipientCount} row${missingRecipientCount === 1 ? " is" : "s are"} missing an email address.`,
      );
      return;
    }

    setPendingDraftAction({ type: "all" });
  }

  function confirmDraftCreation() {
    const action = pendingDraftAction;
    setPendingDraftAction(null);

    if (action?.type === "single") {
      void sendSingleDraft(action.index);
    } else if (action?.type === "all") {
      void sendAllDrafts();
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

      <section className="attachment-section" aria-labelledby="attachment-heading">
        <div>
          <h2 id="attachment-heading">Attachments</h2>
          <p>Selected files will be attached to every draft. Each file must be smaller than 3 MB.</p>
        </div>
        <label className="attachment-picker">
          Add files
          <input type="file" multiple onChange={handleAttachmentSelection} />
        </label>

        {attachments.length > 0 && (
          <ul className="attachment-list">
            {attachments.map((file) => (
              <li key={`${file.name}:${file.size}:${file.lastModified}`}>
                <span>{file.name} ({formatFileSize(file.size)})</span>
                <button
                  type="button"
                  onClick={() => setAttachments((currentAttachments) => currentAttachments.filter((item) => item !== file))}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingDraftAction && (
        <ConfirmationModal
          recipientCount={pendingDraftAction.type === "all" ? merged.length : 1}
          attachments={attachments}
          onCancel={() => setPendingDraftAction(null)}
          onConfirm={confirmDraftCreation}
        />
      )}

      {status && <p className="draft-status" role="status">{status}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
        <button onClick={onBack} disabled={isCreatingDrafts}>Back</button>

        <button
          type="button"
          onClick={exportAllEmlFiles}
          disabled={merged.length === 0 || isCreatingDrafts}
        >
          Export all .eml files
        </button>

        <button onClick={requestAllDrafts} disabled={isCreatingDrafts || !merged.length}>
          Create all Outlook drafts
        </button>
      </div>
    </div>
  );
} 
export default PreviewPage;