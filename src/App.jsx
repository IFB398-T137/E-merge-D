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
  const [body, setBody] = useState(savedWorkflow?.body || "");
  const [subject, setSubject] = useState(savedWorkflow?.subject || "E-merge-D Test Email");

  useEffect(() => {
    sessionStorage.setItem(
      savedWorkflowKey,
      JSON.stringify({
        currentPage,
        csvData,
        body,
        subject,
      }),
    );
  }, [body, csvData, currentPage, subject]);

  return (
    <div>
      {currentPage === "upload" && (
        <UploadPage onNext={() => setCurrentPage("template")}
        setCsvData={setCsvData}/>
      )}

      {currentPage === "template" && (
        <TemplatePage
          onBack={() => setCurrentPage("upload")}
          onNext={(templateBody, newSubject) => {
            setBody(templateBody);
            setSubject(newSubject);
            setCurrentPage("preview");
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
          onBack={() => setCurrentPage("template")} />
      )}

      
    </div>
  );
}

export default App;
