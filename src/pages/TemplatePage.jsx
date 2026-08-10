import { useState } from "react";
import RichTextEditor from "../components/RichTextEditor";
import "./TemplatePage.css";

function TemplatePage({
  onBack,
  onNext,
  initialContent = "",
  initialSubject = "E-merge-D Test Email",
}) {
  const [content, setContent] = useState(initialContent);
  const [subject, setSubject] = useState(initialSubject);

  return (
    <main className="template-page">
      <h1>Create email template</h1>

      <p className="template-help">
        Use {"{{ColumnHeader}}"} to insert values from your CSV, such as {"{{FirstName}}"} or {"{{Email}}"}.
      </p>

      <label className="template-field">
        Subject
        <input
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Email subject"
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
          onClick={() => onNext(content, subject)}
          disabled={!content.replace(/<[^>]*>/g, "").trim()}
        >
          Preview emails
        </button>
      </div>
    </main>
  );
}

export default TemplatePage;
