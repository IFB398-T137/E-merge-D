import { afterEach, describe, expect, it, vi } from "vitest";
import { createOutlookDraft } from "./outlookDrafts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createOutlookDraft", () => {
  it("includes selected attachments in the Microsoft Graph message", async () => {
    const graphAttachment = {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: "notes.txt",
      contentType: "text/plain",
      contentBytes: "aGVsbG8=",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "draft-id" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createOutlookDraft("access-token", {
      to: "recipient@example.com",
      subject: "Subject",
      htmlBody: "<p>Hello</p>",
      attachments: [graphAttachment],
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body).attachments).toEqual([graphAttachment]);
  });

  it("omits the attachments property when no files are selected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "draft-id" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createOutlookDraft("access-token", {
      to: "recipient@example.com",
      subject: "Subject",
      htmlBody: "<p>Hello</p>",
    });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).not.toHaveProperty("attachments");
  });
});
