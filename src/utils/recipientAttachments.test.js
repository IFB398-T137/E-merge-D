import { afterEach, describe, expect, it, vi } from "vitest";
import { getRowAttachmentPaths, prepareEmailAttachments } from "./attachments";
import { createOutlookDraft } from "./outlookDrafts";

function createGlobalFile(name, contents) {
  const bytes = new TextEncoder().encode(contents);
  return {
    name,
    type: "text/plain",
    size: bytes.length,
    arrayBuffer: async () => bytes.buffer,
  };
}

function createGraphAttachment(name, contentBytes = "dGVzdA==") {
  return {
    "@odata.type": "#microsoft.graph.fileAttachment",
    name,
    contentType: "application/pdf",
    contentBytes,
  };
}

function createEmail(rowIndex, to, attachmentPaths = []) {
  return {
    rowIndex,
    to,
    subject: "Your report",
    htmlBody: "<p>Please find your report attached.</p>",
    attachmentPaths,
  };
}

function mockGraphFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id: "draft-id" }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Mirrors the batch boundary used by Preview: prepare all files before any POST.
async function prepareAndCreateDrafts(options) {
  const emails = await prepareEmailAttachments(options);
  return Promise.all(emails.map((email) => createOutlookDraft("access-token", email)));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recipient attachment cell parsing", () => {
  it.each([
    undefined,
    {},
    { FirstName: "Alice" },
    { Attachments: undefined },
    { Attachments: null },
    { Attachments: "" },
    { Attachments: "  ; ;\t; " },
  ])("accepts a missing or blank Attachments cell: %j", (row) => {
    expect(getRowAttachmentPaths(row)).toEqual([]);
  });

  it("splits semicolon-separated paths, trims whitespace, and ignores empty entries", () => {
    expect(getRowAttachmentPaths({
      Attachments: " attachments/alice report.pdf ; ; attachments/course-guide.pdf; ",
    })).toEqual(["attachments/alice report.pdf", "attachments/course-guide.pdf"]);
  });

  it("recognizes the Attachments header without case sensitivity", () => {
    expect(getRowAttachmentPaths({
      " aTTacHMenTs ": "attachments\\alice.pdf;attachments/bob.pdf",
    })).toEqual(["attachments\\alice.pdf", "attachments/bob.pdf"]);
  });
});

