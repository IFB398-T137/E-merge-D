import { useState } from "react";
import { mergeContent } from "../utils/mergingFunc";

function PreviewPage({ csvData, body, onBack }) {
  const [selectedRow, setSelectedRow] = useState(0);

  const merged = csvData.map((row) => ({
    to: row.RecipientEmail,
    content: mergeContent(body, row),
  }));

  return (
    <div>
      <h1>Preview Page</h1>

      <div style={{ display: "flex", gap: "1.5rem" }}>

        {/* All recipient listed */}
        <div>
          <p style={{ fontSize: "13px", fontWeight: "500", marginBottom: "8px" }}>
            {merged.length} recipients
          </p>
          {merged.map((item, index) => (
            <div
              key={index}
              onClick={() => setSelectedRow(index)}
              style={{
                padding: "7px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                background: selectedRow === index ? "#f0f4ff" : "transparent",
                border: "1px solid #eee",
                marginBottom: "6px"
              }}
            >
              {item.to}
            </div>
          ))}
        </div>

        {/* Merged preview showing in a panel */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "12px", color: "gray", marginBottom: "8px" }}>
            Previewing {selectedRow + 1} of {merged.length}
          </p>
          <div
            style={{
              border: "1px solid #eee",
              minHeight: "300px"
            }}
            dangerouslySetInnerHTML={{ __html: merged[selectedRow]?.content }}
          />
        </div>

      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
        <button onClick={onBack}>Back</button>
        <button>Send this email only</button>
        <button>Send all to Outlook drafts</button>
      </div>
    </div>
  );
}

export default PreviewPage;