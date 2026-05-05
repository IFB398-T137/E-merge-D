//

import { useState } from 'react';

function TemplatePage({ onNext, onBack }) {
  const [body, setBody] = useState('')

    return (
      <div>
        <h1>Template Page</h1>
        <p style={{ fontSize: '13px', color: 'gray' }}>
        Use {`{{ColumnHeader}}`} to insert data from your CSV. For example: {`{{First_name}}`}, {`{{Email}}`}
        </p>
        <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        />
        <button onClick={onBack}>Back</button>
        <button onClick={() => onNext(body)} disabled={!body}>Next</button>
      </div>
    );

}

export default TemplatePage;