import { useState } from "react";
import { Editor } from "@tinymce/tinymce-react";

function TemplatePage({ onBack, onNext }) {
  const [content, setContent] = useState("<p>Edit template here.</p>");
  

  return (
    <div>
      <h1>Template Page</h1>

      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Next</button>

      {/* Buttons for create and upload template */}
      <div style={{margin: "10px"}}>

        <button>Create Template</button>
        <button>Upload Template</button>
          

      </div>
      <div style={{ marginTop: "10px" }}>
        <Editor
          value={content}
          onEditorChange={(newValue) => setContent(newValue)}
          init={{
            height: 400,
            menubar: false,

            // Creates toolbar
            toolbar:
              "undo redo | bold italic underline | " +
              "alignleft aligncenter alignright | " +
              "bullist numlist | link",
            
            // Enabled features
            plugins: ["lists", "link", "paste"],

            // Add editor style 
            content_style:
              "body { font-family:Arial,sans-serif; font-size:14px }",
          }}
        />
      </div>
        
        {/* Save template button */}
      <div style={{marginLeft: "900px", margin: "10px"}}>
          
        <button>Save Template</button>

      </div>
    </div>
  );
}

export default TemplatePage;