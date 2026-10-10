import { useEffect, useRef } from "react";
import "./RichTextEditor.css";

function RichTextEditor({ value, onChange, ariaLabel = "Email content", autoFocus = false }) {
  const editorRef = useRef(null);
  const linkDialogRef = useRef(null);
  const linkInputRef = useRef(null);
  const linkSelectionRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  function format(command, commandValue = null) {
    editorRef.current?.focus();
    // removeFormat only clears inline styles, so reset block formatting too.
    if (command === "removeFormat") document.execCommand("formatBlock", false, "p");
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
  }

  function addLink() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const selectedRange = selection.rangeCount ? selection.getRangeAt(0) : null;
    const range = document.createRange();

    if (selectedRange && editor.contains(selectedRange.commonAncestorContainer)) {
      linkSelectionRef.current = selectedRange.cloneRange();
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
      linkSelectionRef.current = range;
    }

    linkInputRef.current.value = "";
    linkDialogRef.current.showModal();
    linkInputRef.current.focus();
  }

  function closeLinkDialog() {
    linkDialogRef.current.close();
    editorRef.current.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(linkSelectionRef.current);
    linkSelectionRef.current = null;
  }

  function insertLink(event) {
    event.preventDefault();
    const input = linkInputRef.current;
    const url = input.value.trim();
    if (!url) {
      input.setCustomValidity("Enter a link URL.");
      input.reportValidity();
      return;
    }
    closeLinkDialog();
    format("createLink", url);
  }

  function formatButton(label, command, commandValue = null, children = label) {
    return (
      <button
        key={label}
        type="button"
        aria-label={label}
        title={label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => format(command, commandValue)}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" aria-label="Text formatting controls">
        {formatButton("Bold", "bold", null, <strong>B</strong>)}
        {formatButton("Italic", "italic", null, <em>I</em>)}
        {formatButton("Underline", "underline", null, <u>U</u>)}
        {formatButton("Heading", "formatBlock", "h2")}
        {formatButton("Bullets", "insertUnorderedList")}
        {formatButton("Numbered list", "insertOrderedList")}
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={addLink}>Link</button>
        {formatButton("Clear formatting", "removeFormat")}
      </div>

      <dialog
        ref={linkDialogRef}
        className="rich-text-link-dialog"
        aria-label="Insert link"
        onCancel={(event) => {
          event.preventDefault();
          closeLinkDialog();
        }}
      >
        <form onSubmit={insertLink}>
          <label>
            Link URL
            <input
              ref={linkInputRef}
              type="text"
              inputMode="url"
              placeholder="https://example.com or {{Website}}"
              required
              onInput={(event) => event.currentTarget.setCustomValidity("")}
            />
          </label>
          <p>Selected text becomes the link. With no selection, the URL is inserted.</p>
          <div className="rich-text-link-actions">
            <button type="button" onClick={closeLinkDialog}>Cancel</button>
            <button type="submit">Insert link</button>
          </div>
        </form>
      </dialog>

      <div
        ref={editorRef}
        className="rich-text-content"
        contentEditable
        suppressContentEditableWarning
        aria-label={ariaLabel}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}

export default RichTextEditor;
