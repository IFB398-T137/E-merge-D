import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import csvAttachments from "./csvAttachments.cjs";
import { parseCSV } from "../src/utils/parseFile.js";
import {
  getRowAttachmentPaths,
  getAttachmentValidationError,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "../src/utils/attachments.js";

const { createCsvAttachmentStore, resolveAttachmentPath } = csvAttachments;
const senderId = 12;

function createStore(options = {}) {
  return createCsvAttachmentStore({
    parseCSV,
    getRowAttachmentPaths,
    getAttachmentValidationError,
    ...options,
  });
}

describe("CSV attachment paths", () => {
  it.each(["F", "G"])("uses the CSV directory on portable drive %s", (drive) => {
    const csvPath = `${drive}:\\Semester1\\Mailout\\students.csv`;
    expect(resolveAttachmentPath(csvPath, "attachments/alice-report.pdf", path.win32))
      .toBe(`${drive}:\\Semester1\\Mailout\\attachments\\alice-report.pdf`);
    expect(resolveAttachmentPath(csvPath, "attachments\\alice-report.pdf", path.win32))
      .toBe(`${drive}:\\Semester1\\Mailout\\attachments\\alice-report.pdf`);
  });

  it("loads a Windows CSV and attachment through the injected Windows filesystem paths", async () => {
    const csvPath = "F:\\Semester1\\Mailout\\students.csv";
    const attachmentPath = "F:\\Semester1\\Mailout\\attachments\\alice-report.pdf";
    const fileSystem = {
      readFile: vi.fn().mockResolvedValueOnce("Email,Attachments\nalice@example.com,attachments/alice-report.pdf\n")
        .mockResolvedValueOnce(Buffer.from("Alice report")),
      stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 12 }),
    };
    const store = createStore({ fileSystem, pathModule: path.win32 });
    const selected = await store.selectCsv(senderId, csvPath);
    const result = await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId, rowIndexes: [0],
    });

    expect(selected.name).toBe("students.csv");
    expect(result.errors).toEqual([]);
    expect(result.attachmentsByRow[0][0].name).toBe("alice-report.pdf");
    expect(fileSystem.stat).toHaveBeenCalledWith(attachmentPath);
    expect(fileSystem.readFile).toHaveBeenCalledWith(attachmentPath);
  });

  it("supports complete absolute paths without changing their drive", () => {
    expect(resolveAttachmentPath("F:\\Mailout\\students.csv", "G:\\Reports\\alice.pdf", path.win32))
      .toBe("G:\\Reports\\alice.pdf");
    expect(resolveAttachmentPath("/mailout/students.csv", "/reports/alice.pdf", path.posix))
      .toBe("/reports/alice.pdf");
  });

  it.each(["F:report.pdf", "F:"])("rejects ambiguous drive-relative path %s", (value) => {
    expect(() => resolveAttachmentPath("F:\\Mailout\\students.csv", value, path.win32))
      .toThrow("Drive-relative paths are not supported");
  });
});

