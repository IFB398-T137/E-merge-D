import { useState, useRef } from "react";
import RichTextEditor from "../components/RichTextEditor";
import "./TemplatePage.css";

function TemplatePage({
  onBack,
  onNext,
  initialContent = "",
  initialSubject = "MailMagpie Test Email",
  initialCc = "",
  initialBcc = "",
  csvHasCc,
  csvHasBcc,
  initialReplyTo = "",
  headers = [],
}) {
  const [content, setContent] = useState(initialContent);
  const [subject, setSubject] = useState(initialSubject);
  const [manualCc, setManualCc] = useState(initialCc);
  const [manualBcc, setManualBcc] = useState(initialBcc);
  const [replyTo, setReplyTo] = useState(initialReplyTo);
  const editorRef = useRef(null);
  const isContentEmpty = !content.replace(/<[^>]*>/g, "").trim();

  function insertHeader(header) {
      editorRef.current?.insertContent(`{{${header}}}`);
  }

  return (
    <main className="template-page workflow-page">
      <div 
        className="workflow-content" 
        role="region" 
        aria-label="Email template editor" 
        tabIndex={0}>
          <h1>Create email template</h1>

        <label className="template-field">
          <input
            type="text"
            value={csvHasCc ? "Uploaded CSV file contains a 'CC' column. This will be used for CC recipients." : manualCc}
            onChange={event => !csvHasCc && setManualCc(event.target.value)}
            disabled={csvHasCc}
            style={{color: csvHasCc ? "rgba(0, 0, 0, 0.55)" : undefined,
                    cursor: csvHasCc ? "not-allowed" : undefined}}
            placeholder="CC email addresses (comma-separated)"
          />
        </label>

        <label className="template-field">
          <input
            type="text"
            value={csvHasBcc ? "Uploaded CSV file contains a 'BCC' column. This will be used for BCC recipients." : manualBcc}
            onChange={event => !csvHasBcc &&  setManualBcc(event.target.value)}
            disabled={csvHasBcc}
            style={{color: csvHasBcc ? "rgba(0, 0, 0, 0.55)" : undefined,
                    cursor: csvHasBcc ? "not-allowed" : undefined}}
            placeholder="BCC email addresses (comma-separated)"
          />
        </label>

        <label className="template-field">
          <input
            type="text"
            value={replyTo}
            onChange={(event) => setReplyTo(event.target.value)}
            placeholder="Reply-To address (optional)"
          />
        </label>

        <label className="template-field">
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Email subject"
          />
        </label>

        {headers.length > 0 && (
          <div className="template-header-buttons">
            <p className="template-header-label">Insert placeholders into the email body:</p>
            <div className="template-header-buttons-list">
              {headers.map((header) => (
                <button
                  key={header}
                  type="button"
                  className="template-header-button"
                  onClick={() => insertHeader(header)}
                  title={`Insert {{${header}}}`}
                  aria-label={`Insert ${header} placeholder`}
                >
                  {`{{${header}}}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <RichTextEditor
          ref={editorRef}
          value={content}
          onChange={setContent}
          ariaLabel="Email template content"
        />
      </div>

      <div className="template-actions">
        <button 
        type="button"
        onClick={onBack}>
          Back
        </button>

        <button
          type="button"
          onClick={() => onNext(content, subject, manualCc, manualBcc, replyTo)}
          disabled={isContentEmpty}
          aria-disabled={isContentEmpty}
          >
          Preview emails
        </button>
      </div>
    </main>
  );
}

export default TemplatePage;
