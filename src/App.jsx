import { useState } from "react";
import UploadPage from "./pages/UploadPage";
import TemplatePage from "./pages/TemplatePage";
import PreviewPage from "./pages/PreviewPage";

function App() {
  const [currentPage, setCurrentPage] = useState("upload");
  const [csvData, setCsvData] = useState([]);
  const [body, setBody] = useState("");

  return (
    <div>
      {currentPage === "upload" && (
        <UploadPage onNext={() => setCurrentPage("template")}
        setCsvData={setCsvData}/>
      )}

      {currentPage === "template" && (
        <TemplatePage
          onBack={() => setCurrentPage("upload")}
          onNext={(templateBody) => {
            setBody(templateBody);
            setCurrentPage("preview");
          }}
          initialContent={body}
        />
      )}

      {currentPage === "preview" && (
        <PreviewPage 
        csvData={csvData}
        body={body}
        onBack={() => setCurrentPage("template")} />
      )}

      
    </div>
  );
}

export default App;