// yet to be pulled from Template-Page-Build, but will be similar to the following:

import { useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';

function TemplatePage({ onNext, onBack, initialContent = '', initialSubject = '' }) {
  const [content, setContent] = useState(initialContent)
  const [subject, setSubject] = useState(initialSubject)

    return (
      <div>
        <h1>Template Page</h1>
        
        <p style={{ fontSize: '13px', color: 'gray' }}>
        Use {`{{ColumnHeader}}`} to insert data from your CSV. For example: {`{{First_name}}`}, {`{{Email}}`}
        </p>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', marginBottom: '4px' }}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>

        <Editor
          apiKey="xgdtchyq1403e6xh20lgcepw0oidyr7ny78r4gr0g6bmuvk3"
          value={content}
          onEditorChange={(newValue) => setContent(newValue)}
        />

        <button onClick={onBack}>Back</button>
        <button onClick={() => onNext(content, subject)} disabled={!content}>Next</button>
        
      </div>
    );

}

export default TemplatePage;