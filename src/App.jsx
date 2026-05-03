import { useState } from "react";
import UploadPage from "./pages/UploadPage";
import TemplatePage from "./pages/TemplatePage";
import PreviewPage from "./pages/PreviewPage";

function App() {
  const [currentPage, setCurrentPage] = useState("upload");

  return (
    <div>
      {currentPage === "upload" && (
        <UploadPage onNext={() => setCurrentPage("template")} />
      )}

      {currentPage === "template" && (
        <TemplatePage
          onBack={() => setCurrentPage("upload")}
          onNext={() => setCurrentPage("preview")}
        />
      )}

      {currentPage === "preview" && (
        <PreviewPage onBack={() => setCurrentPage("template")} />
      )}
    </div>
  );
}

export default App;