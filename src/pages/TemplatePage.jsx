// yet to be pulled from Template-Page-Build, but will be similar to the following:

import { useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';

function TemplatePage({ onNext, onBack, initialContent = '' }) {
  const [content, setContent] = useState(initialContent)

    return (
      <div>
        <h1>Template Page</h1>
        
        <p style={{ fontSize: '13px', color: 'gray' }}>
        Use {`{{ColumnHeader}}`} to insert data from your CSV. For example: {`{{First_name}}`}, {`{{Email}}`}
        </p>
        <Editor
          apiKey="xgdtchyq1403e6xh20lgcepw0oidyr7ny78r4gr0g6bmuvk3"
          value={content}
          onEditorChange={(newValue) => setContent(newValue)}
        />

        <button onClick={onBack}>Back</button>
        <button onClick={() => onNext(content)} disabled={!content}>Next</button>
        
      </div>
    );

}

export default TemplatePage;