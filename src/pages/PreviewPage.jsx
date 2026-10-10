import { useEffect, useRef, useState } from "react";
import "./PreviewPage.css";
import { mergeContent } from "../utils/mergingFunc";
import RichTextEditor from "../components/RichTextEditor";
import { useDesktopAuth } from "../auth/DesktopAuthContext.jsx";
import { createOutlookDraftWithRefresh } from "../utils/outlookDrafts";
import { validateRow } from "../utils/validateCsv";
import { getRecipientEmail, processRecipientArrays } from "../utils/processRecipients.js";

import {
  formatFileSize,
  getRowAttachmentPaths,
  prepareEmailAttachments,
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

function ConfirmationModal({ emails, globalAttachmentCount, onCancel, onConfirm }) {
  const recipientCount = emails.length;
  const rowAttachmentCount = emails.reduce((total, email) => total + email.attachmentPaths.length, 0);
  const recipientsWithAttachments = emails.filter((email) => email.attachmentPaths.length > 0).length;

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
          {globalAttachmentCount === 0 && rowAttachmentCount === 0
            ? "No attachments will be added."
            : `${globalAttachmentCount} global attachment${globalAttachmentCount === 1 ? "" : "s"} will be added to every draft.`}
        </p>
        {rowAttachmentCount > 0 && (
          <p>
            {rowAttachmentCount} CSV attachment{rowAttachmentCount === 1 ? "" : "s"} will also be added across {recipientsWithAttachments} draft{recipientsWithAttachments === 1 ? "" : "s"}, each only to its corresponding recipient.
          </p>
        )}
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

function InterruptDraftsModal({ created, total, onContinue, onInterrupt }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirmation-modal interrupt-confirmation"
      aria-labelledby="interrupt-title"
      aria-describedby="interrupt-description"
      onCancel={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <h2 id="interrupt-title">Interrupt draft creation?</h2>
      <p>{created} of {total} drafts have been created in Outlook.</p>
      <div id="interrupt-description">
        <p>Confirming will stop creating the remaining drafts. A draft already being saved may still finish.</p>
        <p>Existing drafts will stay in your Outlook Drafts folder. No emails will be sent or deleted.</p>
        <p>Creation continues until you confirm. Starting again begins with the first recipient and may create duplicate drafts.</p>
      </div>
      <div className="confirmation-actions">
        <button type="button" onClick={onContinue} autoFocus>Keep creating</button>
        <button type="button" className="interrupt-drafts" onClick={onInterrupt}>Interrupt creation</button>
      </div>
    </dialog>
  );
}

function PreviewPage({
  csvData,
  csvSourceId,
  body,
  subject = "MailMagpie Test Email",
  cc,
  bcc,
  replyTo,
  csvHasCc,
  csvHasBcc,
  emailEdits = {},
  attachments = [],
  setAttachments,
  onSaveEmailEdit,
  onBack,
}) {
  const [selectedRow, setSelectedRow] = useState(0);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const searchInputRef = useRef(null);
  const recipientRefs = useRef([]);

  const [status, setStatus] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDraftAction, setPendingDraftAction] = useState(null);
  const [isCreatingDrafts, setIsCreatingDrafts] = useState(false);
  const [bulkDraftProgress, setBulkDraftProgress] = useState(null);
  const [showInterruptConfirmation, setShowInterruptConfirmation] = useState(false);
  const bulkDraftRunRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const isBusy = isCreatingDrafts || isExporting || Boolean(pendingDraftAction);
  const { signIn, getAccessToken, isAuthenticated } = useDesktopAuth();

  useEffect(() => () => bulkDraftRunRef.current?.abort(), []);

  useEffect(() => {
    function handleFind(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f" && !isEditing && !pendingDraftAction && !showInterruptConfirmation) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleFind);
    return () => window.removeEventListener("keydown", handleFind);
  }, [isEditing, pendingDraftAction, showInterruptConfirmation]);


  // CC not working - check object types, csv saved in array, manual entry cc is cleaned up and then save in an array, if hasCc then no action but if !hasCc, use manualCcs

  const merged = csvData.map((row, index) => {
    const isEdited = Object.prototype.hasOwnProperty.call(emailEdits, index);
    const content = isEdited ? emailEdits[index] : mergeContent(body, row);
    const rowReplyTo = (row && (row.ReplyTo || row.replyto)) || replyTo || "";
    const to = getRecipientEmail(row);
    const { cc: rowCc, bcc: rowBcc } = processRecipientArrays({
      row,
      csvHasCc,
      csvHasBcc,
      manualCc: cc,
      manualBcc: bcc,
      manualReplyTo: replyTo,
    });

    const name = Object.entries(row || {})
      .filter(([header]) => /name/i.test(header))
      .map(([, value]) => value)
      .filter(Boolean)
      .join(" ");

    return {
      rowIndex: index,
      attachmentPaths: getRowAttachmentPaths(row),
      name,
      to,
      cc: rowCc,
      bcc: rowBcc,
      replyTo: rowReplyTo,
      content,
      isEdited,
      warnings: validateRow(row),
    };
  });

  const searchTerm = recipientSearch.trim().toLowerCase();
  const matchingRows = merged.flatMap((item, index) =>
    searchTerm && [item.name, item.to, ...item.cc, ...item.bcc]
      .some((value) => String(value).toLowerCase().includes(searchTerm))
      ? [index] : [],
  );
  const matchingRowSet = new Set(matchingRows);
  const activeMatchRow = matchingRows[activeMatch];

  useEffect(() => {
    if (activeMatchRow !== undefined) {
      recipientRefs.current[activeMatchRow]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeMatchRow, searchTerm]);

  function moveMatch(direction) {
    if (matchingRows.length) {
      setActiveMatch((current) => (current + direction + matchingRows.length) % matchingRows.length);
    }
  }

  function highlightMatch(value) {
    const text = String(value || "");
    if (!searchTerm || !text) return text;
    const parts = [];
    const lower = text.toLowerCase();
    let start = 0;
    let match = lower.indexOf(searchTerm);
    while (match !== -1) {
      parts.push(text.slice(start, match));
      parts.push(<mark key={match}>{text.slice(match, match + searchTerm.length)}</mark>);
      start = match + searchTerm.length;
      match = lower.indexOf(searchTerm, start);
    }
    parts.push(text.slice(start));
    return parts;
  }

  async function createDraftWithFreshToken(
    email,
    accessToken,
    draftSubject,
    signal,
  ) {
    return createOutlookDraftWithRefresh(
      accessToken,
      {
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.replyTo,
        subject: draftSubject,
        htmlBody: email.content,
        attachments: email.attachments,
      },
      { getAccessToken, signal },
    );
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
      const email = merged[index];

      if (!email?.to) {
        setStatus("Cannot create draft because this row is missing an email address.");
        return;
      }

      setStatus("Validating attachments...");
      const [preparedEmail] = await prepareEmailAttachments({
        emails: [email],
        globalFiles: attachments,
        csvSourceId,
      });
      await ensureSignedIn();
      accessToken = await getAccessToken();
      setStatus("Creating draft...");
      await createDraftWithFreshToken(preparedEmail, accessToken, subject);
      setStatus(`Draft created for ${email.to}`);
    } catch (error) {
      console.error(error);
      setStatus(`${error.message}${accessToken ? ` ${summarizeGraphToken(accessToken)}` : ""}`);
    } finally {
      setIsCreatingDrafts(false);
    }
  }

  async function exportAllEmlFiles() {
    try {
      setIsExporting(true);
      const missingRecipientCount = merged.filter((email) => !email.to).length;

      if (missingRecipientCount > 0) {
        setStatus(
          `Cannot export .eml files because ${missingRecipientCount} row${missingRecipientCount === 1 ? " is" : "s are"} missing an email address.`,
        );
        return;
      }

      setStatus("Validating attachments...");
      const preparedEmails = await prepareEmailAttachments({
        emails: merged,
        globalFiles: attachments,
        csvSourceId,
      });

      setStatus("Preparing .eml files...");
      const result = await window.eMergeDFiles.exportAllEml({
        emails: preparedEmails.map(({ to, cc, bcc, replyTo, content, attachments }) => ({
          to, cc, bcc, replyTo, content, attachments,
        })),
        subject,
      });

      if (result.canceled) {
        setStatus("EML export cancelled.");
        return;
      }

      setStatus(`Exported ${result.count} .eml file${result.count === 1 ? "" : "s"} to ${result.folder}`);
    } catch (error) {
      console.error(error);
      setStatus(`Could not export .eml files: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }

  async function sendAllDrafts() {
    if (bulkDraftRunRef.current) return;
    const controller = new AbortController();
    bulkDraftRunRef.current = controller;
    const { signal } = controller;
    const total = merged.length;
    let created = 0;
    let accessToken = "";

    try {
      setIsCreatingDrafts(true);
      setBulkDraftProgress({ created, total, stopping: false });
      const missingRecipientCount = merged.filter((email) => !email.to).length;

      if (missingRecipientCount > 0) {
        setStatus(
          `Cannot create drafts because ${missingRecipientCount} row${missingRecipientCount === 1 ? " is" : "s are"} missing an email address.`,
        );
        return;
      }

      setStatus("Validating attachments...");
      const preparedEmails = await prepareEmailAttachments({
        emails: merged,
        globalFiles: attachments,
        csvSourceId,
      });
      signal.throwIfAborted();
      await ensureSignedIn();
      signal.throwIfAborted();
      accessToken = await getAccessToken();

      for (const email of preparedEmails) {
        signal.throwIfAborted();
        setStatus(`${created} of ${total} drafts created in Outlook. Creating the next draft...`);
        accessToken = await createDraftWithFreshToken(
          email,
          accessToken,
          subject,
          signal,
        );
        created += 1;
        setBulkDraftProgress({ created, total, stopping: signal.aborted });
      }

      setStatus(`Created ${total === 1 ? "1 draft" : `all ${total} drafts`} in Outlook.`);
    } catch (error) {
      if (signal.aborted && error === signal.reason) {
        setStatus(`Draft creation interrupted. ${created} of ${total} drafts created in Outlook; ${total - created} remaining. Existing drafts have been kept. Starting again begins with the first recipient.`);
      } else {
        console.error(error);
        setStatus(`Draft creation stopped. ${created} of ${total} drafts confirmed in Outlook. ${error.message}${accessToken ? ` ${summarizeGraphToken(accessToken)}` : ""}`);
      }
    } finally {
      bulkDraftRunRef.current = null;
      setBulkDraftProgress(null);
      setShowInterruptConfirmation(false);
      setIsCreatingDrafts(false);
    }
  }

  function interruptDraftCreation() {
    const controller = bulkDraftRunRef.current;
    if (!controller || controller.signal.aborted) return;
    controller.abort();
    setShowInterruptConfirmation(false);
    setBulkDraftProgress((progress) => ({ ...progress, stopping: true }));
    setStatus(`Interrupting draft creation. ${bulkDraftProgress.created} of ${bulkDraftProgress.total} drafts created in Outlook. Waiting for the current operation to finish...`);
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
    <main className="preview-page">
      <header className="preview-header"><h1>Preview emails</h1></header>

      <div className="preview-layout">
        <aside className="preview-sidebar" aria-label="Recipients">
          <p className="recipient-count">
            {merged.length} recipients
          </p>

          <div className="recipient-find">
            <label htmlFor="recipient-search">Find recipients</label>
            <input
              ref={searchInputRef}
              id="recipient-search"
              type="search"
              placeholder="Email or name"
              value={recipientSearch}
              onChange={(event) => {
                setRecipientSearch(event.target.value);
                setActiveMatch(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  moveMatch(event.shiftKey ? -1 : 1);
                } else if (event.key === "Escape") {
                  setRecipientSearch("");
                  setActiveMatch(0);
                }
              }}
            />
            {searchTerm && (
              <div className="recipient-find-controls">
                <span role="status">
                  {matchingRows.length ? `${activeMatch + 1} of ${matchingRows.length}` : "No matches"}
                </span>
                <button type="button" aria-label="Previous match" disabled={!matchingRows.length} onClick={() => moveMatch(-1)}>↑</button>
                <button type="button" aria-label="Next match" disabled={!matchingRows.length} onClick={() => moveMatch(1)}>↓</button>
              </div>
            )}
          </div>
          <div className="recipient-list">
          {merged.map((item, index) => (
            <button
              type="button"
              aria-pressed={selectedRow === index}
              className={`recipient-item${selectedRow === index ? " active" : ""}${item.isEdited ? " is-edited" : ""}${matchingRowSet.has(index) ? " search-match" : ""}${activeMatchRow === index ? " current-match" : ""}`}
              ref={(element) => { recipientRefs.current[index] = element; }}
              key={index}
              onClick={() => setSelectedRow(index)}

            >
              {item.name && <span className="recipient-email">{highlightMatch(item.name)}</span>}
              <span className="recipient-email">
                To: {highlightMatch(item.to) || <em>(missing)</em>}
              </span>
              <span className="recipient-email">
                CC: {highlightMatch(Array.isArray(item.cc) ? item.cc.join(", ") : item.cc) || <em>(missing)</em>}
              </span>
              <span className="recipient-email">
                BCC: {highlightMatch(Array.isArray(item.bcc) ? item.bcc.join(", ") : item.bcc) || <em>(missing)</em>}
              </span>
              {item.isEdited && <span className="edited-badge">Edited</span>}
              {item.warnings.length > 0 && (
                <span className="warning-badge" title="Has validation issues">
                  ⚠
                </span>
              )}
            </button>
          ))}
          </div>
        </aside>

        <div className="preview-main">
          <div className="preview-email-heading">
            <p className="preview-counter">
              Previewing {merged.length ? selectedRow + 1 : 0} of {merged.length}
            </p>
            <div className="preview-email-tools">
            <label className={`attachment-picker${isBusy ? " is-disabled" : ""}`}>
              Add attachments
              <input type="file" multiple onChange={handleAttachmentSelection} aria-describedby="attachment-help" disabled={isBusy} />
            </label>
            <button type="button" onClick={() => setIsEditing(true)} disabled={isBusy || !merged.length}>
              Edit this email
            </button>
            </div>
          </div>

      <section className="attachment-section" aria-labelledby="attachment-heading">
        <div>
          <h2 id="attachment-heading">Global attachments ({attachments.length})</h2>
          <p id="attachment-help">Selected files will be attached to every draft. Each file must be smaller than 3 MB.</p>
        </div>


        {attachments.length > 0 && (
          <ul className="attachment-list">
            {attachments.map((file) => (
              <li key={`${file.name}:${file.size}:${file.lastModified}`}>
                <span>{file.name} ({formatFileSize(file.size)})</span>
                <button
                  type="button"
                  onClick={() => setAttachments((currentAttachments) => currentAttachments.filter((item) => item !== file))}
                  aria-label={`Remove ${file.name}`}
                  disabled={isBusy}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {merged.some((email) => email.attachmentPaths.length > 0) && (
      <section className="attachment-section" aria-labelledby="recipient-attachment-heading">
        <h2 id="recipient-attachment-heading">CSV attachments for this recipient ({merged[selectedRow]?.attachmentPaths.length || 0})</h2>
        <p>Paths are relative to the uploaded CSV's folder. These files will be attached only to this recipient's draft. Each file must be smaller than 3 MB.</p>
        {merged[selectedRow]?.attachmentPaths.length > 0 ? (
          <ul className="attachment-list">
            {merged[selectedRow].attachmentPaths.map((attachmentPath, index) => (
              <li key={`${index}:${attachmentPath}`}><span>{attachmentPath}</span></li>
            ))}
          </ul>
        ) : <p>No CSV attachments for this recipient.</p>}
      </section>
      )}

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


      {pendingDraftAction && (
        <ConfirmationModal
          emails={pendingDraftAction.type === "all" ? merged : [merged[pendingDraftAction.index]]}
          globalAttachmentCount={attachments.length}
          onCancel={() => setPendingDraftAction(null)}
          onConfirm={confirmDraftCreation}
        />
      )}

      {showInterruptConfirmation && bulkDraftProgress && (
        <InterruptDraftsModal
          created={bulkDraftProgress.created}
          total={bulkDraftProgress.total}
          onContinue={() => setShowInterruptConfirmation(false)}
          onInterrupt={interruptDraftCreation}
        />
      )}

      <footer className="preview-footer">
      {status && <p className="draft-status" role="status">{status}</p>}

      {bulkDraftProgress && (
        <div className="draft-interrupt-controls">
          <button
            type="button"
            className="interrupt-drafts"
            aria-haspopup="dialog"
            disabled={bulkDraftProgress.stopping}
            onClick={() => setShowInterruptConfirmation(true)}
          >
            {bulkDraftProgress.stopping ? "Interrupting…" : "Interrupt draft creation"}
          </button>
        </div>
      )}

      <div className="preview-actions">
        <button onClick={onBack} disabled={isBusy}>Back</button>

        <button
          type="button"
          onClick={exportAllEmlFiles}
          disabled={merged.length === 0 || isBusy}
        >
          Export all .eml files
        </button>

        <button onClick={requestAllDrafts} disabled={isBusy || !merged.length}>
          Create all Outlook drafts
        </button>
      </div>
      </footer>
    </main>
  );
} 
export default PreviewPage;
