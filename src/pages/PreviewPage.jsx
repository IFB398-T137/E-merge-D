import { useState } from "react";
import "./PreviewPage.css";
import { mergeContent } from "../utils/mergingFunc";

// Fallback mock data for standalone testing if no csvData passed in
const MOCK_DATA = [
  { RecipientEmail: "han@student.qut.edu.au", FirstName: "Han", Team: "T137" },
  { RecipientEmail: "tulga@student.qut.edu.au", FirstName: "Tulga", Team: "T142" },
  { RecipientEmail: "", FirstName: "", Team: "" },
];
const MOCK_BODY =
  "<p>Hi <strong>{FirstName}</strong>,</p><p>Your assigned team is <strong>{Team}</strong>.</p><p>Cheers,<br/>Aloha</p>";

function validateRow(row, mergedHtml) {
  const issues = [];
  if (!row.RecipientEmail) issues.push("Missing recipient email");
  const unfilled = mergedHtml && mergedHtml.match(/\{[^}]+\}/g);
  if (unfilled) issues.push(`Unfilled placeholders: ${unfilled.join(", ")}`);
  return issues;
}

function PreviewPage({ csvData = MOCK_DATA, body = MOCK_BODY, onBack }) {
  const [selectedRow, setSelectedRow] = useState(0);

  const merged = csvData.map((row) => {
    const content = mergeContent(body, row);
    return {
      to: row.RecipientEmail,
      content,
      warnings: validateRow(row, content),
    };
  });

  const current = merged[selectedRow];
  const total = merged.length;

  return (
    <div className="preview-page">
      <header className="preview-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h1>Preview Emails</h1>
        <p className="preview-counter">
          Previewing {selectedRow + 1} of {total} recipients
        </p>
      </header>

      <div className="preview-layout">
        <aside className="preview-sidebar">
          <p className="recipient-count">{total} recipients</p>
          {merged.map((item, i) => (
            <div
              key={i}
              className={`recipient-item ${selectedRow === i ? "active" : ""}`}
              onClick={() => setSelectedRow(i)}
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

        <main className="preview-main">
          {current?.warnings.length > 0 && (
            <div className="preview-warnings">
              <strong>⚠ Validation issues:</strong>
              <ul>
                {current.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="preview-email">
            <div className="preview-field">
              <label>To:</label>
              <span>{current?.to || <em>(missing)</em>}</span>
            </div>
            <div
              className="preview-body"
              dangerouslySetInnerHTML={{ __html: current?.content || "" }}
            />
          </section>
        </main>
      </div>

      <footer className="preview-actions">
        <button className="btn-secondary">Send this email only</button>
        <button className="btn-primary">Send all to Outlook drafts</button>
      </footer>
    </div>
  );
}

export default PreviewPage;