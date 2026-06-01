import { useState } from "react";
import { parseFile } from "../utils/parseFile";
import { validateCsvHeaders } from "../utils/validateCsv";

import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

function UploadPage({ onNext, setCsvData }) {
  const [fileName, setFileName] = useState("");
  const [previewRows, setPreviewRows] = useState([]);

  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  async function signIn() {
    await instance.loginRedirect({
      ...loginRequest,
      redirectStartPage: window.location.href,
    });
  }

  async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  setFileName(file.name);

  try {
    const { headers, data } = await parseFile(file);

    const isValid = validateCsvHeaders(headers);

    if (!isValid) {
      setCsvData([]);
      setPreviewRows([]);
      alert("CSV must include an Email or RecipientEmail column.");
      return;
    }

    setCsvData(data);
    setPreviewRows(data.slice(0, 3));
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
        Draft emails will be created in the Outlook account used for sign-in <span style={{ color: "red" }}>*</span>
      </h3>

      <input
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

      {fileName && <p>Uploaded: {fileName}</p>}

      <div style={{ border: "1px solid #999", marginTop: "20px", padding: "16px" }}>
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
