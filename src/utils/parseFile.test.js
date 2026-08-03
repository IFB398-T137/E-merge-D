import { describe, it, expect } from "vitest";
import { parseFile } from "./parseFile";

describe("parseFile", () => {
  it("checks for unsupported file types", async () => {
    const file = new File([""], "test.txt", { type: "text/plain" });

    try {
      await parseFile(file);
    } catch (error) {
      expect(error.message).toBe("Unsupported file type. Please upload a CSV file.");
    }  
  });

  it("extracts headers from the first line of a CSV file", async () => {
    const csvContent = "FirstName,Team\nPat,T137";
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const result = await parseFile(file);

    expect(result.headers).toEqual(["FirstName", "Team"]);
  });

  it("trims whitespace from headers and values", async () => {
    const csvContent = " FirstName , Team \n Pat , T137 ";
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const result = await parseFile(file);

    expect(result.headers).toEqual(["FirstName", "Team"]);
    expect(result.data).toEqual([{ FirstName: "Pat", Team: "T137" }]);
  });

  it("handles missing values in CSV rows with an empty string", async () => {
    const csvContent = "FirstName,Team\nPat,";
    const file = new File([csvContent], "test.csv", { type: "text/csv" });

    const result = await parseFile(file);

    expect(result.headers).toEqual(["FirstName", "Team"]);
    expect(result.data).toEqual([{ FirstName: "Pat", Team: "" }]);
  });
});