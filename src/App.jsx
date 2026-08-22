import { useEffect, useState } from "react";
import UploadPage from "./pages/UploadPage";
import TemplatePage from "./pages/TemplatePage";
import PreviewPage from "./pages/PreviewPage";

const savedWorkflowKey = "emerged.workflow";

function loadSavedWorkflow() {
  try {
    const savedWorkflow = JSON.parse(sessionStorage.getItem(savedWorkflowKey));

    if (!savedWorkflow || typeof savedWorkflow !== "object") {
      return null;
    }

    return savedWorkflow;
  } catch {
    return null;
  }
}

function App() {
  const savedWorkflow = loadSavedWorkflow();
  const [currentPage, setCurrentPage] = useState(savedWorkflow?.currentPage || "upload");
  const [csvData, setCsvData] = useState(savedWorkflow?.csvData || []);
  const [selectedFileName, setSelectedFileName] = useState(savedWorkflow?.selectedFileName || "");
  const [body, setBody] = useState(savedWorkflow?.body || "");
  const [subject, setSubject] = useState(savedWorkflow?.subject || "E-merge-D Test Email");
  const [emailEdits, setEmailEdits] = useState(savedWorkflow?.emailEdits || {});
  const [recipientFields, setRecipientFields] = useState(savedWorkflow?.recipientFields || {
     to: "", 
     cc: "", 
     bcc: "" });

  useEffect(() => {
    sessionStorage.setItem(
      savedWorkflowKey,
      JSON.stringify({
        currentPage,
        csvData,
        selectedFileName,
        body,
        subject,
        emailEdits,
        recipientFields
      }),
    );
  }, [body, csvData, currentPage, emailEdits, selectedFileName, subject, recipientFields]);

  return (
    <div>
      {currentPage === "upload" && (
        <UploadPage
          onNext={() => setCurrentPage("template")}
          setCsvData={setCsvData}
          csvData={csvData}
          selectedFileName={selectedFileName}
          setSelectedFileName={setSelectedFileName}
          onClearFile={() => {
            setCsvData([]);
            setSelectedFileName("");
            setEmailEdits({});
            setRecipientFields({ to: "", cc: "", bcc: "" });
          }}
        />
      )}

      {currentPage === "template" && (
        <TemplatePage
          onBack={() => setCurrentPage("upload")}
          onNext={(templateBody, newSubject) => {
            setEmailEdits((currentEdits) => (templateBody === body ? currentEdits : {}));
            setBody(templateBody);
            setSubject(newSubject);
            setCurrentPage("preview");
            setRecipientFields((currentFields) => ({
              ...currentFields,
              to: currentFields.to || "",
              cc: currentFields.cc || "",
              bcc: currentFields.bcc || ""
            }));
          }}
          initialContent={body}
          initialSubject={subject}
        />
      )}

      {currentPage === "preview" && (
        <PreviewPage 
          csvData={csvData}
          body={body}
          subject={subject}
          emailEdits={emailEdits}
          recipientFields={recipientFields}
          onSaveEmailEdit={(index, content) => {
            setEmailEdits((currentEdits) => ({ ...currentEdits, [index]: content }));
          }}
          onBack={() => setCurrentPage("template")} />
      )}

      
    </div>
  );
}

export default App;
