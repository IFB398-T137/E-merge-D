import { useState } from "react";
import { Editor } from "@tinymce/tinymce-react";

function TemplatePage({ onBack, onNext }) {
  const [content, setContent] = useState("<p>Type here please...</p>");

  return (
    <div>
      <h1>Template Page</h1>

      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Next</button>

      <div style={{ marginTop: "10px" }}>
        <Editor
        apiKey="xgdtchyq1403e6xh20lgcepw0oidyr7ny78r4gr0g6bmuvk3"
          value={content}
          onEditorChange={(newValue) => setContent(newValue)}
          init={{
            height: 400,
            menubar: false,

            // ✅ Prebuilt toolbar
            toolbar:
              "undo redo | bold italic underline | " +
              "alignleft aligncenter alignright | " +
              "bullist numlist | link",

            // ✅ Features enabled
            plugins: ["lists", "link", "paste"],

            // Optional styling
            content_style:
              "body { font-family:Arial,sans-serif; font-size:14px }",
          }}
        />
      </div>
    </div>
  );
}

export default TemplatePage;