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
});