describe("CSV attachment store", () => {
  let directory;
  let csvPath;
  let store;

  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "emerged-csv-"));
    csvPath = path.join(directory, "students.csv");
    store = createStore();
    await fs.mkdir(path.join(directory, "attachments"));
  });

  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });

  async function selectCsv(contents) {
    await fs.writeFile(csvPath, contents);
    return store.selectCsv(senderId, csvPath);
  }

  it("keeps multiple attachments with their original recipient and accepts blank or missing cells", async () => {
    await fs.writeFile(path.join(directory, "attachments", "alice.pdf"), "Alice report");
    await fs.writeFile(path.join(directory, "attachments", "guide.pdf"), "Course guide");
    await fs.writeFile(path.join(directory, "attachments", "bob.pdf"), "Bob report");
    const selected = await selectCsv(
      "RecipientEmail,Attachments\n" +
      "alice@example.com, attachments/alice.pdf ; ; attachments/guide.pdf ;\n" +
      "bob@example.com,attachments\\bob.pdf\n" +
      "charlie@example.com,\n" +
      "dave@example.com\n",
    );

    expect(selected.name).toBe("students.csv");
    expect(selected.headers).toEqual(["RecipientEmail", "Attachments"]);
    expect(JSON.stringify(selected)).not.toContain(directory);
    const result = await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId,
      rowIndexes: [0, 1, 2, 3],
    });

    expect(result.errors).toEqual([]);
    expect(result.attachmentsByRow[0].map((attachment) => attachment.name))
      .toEqual(["alice.pdf", "guide.pdf"]);
    expect(result.attachmentsByRow[1].map((attachment) => attachment.name))
      .toEqual(["bob.pdf"]);
    expect(result.attachmentsByRow[1][0]).toEqual({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: "bob.pdf",
      contentType: "application/octet-stream",
      contentBytes: Buffer.from("Bob report").toString("base64"),
    });
    expect(result.attachmentsByRow[2]).toEqual([]);
    expect(result.attachmentsByRow[3]).toEqual([]);
  });

  it("accepts CSVs without an Attachments column", async () => {
    const selected = await selectCsv("RecipientEmail\nalice@example.com\n");
    expect(await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId, rowIndexes: [0],
    })).toEqual({ attachmentsByRow: { 0: [] }, errors: [] });
  });

  it("reports every invalid file with its row, recipient and CSV path, without returning a partial batch", async () => {
    await fs.writeFile(path.join(directory, "attachments", "empty.pdf"), "");
    await fs.writeFile(path.join(directory, "attachments", "installer.EXE"), "unsafe");
    await fs.writeFile(path.join(directory, "attachments", "large.pdf"), Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES));
    await fs.writeFile(path.join(directory, "attachments", "valid.pdf"), "valid");
    const selected = await selectCsv(
      "RecipientEmail,Attachments\n" +
      "alice@example.com,attachments/missing.pdf;attachments/empty.pdf;attachments/valid.pdf\n" +
      "bob@example.com,attachments/installer.EXE;attachments/large.pdf;attachments\n",
    );

    const result = await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId, rowIndexes: [0, 1],
    });

    expect(result.attachmentsByRow).toEqual({});
    expect(result.errors).toHaveLength(5);
    expect(result.errors[0]).toContain('Recipient row 1 (alice@example.com), attachment "attachments/missing.pdf"');
    expect(result.errors[0]).toContain("does not exist");
    expect(result.errors[1]).toContain("empty");
    expect(result.errors[2]).toContain("Recipient row 2 (bob@example.com)");
    expect(result.errors[2]).toContain("blocked by Outlook");
    expect(result.errors[3]).toContain("smaller than 3 MB");
    expect(result.errors[4]).toContain("regular file");
  });

  it("rejects missing sources, invalid indexes, other senders and stale sources", async () => {
    const selected = await selectCsv("Email,Attachments\nalice@example.com,\n");
    for (const request of [
      { sourceId: selected.sourceId, rowIndexes: [-1] },
      { sourceId: selected.sourceId, rowIndexes: [1] },
      { sourceId: selected.sourceId, rowIndexes: [0.5] },
      { sourceId: selected.sourceId, rowIndexes: ["0"] },
      { sourceId: selected.sourceId },
      null,
    ]) {
      expect((await store.prepareCsvAttachments(senderId, request)).errors).toHaveLength(1);
    }
    const originalRequest = { sourceId: selected.sourceId, rowIndexes: [0] };
    expect((await store.prepareCsvAttachments(senderId + 1, originalRequest)).errors).toHaveLength(1);

    const replacement = await selectCsv("Email\nbob@example.com\n");
    expect((await store.prepareCsvAttachments(senderId, originalRequest)).errors).toHaveLength(1);
    store.clearCsvSource(senderId);
    expect((await store.prepareCsvAttachments(senderId, {
      sourceId: replacement.sourceId, rowIndexes: [0],
    })).errors).toHaveLength(1);
  });

  it("reads only the stored CSV paths and selected rows", async () => {
    await fs.writeFile(path.join(directory, "attachments", "alice.pdf"), "Alice report");
    const selected = await selectCsv(
      "Email,Attachments\nalice@example.com,attachments/alice.pdf\nbob@example.com,missing.pdf\n",
    );
    selected.data[0].Attachments = "malicious-replacement.pdf";
    const result = await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId,
      rowIndexes: [0],
      attachmentPaths: ["another-renderer-path.pdf"],
    });
    expect(result.errors).toEqual([]);
    expect(Object.keys(result.attachmentsByRow)).toEqual(["0"]);
    expect(result.attachmentsByRow[0][0].name).toBe("alice.pdf");
  });

  it("validates size before reading and rechecks the actual bytes after reading", async () => {
    const fakeFileSystem = {
      readFile: vi.fn().mockResolvedValueOnce("Email,Attachments\na@example.com,large.pdf;changed.pdf\n")
        .mockResolvedValue(Buffer.alloc(MAX_ATTACHMENT_SIZE_BYTES)),
      stat: vi.fn().mockResolvedValueOnce({ isFile: () => true, size: MAX_ATTACHMENT_SIZE_BYTES })
        .mockResolvedValueOnce({ isFile: () => true, size: 10 }),
    };
    store = createStore({ fileSystem: fakeFileSystem });
    const selected = await store.selectCsv(senderId, csvPath);
    const result = await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId, rowIndexes: [0],
    });

    expect(result.errors).toHaveLength(2);
    expect(result.errors.every((error) => error.includes("smaller than 3 MB"))).toBe(true);
    expect(fakeFileSystem.readFile.mock.calls).toEqual([
      [csvPath, "utf8"],
      [path.join(directory, "changed.pdf")],
    ]);
  });

  it("reports unreadable files without exposing the absolute directory", async () => {
    const fakeFileSystem = {
      readFile: vi.fn().mockResolvedValueOnce("Email,Attachments\na@example.com,private.pdf\n")
        .mockRejectedValue(Object.assign(new Error(`EACCES: ${directory}`), { code: "EACCES" })),
      stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 10 }),
    };
    store = createStore({ fileSystem: fakeFileSystem });
    const selected = await store.selectCsv(senderId, csvPath);
    const result = await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId, rowIndexes: [0],
    });
    expect(result.errors[0]).toContain("Check its permissions");
    expect(result.errors[0]).not.toContain(directory);
  });

  it("discards prepared attachments when the CSV source is cleared during the read", async () => {
    const fakeFileSystem = {
      readFile: vi.fn().mockResolvedValueOnce("Email,Attachments\na@example.com,report.pdf\n")
        .mockImplementationOnce(async () => {
          store.clearCsvSource(senderId);
          return Buffer.from("report");
        }),
      stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 6 }),
    };
    store = createStore({ fileSystem: fakeFileSystem });
    const selected = await store.selectCsv(senderId, csvPath);
    const result = await store.prepareCsvAttachments(senderId, {
      sourceId: selected.sourceId, rowIndexes: [0],
    });
    expect(result.attachmentsByRow).toEqual({});
    expect(result.errors).toEqual([
      "The CSV source changed while checking attachments. Try creating the drafts again.",
    ]);
  });
});
