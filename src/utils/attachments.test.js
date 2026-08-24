import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  fileToGraphAttachment,
  formatFileSize,
  getAttachmentValidationError,
  validateAttachmentSelection,
} from "./attachments";

function createFile({
  name = "document.pdf",
  size = 1024,
  type = "application/pdf",
  contents = "test",
} = {}) {
  return {
    name,
    size,
    type,
    lastModified: 1,
    arrayBuffer: async () => new TextEncoder().encode(contents).buffer,
  };
}

describe("attachment validation", () => {
  it("accepts a non-empty file smaller than 3 MB", () => {
    expect(getAttachmentValidationError(createFile())).toBeNull();
  });

  it("rejects empty files", () => {
    expect(getAttachmentValidationError(createFile({ size: 0 }))).toContain("empty");
  });

  it("rejects files at or above the Microsoft Graph small-attachment limit", () => {
    const file = createFile({ size: MAX_ATTACHMENT_SIZE_BYTES });

    expect(getAttachmentValidationError(file)).toContain("smaller than 3 MB");
  });

  it("rejects blocked Outlook file extensions without case sensitivity", () => {
    const file = createFile({ name: "installer.EXE" });

    expect(getAttachmentValidationError(file)).toContain("blocked by Outlook");
  });

  it("separates valid and invalid files", () => {
    const validFile = createFile();
    const invalidFile = createFile({ name: "script.js" });

    expect(validateAttachmentSelection([validFile, invalidFile])).toEqual({
      validFiles: [validFile],
      errors: ["script.js is an unsafe file type blocked by Outlook."],
    });
  });
});

describe("Graph attachment conversion", () => {
  it("converts a file to a base64 Microsoft Graph fileAttachment", async () => {
    const result = await fileToGraphAttachment(
      createFile({ name: "notes.txt", type: "text/plain", contents: "hello" }),
    );

    expect(result).toEqual({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: "notes.txt",
      contentType: "text/plain",
      contentBytes: "aGVsbG8=",
    });
  });

  it("formats attachment sizes for display", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
