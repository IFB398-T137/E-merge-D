import { useEffect, useRef, useState } from "react";
import { parseFile } from "../utils/parseFile";
import { getCsvValidationError, CsvHeaderFields } from "../utils/validateCsv";
import { getCsvWarnings } from "../utils/csvWarnings";
import { useDesktopAuth } from "../auth/DesktopAuthContext.jsx";
import "./UploadPage.css";

function UploadPage({
  onNext,
  csvData,
  csvWarnings,
  setCsvWarnings,
  setCsvData,
  setCsvHeaderFields,
  alertCcBcc,
  setAlertCcBcc,
  selectedFileName,
  setSelectedFileName,
  setCsvSourceId,
  onClearFile,
}) {
  const [previewRows, setPreviewRows] = useState(() => csvData.slice(0, 3));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const uploadMessageRef = useRef(null);
  const uploadWarningsRef = useRef(null);
  const previewColumns = Object.keys(previewRows[0] ?? {});
  const hasDesktopPicker = Boolean(window.eMergeDFiles?.selectCsv);
  const showUploadMessage = Boolean(uploadError) || !selectedFileName;

  const { signIn, isAuthenticated } = useDesktopAuth();

  useEffect(() => {
    if (uploadError) uploadMessageRef.current?.scrollIntoView({ block: "nearest" });
    else if (csvWarnings.length) uploadWarningsRef.current?.scrollIntoView({ block: "start" });
  }, [uploadError, csvWarnings]);

  function acceptCsv({ headers, data, name, sourceId = null, attachmentIssues, attachmentsChecked }) {
    const validationError = getCsvValidationError({ headers, data });
    if (validationError) throw new Error(validationError);

    const { hasCc, hasBcc } = CsvHeaderFields(headers);
    // checks if CC and/or BCC headers exist in the CSV and alerts if either exist
    const messageCcBcc =
      (hasCc && !hasBcc) ? "CSV contains a 'CC' column. This will be used for CC recipients."
      : (!hasCc && hasBcc) ? "CSV contains a 'BCC' column. This will be used for BCC recipients."
      : (hasCc && hasBcc) ? "CSV contains both 'CC' and 'BCC' columns. These will be used for CC and BCC recipients."
      : "";

    setCsvData(data);
    setSelectedFileName(name);
    setCsvSourceId(sourceId);
    setCsvWarnings(getCsvWarnings({ data, attachmentIssues, attachmentsChecked }));
    setPreviewRows(data.slice(0, 3));
    setCsvHeaderFields({ hasCc, hasBcc });
    setAlertCcBcc(messageCcBcc);
  }

  async function loadCsv(selectFile) {
    setIsUploading(true);
    try {
      const selection = await selectFile();
      if (selection) {
        acceptCsv(selection);
        setUploadError("");
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      const message = error.message?.replace(/^Error invoking remote method 'files:select-csv': (?:Error: )?/, "");
      await clearSelectedFile(message || "Unable to read the CSV file. Check the file and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    await loadCsv(async () => ({ ...await parseFile(file), name: file.name }));
  }

  async function clearSelectedFile(errorMessage = "") {
    onClearFile();
    setPreviewRows([]);
    setUploadError(errorMessage);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    try {
      await window.eMergeDFiles?.clearCsvSource?.();
    } catch (error) {
      console.error("Unable to clear CSV source:", error);
      setUploadError(`${errorMessage ? `${errorMessage} ` : ""}Unable to clear the CSV location. Select the CSV again before continuing.`);
    }
  }

  return (
    <main className="upload-page workflow-page">
      <div className="workflow-content" role="region" aria-label="Upload details" tabIndex={0}>
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

        {hasDesktopPicker ? (
          <button
            type="button"
            onClick={() => loadCsv(() => window.eMergeDFiles.selectCsv())}
            disabled={!isAuthenticated || isUploading}
            aria-describedby={showUploadMessage ? "csv-upload-message" : undefined}
          >
            {isUploading ? "Reading CSV…" : "Choose CSV file"}
          </button>
        ) : <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={!isAuthenticated || isUploading}
          aria-invalid={Boolean(uploadError)}
          aria-describedby={showUploadMessage ? "csv-upload-message" : undefined}
        />}

        {showUploadMessage && (
          <p
            ref={uploadMessageRef}
            id="csv-upload-message"
            className="upload-message"
            role={uploadError ? "alert" : undefined}
          >
            {uploadError ? `Upload failed: ${uploadError}` : "Please read instructions below before uploading a file."}
          </p>
        )}

        {selectedFileName && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
            <p>Selected file: {selectedFileName} ({csvData.length} recipient{csvData.length === 1 ? "" : "s"})
              {alertCcBcc && ` - ${alertCcBcc}`}
            </p>
            <button type="button" onClick={() => clearSelectedFile()} disabled={isUploading}>Clear file</button>
          </div>
        )}

        {csvWarnings.length > 0 && (
          <section ref={uploadWarningsRef} className="upload-warnings" aria-label="CSV warnings">
            <p className="upload-warning-heading" role="status">
              <span aria-hidden="true">⚠</span> Warnings — you can still continue
            </p>
            {csvWarnings.map((warning) => (
              <div className="upload-warning" key={warning.id}>
                <p><strong>{warning.title}</strong></p>
                <p>{warning.description}</p>
                {warning.details.length > 0 && (
                  <details>
                    <summary>Show affected recipient rows</summary>
                    <ul>{warning.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>
                  </details>
                )}
              </div>
            ))}
          </section>
        )}

        <div style={{ border: "1px solid #999", marginTop: "20px", padding: "16px", textAlign: "left", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
          <p>Upload a CSV file to begin</p>
          <ul>
            <li>Ensure your file includes column headers, e.g. FirstName, Email</li>
            <li>Email or RecipientEmail is a MANDATORY header</li>
            <li>Each row will be used to generate one email</li>
            <li>Attachments can be added by including a file path relative to the CSV folder under a header named &apos;Attachments&apos;.</li>
            <li>XLSX file format is not supported!</li>
          </ul>
        </div>

        {previewRows.length > 0 && (
          <section className="upload-preview" aria-labelledby="upload-preview-title">
            <div className="upload-preview-heading">
              <h2 id="upload-preview-title">Preview uploaded data</h2>
              <p id="upload-preview-summary">
                Preview here is limited to the first 3 data rows. Your file contains {csvData.length} recipient{csvData.length === 1 ? "" : "s"} in total.
              </p>
            </div>
            <div
              className="upload-preview-scroll"
              role="region"
              aria-labelledby="upload-preview-title"
              tabIndex={0}
            >
              <table aria-labelledby="upload-preview-title" aria-describedby="upload-preview-summary">
                <thead>
                  <tr>
                    <th scope="col" className="upload-preview-row-number">Row</th>
                    {previewColumns.map((column) => (
                      <th scope="col" key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={index}>
                      <th scope="row" className="upload-preview-row-number">{index + 1}</th>
                      {previewColumns.map((column) => (
                        <td key={column}>
                          {row[column] === "" || row[column] == null
                            ? <span className="upload-preview-empty" aria-label="Empty">—</span>
                            : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <footer className="upload-actions workflow-footer">
        <button onClick={onNext} disabled={!isAuthenticated || isUploading || previewRows.length === 0}>
          Next
        </button>
      </footer>
    </main>
  );
}

export default UploadPage;
