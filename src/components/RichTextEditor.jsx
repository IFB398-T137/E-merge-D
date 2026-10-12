import { useEffect, useRef, useImperativeHandle } from "react";
import "./RichTextEditor.css";

function RichTextEditor({ value, onChange, ariaLabel = "Email content", autoFocus = false, ref }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  useImperativeHandle(ref, () => ({
    insertContent: (text) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editor.innerHTML += text;
      }

      onChange(editor.innerHTML);
    }
  }));

  function format(command, commandValue = null) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || "");
  }

  function addLink() {
    const url = window.prompt("Enter the link URL");
    if (url) format("createLink", url);
  }

  function formatButton(label, command, commandValue = null, children = label) {
    return (
      <button
        key={label}
        type="button"
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
