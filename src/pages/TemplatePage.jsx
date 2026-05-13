import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";

function TemplatePage({ onBack, onNext }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Edit/Create your template here...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: "<p></p>",
  });

  if (!editor) return null;

  const btn = (active) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    background: active ? "#e6f0ff" : "white",
    cursor: "pointer",
  });

  const toolbar = {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    marginTop: "10px",
    background: "#f9f9f9",
  };

  const editorBox = {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "12px",
    minHeight: "400px",
    marginTop: "10px",
    background: "#fff",
  };

  return (
    <div>
      <h1>Template Page</h1>

      <button onClick={onBack}>Back</button>
      <button onClick={onNext}>Next</button>

      <div style={{ margin: "10px" }}>
        <button>Create Template</button>
        <button>Upload Template</button>
      </div>

      <div style={toolbar}>
        <button
          style={btn(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </button>

        <button
          style={btn(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </button>

        <button
          style={btn(editor.isActive("underline"))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={16} />
        </button>

        <button
          style={btn(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </button>

        <button
          style={btn(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </button>

        <button
          style={btn(editor.isActive("heading", { level: 1 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={16} />
        </button>

        <button
          style={btn(editor.isActive("heading", { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </button>

        <button
          style={btn(false)}
          onClick={() => {
            const url = prompt("Enter URL");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
        >
          <LinkIcon size={16} />
        </button>

        <button
          style={btn(editor.isActive({ textAlign: "left" }))}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={16} />
        </button>

        <button
          style={btn(editor.isActive({ textAlign: "center" }))}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={16} />
        </button>

        <button
          style={btn(editor.isActive({ textAlign: "right" }))}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={16} />
        </button>

        <button
          style={btn(editor.isActive({ textAlign: "justify" }))}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify size={16} />
        </button>

        <button
          style={btn(false)}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo size={16} />
        </button>

        <button
          style={btn(false)}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo size={16} />
        </button>
      </div>

      <div style={editorBox}>
        <EditorContent editor={editor} />
      </div>

      <div style={{ marginLeft: "900px", margin: "10px" }}>
        <button>Save Template</button>
      </div>

      <style>{`
        .ProseMirror {
          color: #000 !important;
          text-align: left !important;
          outline: none !important;
        }

        .ProseMirror p {
          color: #000 !important;
          text-align: left !important;
        }

        .ProseMirror:focus {
          outline: 2px solid #000 !important;
        }
      `}</style>
    </div>
  );
}

export default TemplatePage;