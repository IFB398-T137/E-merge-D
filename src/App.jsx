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
  const [CsvHeaderFields, setCsvHeaderFields] = useState(savedWorkflow?.CsvHeaderFields || { hasCc: false, hasBcc: false });
  const [alertCcBcc, setAlertCcBcc] = useState(savedWorkflow?.alertCcBcc || "");
  const [manualCc, setManualCc] = useState (savedWorkflow?.manualCc || "");
  const [manualBcc, setManualBcc] = useState (savedWorkflow?.manualBcc || "");
  const [replyTo, setReplyTo] = useState(savedWorkflow?.replyTo || "");
  const [attachments, setAttachments] = useState([]);

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
        CsvHeaderFields,
        alertCcBcc,
        manualCc,
        manualBcc,
        replyTo,
      }),
    );
  }, [body, csvData, currentPage, emailEdits, selectedFileName, subject, CsvHeaderFields, alertCcBcc, manualCc, manualBcc, replyTo
  ]);

  return (
    <div>
      {currentPage === "upload" && (
        <UploadPage
          onNext={() => 
            setCurrentPage("template")}
          setCsvData={setCsvData}
          csvData={csvData}
          CsvHeaderFields={CsvHeaderFields}
          setCsvHeaderFields={setCsvHeaderFields}
          alertCcBcc={alertCcBcc}
          setAlertCcBcc={setAlertCcBcc}
          selectedFileName={selectedFileName}
          setSelectedFileName={setSelectedFileName}
          onFile={() => {
            setCsvData([]);
            setSelectedFileName("");
            setEmailEdits({});
            setAlertCcBcc("");
            setCsvHeaderFields({ hasCc: false, hasBcc: false });
            setManualCc("");
            setManualBcc("");
            setReplyTo("");
          }}
        />
      )}

      {currentPage === "template" && (
        <TemplatePage
          onBack={() => setCurrentPage("upload")}
          onNext={(templateBody, newSubject, cc, bcc, newReplyTo) => {
            setEmailEdits((currentEdits) => (templateBody === body ? currentEdits : {}));
            setBody(templateBody);
            setSubject(newSubject);
            setManualCc(cc);
            setManualBcc(bcc);
            setReplyTo(newReplyTo);
            setCurrentPage("preview");
          }}
          csvHasCc={CsvHeaderFields.hasCc}
          csvHasBcc={CsvHeaderFields.hasBcc}
          initialContent={body}
          initialSubject={subject}
          initialCc={manualCc}
          initialBcc={manualBcc}
          initialReplyTo={replyTo}
        />
      )}

      {currentPage === "preview" && (
        <PreviewPage 
          csvData={csvData}
          body={body}
          subject={subject}
          emailEdits={emailEdits}
          cc={manualCc}
          bcc={manualBcc}
          csvHasCc={CsvHeaderFields.hasCc}
          csvHasBcc={CsvHeaderFields.hasBcc}
          replyTo={replyTo}
          attachments={attachments}
          setAttachments={setAttachments}
          onSaveEmailEdit={(index, content) => {
            setEmailEdits((currentEdits) => ({ ...currentEdits, [index]: content }));
          }}
          onBack={() => setCurrentPage("template")} />
      )}
      
    </div>
  );
}

export default App;
