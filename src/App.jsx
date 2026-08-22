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
  const [CcBccValue, setCcBccValue] = useState(savedWorkflow?.CcBccValue || { hasCc: false, hasBcc: false });
  const [alertCcBcc, setAlertCcBcc] = useState("");

  useEffect(() => {
    sessionStorage.setItem(
      savedWorkflowKey,
      JSON.stringify({
        currentPage,
        csvData,
        selectedFileName,
        body,
        subject,
        emailEdits
      }),
    );
  }, [body, csvData, currentPage, emailEdits, selectedFileName, subject
  ]);

  return (
    <div>
      {currentPage === "upload" && (
        <UploadPage
          onNext={() => 
            setCurrentPage("template")}
          setCcBccValue={setCcBccValue}
          setCsvData={setCsvData}
          csvData={csvData}
          alertCcBcc={alertCcBcc}
          setAlertCcBcc={setAlertCcBcc}
          selectedFileName={selectedFileName}
          setSelectedFileName={setSelectedFileName}
          onClearFile={() => {
            setCsvData([]);
            setSelectedFileName("");
            setEmailEdits({});
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
          }}
          csvHasCc={CcBccValue.hasCc}
          csvHasBcc={CcBccValue.hasBcc}
          initialContent={body}
          initialSubject={subject}
          //initialCc={cc}
          //initialBcc={bcc}
        />
      )}

      {currentPage === "preview" && (
        <PreviewPage 
          csvData={csvData}
          body={body}
          subject={subject}
          emailEdits={emailEdits}
          //cc={cc}
          //bcc={bcc}
          onSaveEmailEdit={(index, content) => {
            setEmailEdits((currentEdits) => ({ ...currentEdits, [index]: content }));
          }}
          onBack={() => setCurrentPage("template")} />
      )}

      
    </div>
  );
}

export default App;
