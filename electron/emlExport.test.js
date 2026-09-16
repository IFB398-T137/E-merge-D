import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import emlExport from "./emlExport.cjs";

const { exportEmlFiles } = emlExport;
const temporaryFolders = [];

async function createExportFolder() {
  const folder = await mkdtemp(path.join(tmpdir(), "emerged-eml-"));
  temporaryFolders.push(folder);
  return folder;
}

function attachment(name, contentBytes = "aGVsbG8=") {
  return { name, contentType: "text/plain", contentBytes };
}

afterEach(async () => {
  await Promise.all(temporaryFolders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

describe("exportEmlFiles attachments", () => {
  it("exports each recipient's combined attachments without sharing row files or duplicating globals", async () => {
    const folder = await createExportFolder();
    const globalFile = attachment("course-guide.txt");
    const emails = [
      { to: "alice@example.com", content: "Alice", attachments: [globalFile, attachment("alice.txt", "YWxpY2U=")] },
      { to: "bob@example.com", content: "Bob", attachments: [globalFile, attachment("bob.txt", "Ym9i")] },
    ];

    await exportEmlFiles(folder, emails, "Reports", [globalFile]);

    const alice = await readFile(path.join(folder, "001-alice@example.com.eml"), "utf8");
    const bob = await readFile(path.join(folder, "002-bob@example.com.eml"), "utf8");
    expect(alice.match(/Content-Disposition: attachment; filename="course-guide.txt"/g)).toHaveLength(1);
    expect(bob.match(/Content-Disposition: attachment; filename="course-guide.txt"/g)).toHaveLength(1);
    expect(alice).toContain('filename="alice.txt"');
    expect(alice).toContain("YWxpY2U=");
    expect(alice).not.toContain('filename="bob.txt"');
    expect(bob).toContain('filename="bob.txt"');
    expect(bob).not.toContain('filename="alice.txt"');
  });

  it("preserves shared attachments for legacy callers", async () => {
    const folder = await createExportFolder();
    await exportEmlFiles(folder, [{ to: "alice@example.com", content: "Hello" }], "Subject", [attachment("global.txt")]);

    const eml = await readFile(path.join(folder, "001-alice@example.com.eml"), "utf8");
    expect(eml).toContain('filename="global.txt"');
  });

  it("exports messages with no attachments when neither attachment input is supplied", async () => {
    const folder = await createExportFolder();
    await exportEmlFiles(folder, [{ to: "alice@example.com", content: "Hello" }], "Subject");

    const eml = await readFile(path.join(folder, "001-alice@example.com.eml"), "utf8");
    expect(eml).toContain('Content-Type: text/html; charset="UTF-8"');
    expect(eml).not.toContain("Content-Disposition: attachment");
  });
});
