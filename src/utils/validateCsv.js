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

export function CsvHeaderFields(headers) {
  const normalized = normaliseHeaders(headers);

  return {
    hasCc: normalized.includes("cc"),
    hasBcc: normalized.includes("bcc")
  };
}

export function validateRow(row) {
  const warnings = [];

  const hasRecipient =
    row && (row.RecipientEmail || row.Email || row.recipientemail || row.email);

  if (!hasRecipient) warnings.push("missing-recipient");

  return warnings;
}


/*
export function validateCsvHeaders(headers) {
  if (!Array.isArray(headers)) return false;

  const normalized = headers.map((h) => String(h).trim().toLowerCase());

  return (
    normalized.includes("recipientemail") || normalized.includes("email")
  );
}
  */