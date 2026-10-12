import { useState, useRef } from "react";
import RichTextEditor from "../components/RichTextEditor";
import "./TemplatePage.css";

function TemplatePage({
  onBack,
  onNext,
  initialContent = "",
  initialSubject = "E-merge-D Test Email",
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

  function insertHeader(header) {
    if (editorRef.current) {
      editorRef.current.insertContent(`{{${header}}}`);
    }
  }

  return (
    <main className="template-page">
      <h1>Create email template</h1>

      <p className="template-help">
        Use {"{{ColumnHeader}}"} to insert values from your CSV, such as {"{{FirstName}}"} or {"{{Email}}"}.
      </p>

      {headers.length > 0 && (
        <div className="template-header-buttons">
          <p className="template-header-label">Insert placeholders:</p>
          <div className="template-header-buttons-list">
            {headers.map((header) => (
              <button
                key={header}
                type="button"
                className="template-header-btn"
                onClick={() => insertHeader(header)}
                title={`Insert {{${header}}}`}
                >
                  {`{{${header}}}`}
                </button>
            ))}
          </div>
        </div>
      )}

      <label className="template-field">
        CC
        <input
          type="text"
          value={csvHasCc ? "Uploaded CSV file contains a 'CC' column. This will be used for CC recipients." : manualCc}
          onChange={event => !csvHasCc && setManualCc(event.target.value)}
          disabled={csvHasCc}
          style={{color: csvHasCc ? "rgba(0, 0, 0, 0.55)" : undefined,
                  cursor: csvHasCc ? "not-allowed" : undefined}}
          placeholder="CC"
        />
      </label>

      <label className="template-field">
        BCC
        <input
          type="text"
          value={csvHasBcc ? "Uploaded CSV file contains a 'BCC' column. This will be used for BCC recipients." : manualBcc}
          onChange={event => !csvHasBcc &&  setManualBcc(event.target.value)}
          disabled={csvHasBcc}
          style={{color: csvHasBcc ? "rgba(0, 0, 0, 0.55)" : undefined,
                  cursor: csvHasBcc ? "not-allowed" : undefined}}
          placeholder="BCC"
        />
      </label>
      
      <label className="template-field">
        Reply To
        <input
          type="text"
          value={replyTo}
          onChange={(event) => setReplyTo(event.target.value)}
          placeholder="Reply To"
        />
      </label>

      <label className="template-field">
        Subject
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Subject"
        />
      </label>

      <RichTextEditor
        ref={editorRef}
        value={content}
        onChange={setContent}
        ariaLabel="Email template content"
      />

      <div className="template-actions">
        <button type="button" onClick={onBack}>Back</button>
        <button
          type="button"
          className="template-next"
          onClick={() => onNext(content, subject, manualCc, manualBcc, replyTo)}
          disabled={!content.replace(/<[^>]*>/g, "").trim()}
        >
          Preview emails
        </button>
      </div>
    </main>
  );
}

export default TemplatePage;
