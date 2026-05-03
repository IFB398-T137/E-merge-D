function TemplatePage({ onBack, onNext }) {
    return (
      <div>
        <h1>Template Page</h1>
        <button onClick={onBack}>Back</button>
        <button onClick={onNext}>Next</button>
      </div>
    );

}

export default TemplatePage;