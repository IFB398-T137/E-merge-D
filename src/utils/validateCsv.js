import { getRecipientEmail } from "./processRecipients.js";

// parses all headers in csv file and then validates the results
export function normaliseHeaders(headers) {
  if (!Array.isArray(headers)) return [];
    
  return headers.map(h => String(h).trim().toLowerCase());
}

export function validateCsvHeaders(headers) {
  const normalized = normaliseHeaders(headers);
  
  return (
    normalized.includes("recipientemail") || normalized.includes("email")
  );
}

export function getCsvValidationError({ headers, data }) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return "The CSV file is empty. Add column headers and at least one recipient row.";
  }

  if (!validateCsvHeaders(headers)) {
    return "The CSV must include an 'Email' or 'RecipientEmail' column in the first row. Use commas to separate columns.";
  }

  const normalized = normaliseHeaders(headers);
  const blankHeader = normalized.indexOf("");
  if (blankHeader !== -1) {
    return `Column ${blankHeader + 1} has no header. Give every column a name and upload the CSV again.`;
  }

  const duplicate = normalized.findIndex((header, index) => normalized.indexOf(header) !== index);
  if (duplicate !== -1) {
    return `The column header '${headers[duplicate]}' appears more than once. Give each column a unique name.`;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return "The CSV has headers but no recipient rows. Add at least one recipient below the header row.";
  }

  return null;
}

export function CsvHeaderFields(headers) {
  const normalized = normaliseHeaders(headers);

  return {
    hasCc: normalized.includes("cc"),
    hasBcc: normalized.includes("bcc")
  };
}

export function validateRow(row) {
  const warnings = [];

  const hasRecipient = getRecipientEmail(row);

  if (!hasRecipient) warnings.push("missing-recipient");

  return warnings;
}
