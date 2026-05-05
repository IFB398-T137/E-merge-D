
import { mergeContent } from '../utils/mergingFunc';
import { useState } from 'react';

function PreviewPage({ csvData, body, onBack }) {
  const [selectedRow, setSelectedRow] = useState(0)

  const merged = csvData.map(row => ({ to: row.RecipientEmail, subject: mergeContent(body, row) }))
  
  return (
    <div>
  <h1>Preview Page</h1>
    <p>{merged.length} recipients</p>
    {merged.map((item, index) => (
      <div key={index} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
        onClick={() => setSelectedRow(index)}
        {mergeContent.to}
      </div>
    ))}


    <div>
      <p style={{ fontSize: '12px', color: 'gray' }}>
        Previewing {selectedRow + 1} of {merged.length}
      </p>
      dangerouslySetInnerHTML={{ __html: merged[selectedRow]?.content }}
    </div>



    <button onClick={onBack}>Back</button>
    </div>
  );
}

export default PreviewPage;