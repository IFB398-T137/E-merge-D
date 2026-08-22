// checks if the CSV headers contain either "recipientemail" or "email" (case-insensitive)
export function validateCsvHeaders(headers) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return false;
  }

  const normalized = headers.map((h) => String(h).trim().toLowerCase());

  return (
    normalized.includes("recipientemail") || normalized.includes("email")
  );
}

export function CcBccValueExists(headers) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return { hasCc: false, hasBcc: false };
  }

  const normalized = headers.map((h) => String(h).trim().toLowerCase());
  const hasCc = normalized.includes("cc");
  const hasBcc = normalized.includes("bcc");

  return { hasCc, hasBcc };
}

export function validateRow(row) {
  const warnings = [];

  const hasRecipient =
    row && (row.RecipientEmail || row.Email || row.recipientemail || row.email);

  if (!hasRecipient) warnings.push("missing-recipient");

  return warnings;
}