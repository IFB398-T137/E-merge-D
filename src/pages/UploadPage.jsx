import { useRef, useState } from "react";
import { parseFile } from "../utils/parseFile";
import { validateCsvHeaders } from "../utils/validateCsv";
import { useDesktopAuth } from "../auth/DesktopAuthContext.jsx";
import { CcBccValueExists } from "../utils/validateCsv";

function UploadPage({
  onNext,
  setCsvData,
  csvData,
  setCcBccValue,
  alertCcBcc,
  setAlertCcBcc,
  selectedFileName,
  setSelectedFileName,
  onClearFile,
}) {
  const [previewRows, setPreviewRows] = useState(() => csvData.slice(0, 3));
  const fileInputRef = useRef(null);

  const { signIn, isAuthenticated } = useDesktopAuth();

  async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const { headers, data } = await parseFile(file);
    const isValid = validateCsvHeaders(headers);
    const { hasCc, hasBcc } = CcBccValueExists(headers);

    if (!isValid) {
      setCsvData([]);
      setSelectedFileName("");
      setPreviewRows([]);
      setAlertCcBcc("")
      alert("CSV must include an 'Email' or 'RecipientEmail' column.");
      return;
    }

    // checks if CC and/or BCC headers exist in the CSV and alerts if either exist
    const messageCcBcc =
      (hasCc && !hasBcc) ? "CSV contains a 'CC' column. This will be used for CC recipients."
      : (!hasCc && hasBcc) ? "CSV contains a 'BCC' column. This will be used for BCC recipients."
      : (hasCc && hasBcc) ? "CSV contains both 'CC' and 'BCC' columns. These will be used for CC and BCC recipients."
      : "";

    setCsvData(data);
    setSelectedFileName(file.name);
    setPreviewRows(data.slice(0, 3));
    setCcBccValue({ hasCc, hasBcc });
    setAlertCcBcc(messageCcBcc)
  } catch (error) {
    console.error("Error parsing file:", error);
    alert("Error parsing file. Please check the format.");
  }
}

  function clearSelectedFile() {
    onClearFile();
    setPreviewRows([]);
    setAlertCcBcc("")

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main style={{ padding: "30px" }}>
      <h1>Upload files</h1>

      {!isAuthenticated ? (
        <button onClick={signIn} style={{ marginBottom: "20px" }}>
          Sign in with Microsoft
        </button>
      ) : (
        <p style={{ marginBottom: "20px" }}>Successfully signed in with Microsoft</p>
      )}

      <h3>
        <span style={{ color: "red" }}>*</span> Draft emails will be created in the Outlook account used for sign-in <span style={{ color: "red" }}>*</span>
      </h3>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={!isAuthenticated}
      />

      {!isAuthenticated && (
        <p style={{ color: "gray", marginTop: "8px" }}>
          Please read instructions below before uploading a file.
        </p>
      )}

      {selectedFileName && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
          <p>Selected file: {selectedFileName} ({csvData.length} recipient{csvData.length === 1 ? "" : "s"})
            {alertCcBcc && ` - ${alertCcBcc}`}
          </p>
          <button type="button" onClick={clearSelectedFile}>Clear file</button>
        </div>
      )}
      
      <div style={{ border: "1px solid #999", marginTop: "20px", padding: "16px", textAlign: "left", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
        <p>Upload a CSV file to begin</p>
        <ul>
          <li>Ensure your file includes column headers, e.g. FirstName, Email</li>
          <li>Email is a MANDATORY header</li>
          <li>Each row will be used to generate one email</li>
          <li>XLSX file format is not supported!</li>
        </ul>
      </div>

      {previewRows.length > 0 && (
        <div>
          <h2>Preview uploaded data</h2>
          <pre>{JSON.stringify(previewRows, null, 2)}</pre>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
        <button onClick={onNext} disabled={!isAuthenticated || previewRows.length === 0}>
          Next
        </button>
      </div>
    </main>
  );
}

export default UploadPage;
