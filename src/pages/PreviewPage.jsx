import { useState } from "react";
import "./PreviewPage.css";

const MOCK_RECIPIENTS = [
  {
    to: "han@student.qut.edu.au",
    subject: "Welcome to IFB398, Han",
    body: "<p>Hi <strong>Han</strong>,</p><p>Your assigned team is <strong>T137</strong>.</p><p>Cheers,<br/>Aloha</p>",
    warnings: [],
  },
  {
    to: "tulga@student.qut.edu.au",
    subject: "Welcome to IFB398, Tulga",
    body: "<p>Hi <strong>Tulga</strong>,</p><p>Your assigned team is <strong>T142</strong>.</p>",
    warnings: ["Missing sign-off"],
  },
  {
    to: "",
    subject: "Welcome to IFB398, {name}",
    body: "<p>Hi <strong>{name}</strong>,</p><p>Your assigned team is <strong>{team}</strong>.</p>",
    warnings: ["Missing recipient email", "Unfilled placeholders: {name}, {team}"],
  },
];

function PreviewPage({ onBack, recipients = MOCK_RECIPIENTS }) {
  const [index, setIndex] = useState(0);
  const current = recipients[index];
  const total = recipients.length;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(total - 1, i + 1));

  return (
    <div className="preview-page">
      <header className="preview-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h1>Preview Emails</h1>
      </header>

      <div className="preview-nav-bar">
        <button
          className="nav-btn"
          onClick={goPrev}
          disabled={index === 0}
        >
          ← Previous
        </button>
        <span className="preview-counter">
          Email {index + 1} of {total}
        </span>
        <button
          className="nav-btn"
          onClick={goNext}
          disabled={index === total - 1}
        >
          Next →
        </button>
      </div>

      {current.warnings.length > 0 && (
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
          <span>{current.to || <em>(missing)</em>}</span>
        </div>
        <div className="preview-field">
          <label>Subject:</label>
          <span>{current.subject}</span>
        </div>
        <div
          className="preview-body"
          dangerouslySetInnerHTML={{ __html: current.body }}
        />
      </section>

      <footer className="preview-actions">
        <button className="btn-secondary">Edit this email</button>
        <button className="btn-primary">Approve all & send to drafts</button>
      </footer>
    </div>
  );
}

export default PreviewPage;