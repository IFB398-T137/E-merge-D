// uploading data
// (pulled from Upload-Page-Build)

import { useState } from "react";
function UploadPage({ onNext, setCsvData }) {
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  function parseCsv(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((header) => header.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((value) => value.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });
  }
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsedData = parseCsv(text).slice(0, 3);
      setCsvData(parsedData);
      setPreviewRows(parsedData);
    };
    reader.readAsText(file);
  }
  return (
    <main style={{ padding: "30px" }}>
      <h1>Submit files</h1>
      <h3>
        Upload files <span style={{ color: "red" }}>*</span>
      </h3>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {fileName && <p>Uploaded: {fileName}</p>}
      <div style={{ border: "1px solid #999", marginTop: "20px", padding: "16px" }}>
        <p>Upload your CSV file to begin</p>
        <ul>
          <li>Ensure your file includes column headers, e.g. FirstName, Email</li>
          <li>RecipientEmail is a MANDATORY FIELD</li>
          <li>Each row will be used to generate one email</li>
          <li>Supported format for now: .csv</li>
        </ul>
      </div>
      {previewRows.length > 0 && (
        <div>
          <h2>Preview uploaded data</h2>
          <pre>{JSON.stringify(previewRows, null, 2)}</pre>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
        <button onClick={onNext} disabled={previewRows.length === 0}>
          Next
        </button>
      </div>
    </main>
  );
}
export default UploadPage;