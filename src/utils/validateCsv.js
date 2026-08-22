// checks if the CSV headers contain either "recipientemail" or "email" (case-insensitive)
export function validateCsvHeaders(headers) {
  if (!Array.isArray(headers)) return false;

  const normalized = headers.map((h) => String(h).trim().toLowerCase());

  return (
    normalized.includes("recipientemail") || normalized.includes("email")
  );
}