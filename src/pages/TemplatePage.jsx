import { useState } from "react";
import RichTextEditor from "../components/RichTextEditor";
import "./TemplatePage.css";

function TemplatePage({
  onBack,
  onNext,
  initialContent = "",
  initialSubject = "E-merge-D Test Email",
  csvHasCc,
  csvHasBcc,
}) {
  const [content, setContent] = useState(initialContent);
  const [subject, setSubject] = useState(initialSubject);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");

  const activeFieldStyle = {
    borderColor: "#007BFF",
    boxShadow: "0 0 5px rgba(0, 123, 255, 0.5)",
    display: "block",
  }

  const inactiveFieldStyle = {
    borderColor: "#f0f0f0",
    boxShadow: "none",
    display: "block",
    cursor: "not-allowed",
  }

  return (
    <main className="template-page">
      <h1>Create email template</h1>

      <p className="template-help">
        Use {"{{ColumnHeader}}"} to insert values from your CSV, such as {"{{FirstName}}"} or {"{{Email}}"}.
      </p>
      
      <label className="template-field">
        CC
        {csvHasCc && (
          <span style={{ color: "green", marginLeft: "8px" }}>
            Uploaded CSV file contains a 'CC' column. This will be used for CC recipients.
          </span>
        )}
        <input
          type="text"
          value={csvHasCc ? "From CSV file" : cc}
          onChange={event => !csvHasCc &&  setCc(event.target.value)}
          disabled={csvHasCc}
          placeholder="CC"
          style={csvHasCc ? inactiveFieldStyle : activeFieldStyle}
        />
      </label>

      <label className="template-field">
        BCC
        {csvHasBcc && (
          <span>
            Uploaded CSV file contains a 'BCC' column. This will be used for BCC recipients.
          </span>
        )}
        </label>
        <input
          type="text"
          value={csvHasBcc ? "From CSV file" : bcc}
          onChange={event => !csvHasBcc &&  setBcc(event.target.value)}
          disabled={csvHasBcc}
          placeholder="BCC"
          style={csvHasBcc ? inactiveFieldStyle : activeFieldStyle}
        />

      <label className="template-field">
        Subject
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Email subject"
          style={activeFieldStyle}
        />
      </label>

      <RichTextEditor
        value={content}
        onChange={setContent}
        ariaLabel="Email template content"
      />

      <div className="template-actions">
        <button type="button" onClick={onBack}>Back</button>
        <button
          type="button"
          className="template-next"
          onClick={() => onNext(content, subject, cc, bcc)}
          disabled={!content.replace(/<[^>]*>/g, "").trim()}
        >
          Preview emails
        </button>
      </div>
    </main>
  );
}

export default TemplatePage;
