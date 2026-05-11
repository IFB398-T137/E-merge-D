import { useState } from "react";
import { parseFile } from "../utils/parseFile";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

function UploadPage({ onNext, setCsvData }) {
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState([]);

  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  async function signIn() {
    await instance.loginRedirect(loginRequest);
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const { data, rows } = await parseFile(file);
      const parsedData = (data || rows).slice(0, 3);

      setCsvData(data || rows);
      setPreviewRows(parsedData);
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Error parsing file. Please check the format.");
    }
  }

  return (
    <main style={{ padding: "30px" }}>
      <h1>Submit files</h1>

      {!isAuthenticated ? (
        <button onClick={signIn} style={{ marginBottom: "20px" }}>
          Sign in with Microsoft
        </button>
      ) : (
        <p style={{ marginBottom: "20px" }}>Signed in with Microsoft</p>
      )}

      <h3>
        Upload files <span style={{ color: "red" }}>*</span>
      </h3>

      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileUpload}
        disabled={!isAuthenticated}
      />

      {!isAuthenticated && (
        <p style={{ color: "gray", marginTop: "8px" }}>
          Please sign in before uploading a file.
        </p>
      )}

      {fileName && <p>Uploaded: {fileName}</p>}

      <div style={{ border: "1px solid #999", marginTop: "20px", padding: "16px" }}>
        <p>Upload your CSV or Excel file to begin</p>
        <ul>
          <li>Ensure your file includes column headers, e.g. FirstName, Email</li>
          <li>RecipientEmail is a MANDATORY FIELD</li>
          <li>Each row will be used to generate one email</li>
          <li>Supported formats: .csv, .xlsx, .xls</li>
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