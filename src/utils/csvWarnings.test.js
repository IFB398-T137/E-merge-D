import { describe, expect, it } from "vitest";
import { getCsvWarnings } from "./csvWarnings.js";
import { getRecipientEmail } from "./processRecipients.js";
import { getCsvValidationError } from "./validateCsv.js";
import { parseCSV } from "./parseFile.js";

describe("CSV warnings", () => {
  it("flags duplicate recipients across all rows, ignoring case and parsing multiple addresses", () => {
    const data = [
      { EMAIL: " Alice@Example.com " },
      { EMAIL: "bob@example.com" },
      { EMAIL: "carol@example.com" },
      { EMAIL: "alice@example.com, BOB@example.com" },
    ];
    const [warning] = getCsvWarnings({ data });
    expect(warning.title).toBe("2 duplicate email addresses");
    expect(warning.details).toEqual([
      "alice@example.com — recipient rows 1, 4",
      "bob@example.com — recipient rows 2, 4",
    ]);
    expect(getRecipientEmail(data[0])).toBe("Alice@Example.com");
    expect(data[0].EMAIL).toBe(" Alice@Example.com ");
  });

  it("does not flag shared CC/BCC addresses or blank recipient cells as duplicates", () => {
    expect(getCsvWarnings({ data: [
      { Email: "a@example.com", CC: "shared@example.com", BCC: "bcc@example.com" },
      { Email: "b@example.com", CC: "shared@example.com", BCC: "bcc@example.com" },
      { Email: "" }, { Email: "" },
    ] })).toEqual([]);
  });

  it("prefers RecipientEmail when the CSV also contains Email, matching draft generation", () => {
    const parsed = parseCSV("Email,RecipientEmail\na@example.com,b@example.com\nb@example.com,c@example.com");
    expect(getCsvWarnings(parsed)).toEqual([]);
    expect(getRecipientEmail(parsed.data[0])).toBe("b@example.com");
  });

  it("keeps duplicate recipients valid so users can continue", () => {
    const parsed = parseCSV("Email\na@example.com\na@example.com");
    expect(getCsvValidationError(parsed)).toBeNull();
    expect(getCsvWarnings(parsed)[0].title).toBe("1 duplicate email address");
    expect(parsed.data).toHaveLength(2);
  });

  it("distinguishes unresolved paths from existing files that cannot be attached", () => {
    const warnings = getCsvWarnings({
      data: [{ Email: "a@example.com", Attachments: "missing.pdf;empty.pdf" }],
      attachmentsChecked: true,
      attachmentIssues: [
        { rowIndex: 0, path: "missing.pdf", kind: "unresolved", message: "File does not exist." },
        { rowIndex: 0, path: "empty.pdf", kind: "invalid", message: "empty.pdf is empty." },
      ],
    });
    expect(warnings.map((warning) => warning.title)).toEqual([
      "1 attachment path could not be resolved", "1 attachment cannot be used",
    ]);
    expect(warnings[0].details).toEqual(['Recipient row 1, attachment "missing.pdf": File does not exist.']);
  });

  it("explains when attachment paths cannot be checked in the browser", () => {
    const data = [{ Email: "a@example.com", Attachments: "report.pdf" }];
    expect(getCsvWarnings({ data })[0].id).toBe("attachments-unchecked");
    expect(getCsvWarnings({ data, attachmentsChecked: true })).toEqual([]);
  });
});
