import { describe, it, expect } from "vitest";
import { getCsvValidationError, validateCsvHeaders } from "./validateCsv";
import { parseCSV } from "./parseFile";

describe("validateCsvHeaders", () => {
  it("rejects CSV files without RecipientEmail column", () => {
    const headers = ["FirstName", "Team"];

    const result = validateCsvHeaders(headers);

    expect(result).toBe(false);
  });

  it("accepts CSV files with RecipientEmail column", () => {
    const headers = ["RecipientEmail", "FirstName", "Team"];

    const result = validateCsvHeaders(headers);

    expect(result).toBe(true);
  });

  it("accepts CSV files with Email column", () => {
    const headers = ["Email", "FirstName", "Team"];

    const result = validateCsvHeaders(headers);

    expect(result).toBe(true);
  });

  it("returns false if no headers are provided", () => {
    const headers = [];

    const result = validateCsvHeaders(headers);

    expect(result).toBe(false);
  });

  it("handles whitespace in headers", () => {
    const headers = [" RecipientEmail ", " FirstName ", " Team "];

    const result = validateCsvHeaders(headers);

    expect(result).toBe(true);
  });
});

describe("CSV upload validation", () => {
  it.each([
    ["", "file is empty"],
    ["\n , \n", "file is empty"],
    ["FirstName,Team\nPat,T137", "'Email' or 'RecipientEmail'"],
    ["Email;FirstName\na@example.com;Alice", "Use commas"],
    ["Email,FirstName\n\n", "no recipient rows"],
    ["Email,\na@example.com,Alice", "Column 2 has no header"],
    ["Email, email\na@example.com,b@example.com", "appears more than once"],
  ])("explains why %j cannot be uploaded", (csv, reason) => {
    expect(getCsvValidationError(parseCSV(csv))).toContain(reason);
  });

  it("accepts a BOM, case-insensitive headers and optional empty cells", () => {
    expect(getCsvValidationError(parseCSV("\uFEFFRECIPIENTEMAIL,Attachments\r\na@example.com,\r\n")))
      .toBeNull();
  });
});
