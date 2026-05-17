import { describe, it, expect } from "vitest";
import { mergeContent } from "./mergingFunc";

describe("mergeContent", () => {
  it("replaces placeholders with matching CSV row values", () => {
    const template = "Hi {{FirstName}}, your team is {{Team}}.";
    const row = {
      FirstName: "Pat",
      Team: "T137",
    };

    const result = mergeContent(template, row);

    expect(result).toBe("Hi Pat, your team is T137.");
  });
  
    it("replaces multiple occurrences of the same placeholder", () => {
    const template =
        "Hi {{FirstName}},\n\nYour username is {{FirstName}}.";
        
    const row = {
        FirstName: "Pat",
    };

    const result = mergeContent(template, row);

    expect(result).toBe(
        "Hi Pat,\n\nYour username is Pat."
    );
    });
});