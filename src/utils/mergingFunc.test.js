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
  const template = "Hi {{FirstName}},\n\nYour username is {{FirstName}}.";
  const row = {
    FirstName: "Pat",
  };

  const result = mergeContent(template, row);

  expect(result).toBe(
    "Hi Pat,\n\nYour username is Pat."
  );
  });

  it("leaves placeholders unchanged if no matching CSV header is found", () => {
    const template = "Hi {{FirstName}}, your team is {{Team}}.";
    const row = {
      FirstName: "Pat",
    };

    const result = mergeContent(template, row);

    expect(result).toBe("Hi Pat, your team is {{Team}}.");
  });

  it("handles whitespace in placeholders", () => {
    const template = "Hi {{ FirstName }}, your team is {{ Team }}.";
    const row = {
      FirstName: "Pat",
      Team: "T137",
    };

    const result = mergeContent(template, row);

    expect(result).toBe("Hi Pat, your team is T137.");
  });

  it('preserves line breaks in the template', () => {
    const template = "Hi {{FirstName}},\n\nYour team is {{Team}}.";
    const row = {
      FirstName: "Pat",
      Team: "T137",
    };

    const result = mergeContent(template, row);

    expect(result).toBe("Hi Pat,\n\nYour team is T137.");
  }); 

  it ("handles HTML structure in the template", () => {
    const template = "<p>Hi {{FirstName}},</p><p>Your team is {{Team}}.</p>";
    const row = {
      FirstName: "Pat",
      Team: "T137",
    };

    const result = mergeContent(template, row);

    expect(result).toBe("<p>Hi Pat,</p><p>Your team is T137.</p>"); 
  });

  it ("handles placeholders with a href attribute", () => {
    const template = '<a href="{{URL}}">Click here</a>';
    const row = {
      URL: "https://examplelink.com",
    };

    const result = mergeContent(template, row);

    expect(result).toBe('<a href="https://examplelink.com">Click here</a>');
  });
});