describe("recipient attachment Graph draft integration", () => {
  it("combines every global file with only each recipient's own files", async () => {
    const fetchMock = mockGraphFetch();
    const aliceReport = createGraphAttachment("alice-report.pdf", "YWxpY2U=");
    const aliceGuide = createGraphAttachment("alice-guide.pdf", "YWxpY2UtZ3VpZGU=");
    const bobReport = createGraphAttachment("bob-report.pdf", "Ym9i");
    const fileApi = {
      prepareCsvAttachments: vi.fn().mockResolvedValue({
        attachmentsByRow: { 0: [aliceReport, aliceGuide], 1: [bobReport] },
        errors: [],
      }),
    };
    const globalFiles = [
      createGlobalFile("welcome.txt", "welcome"),
      createGlobalFile("instructions.txt", "instructions"),
    ];
    const emails = [
      createEmail(0, "alice@example.com", ["attachments/alice-report.pdf", "attachments/alice-guide.pdf"]),
      createEmail(1, "bob@example.com", ["attachments/bob-report.pdf"]),
      createEmail(2, "charlie@example.com"),
    ];

    await prepareAndCreateDrafts({ emails, globalFiles, csvSourceId: "csv-source", fileApi });

    expect(fileApi.prepareCsvAttachments).toHaveBeenCalledExactlyOnceWith({
      sourceId: "csv-source",
      rowIndexes: [0, 1],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const payloads = fetchMock.mock.calls.map(([url, options]) => {
      expect(url).toBe("https://graph.microsoft.com/v1.0/me/messages");
      expect(options.method).toBe("POST");
      return JSON.parse(options.body);
    });
    const globals = [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: "welcome.txt",
        contentType: "text/plain",
        contentBytes: "d2VsY29tZQ==",
      },
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: "instructions.txt",
        contentType: "text/plain",
        contentBytes: "aW5zdHJ1Y3Rpb25z",
      },
    ];

    expect(payloads.map((payload) => payload.toRecipients[0].emailAddress.address)).toEqual([
      "alice@example.com", "bob@example.com", "charlie@example.com",
    ]);
    expect(payloads[0].attachments).toEqual([...globals, aliceReport, aliceGuide]);
    expect(payloads[1].attachments).toEqual([...globals, bobReport]);
    expect(payloads[2].attachments).toEqual(globals);
    expect(emails.every((email) => !Object.hasOwn(email, "attachments"))).toBe(true);
  });

  it("keeps the original CSV row index when creating only a selected recipient", async () => {
    const fetchMock = mockGraphFetch();
    const selectedReport = createGraphAttachment("selected-report.pdf");
    const fileApi = {
      prepareCsvAttachments: vi.fn().mockResolvedValue({
        attachmentsByRow: { 7: [selectedReport] },
        errors: [],
      }),
    };

    await prepareAndCreateDrafts({
      emails: [createEmail(7, "selected@example.com", ["attachments/selected-report.pdf"])],
      csvSourceId: "csv-source",
      fileApi,
    });

    expect(fileApi.prepareCsvAttachments).toHaveBeenCalledExactlyOnceWith({
      sourceId: "csv-source",
      rowIndexes: [7],
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).attachments).toEqual([selectedReport]);
  });

  it("continues creating global-only drafts without an Electron API or CSV source", async () => {
    const fetchMock = mockGraphFetch();

    await prepareAndCreateDrafts({
      emails: [createEmail(0, "alice@example.com"), createEmail(1, "bob@example.com")],
      globalFiles: [createGlobalFile("shared.txt", "shared")],
      fileApi: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(JSON.parse(options.body).attachments).toEqual([{
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: "shared.txt",
        contentType: "text/plain",
        contentBytes: "c2hhcmVk",
      }]);
    }
  });

  it("omits Graph attachments when both the global selection and CSV cells are blank", async () => {
    const fetchMock = mockGraphFetch();
    const fileApi = { prepareCsvAttachments: vi.fn() };

    await prepareAndCreateDrafts({
      emails: [createEmail(0, "alice@example.com")],
      fileApi,
    });

    expect(fileApi.prepareCsvAttachments).not.toHaveBeenCalled();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("attachments");
  });

  it("ignores an unexpected returned row for a recipient whose attachment cell is blank", async () => {
    const fetchMock = mockGraphFetch();
    const aliceReport = createGraphAttachment("alice-report.pdf");
    const fileApi = {
      prepareCsvAttachments: vi.fn().mockResolvedValue({
        attachmentsByRow: {
          0: [aliceReport],
          1: [createGraphAttachment("unexpected-report.pdf")],
        },
        errors: [],
      }),
    };

    await prepareAndCreateDrafts({
      emails: [
        createEmail(0, "alice@example.com", ["attachments/alice-report.pdf"]),
        createEmail(1, "bob@example.com"),
      ],
      csvSourceId: "csv-source",
      fileApi,
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).attachments).toEqual([aliceReport]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty("attachments");
  });
});

describe("CSV attachment preflight failures", () => {
  const emails = [
    createEmail(0, "alice@example.com"),
    createEmail(1, "bob@example.com", ["attachments/bob-report.pdf"]),
  ];

  it("prevents every Graph call when the desktop file API is unavailable", async () => {
    const fetchMock = mockGraphFetch();

    await expect(prepareAndCreateDrafts({ emails, csvSourceId: "csv-source", fileApi: null }))
      .rejects.toThrow("CSV attachments require the E-merge-D desktop app");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires the selected CSV's retained source before reading any row files", async () => {
    const fetchMock = mockGraphFetch();
    const fileApi = { prepareCsvAttachments: vi.fn() };

    await expect(prepareAndCreateDrafts({ emails, fileApi }))
      .rejects.toThrow("Select the CSV again on the Upload page");

    expect(fileApi.prepareCsvAttachments).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retains all row, recipient, and file context when reporting multiple validation errors", async () => {
    const fetchMock = mockGraphFetch();
    const errors = [
      'Row 2 (alice@example.com), "attachments/alice.pdf": file does not exist.',
      'Row 3 (bob@example.com), "attachments/bob.exe": unsafe file type blocked by Outlook.',
      'Row 3 (bob@example.com), "attachments/large.pdf": attachments must be smaller than 3 MB.',
    ];
    const fileApi = {
      prepareCsvAttachments: vi.fn().mockResolvedValue({ attachmentsByRow: {}, errors }),
    };

    await expect(prepareAndCreateDrafts({ emails, csvSourceId: "csv-source", fileApi }))
      .rejects.toThrow(`CSV attachment validation failed:\n${errors.join("\n")}`);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not generate drafts when the retained CSV source has expired", async () => {
    const fetchMock = mockGraphFetch();
    const fileApi = {
      prepareCsvAttachments: vi.fn().mockResolvedValue({
        attachmentsByRow: {},
        errors: ["This CSV source is no longer available. Select the CSV again."],
      }),
    };

    await expect(prepareAndCreateDrafts({ emails, csvSourceId: "expired-source", fileApi }))
      .rejects.toThrow("This CSV source is no longer available");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing requested row", {}],
    ["different source row", { 0: [createGraphAttachment("someone-else.pdf")] }],
    ["missing attachment", { 1: [] }],
    ["extra attachment", { 1: [createGraphAttachment("bob.pdf"), createGraphAttachment("unexpected.pdf")] }],
  ])("fails closed for a response with %s", async (_description, attachmentsByRow) => {
    const fetchMock = mockGraphFetch();
    const fileApi = {
      prepareCsvAttachments: vi.fn().mockResolvedValue({ attachmentsByRow, errors: [] }),
    };

    await expect(prepareAndCreateDrafts({ emails, csvSourceId: "csv-source", fileApi }))
      .rejects.toThrow("The selected CSV no longer matches the preview");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prevents every Graph call if reading the CSV attachments fails", async () => {
    const fetchMock = mockGraphFetch();
    const fileApi = {
      prepareCsvAttachments: vi.fn().mockRejectedValue(new Error("Unable to read selected CSV attachments")),
    };

    await expect(prepareAndCreateDrafts({ emails, csvSourceId: "csv-source", fileApi }))
      .rejects.toThrow("Unable to read selected CSV attachments");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves global attachment validation when recipient files are also present", async () => {
    const fetchMock = mockGraphFetch();
    const fileApi = { prepareCsvAttachments: vi.fn() };

    await expect(prepareAndCreateDrafts({
      emails,
      globalFiles: [createGlobalFile("unsafe.EXE", "blocked")],
      csvSourceId: "csv-source",
      fileApi,
    })).rejects.toThrow("unsafe.EXE is an unsafe file type blocked by Outlook");

    expect(fileApi.prepareCsvAttachments).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
