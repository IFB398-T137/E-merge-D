import { describe, it, expect } from "vitest";
import { validateCsvHeaders } from "./validateCsv";

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
});