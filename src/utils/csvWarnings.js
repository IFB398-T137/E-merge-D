import { getRowAttachmentPaths } from "./attachments.js";
import { getRecipientEmail, parseEmailCell } from "./processRecipients.js";

export function getCsvWarnings({ data, attachmentIssues = [], attachmentsChecked = false }) {
  const warnings = [];
  const recipientRows = new Map();

  data.forEach((row, index) => {
    const addresses = new Set(parseEmailCell(getRecipientEmail(row)).map((email) => email.toLowerCase()));
    for (const address of addresses) {
      if (!recipientRows.has(address)) recipientRows.set(address, []);
      recipientRows.get(address).push(index + 1);
    }
  });

  const duplicates = [...recipientRows].filter(([, rows]) => rows.length > 1);
  if (duplicates.length) {
    warnings.push({
      id: "duplicate-emails",
      title: `${duplicates.length} duplicate email address${duplicates.length === 1 ? "" : "es"}`,
      description: "Each CSV row creates a separate draft. These addresses appear in more than one row, so check whether the repeats are intentional.",
      details: duplicates.map(([address, rows]) => `${address} — recipient rows ${rows.join(", ")}`),
    });
  }

  for (const kind of ["unresolved", "invalid"]) {
    const issues = attachmentIssues.filter((issue) => issue.kind === kind);
    if (!issues.length) continue;
    warnings.push({
      id: `attachments-${kind}`,
      title: kind === "unresolved"
        ? `${issues.length} attachment path${issues.length === 1 ? "" : "s"} could not be resolved`
        : `${issues.length} attachment${issues.length === 1 ? "" : "s"} cannot be used`,
      description: "You can continue editing. Fix these files or update the CSV before creating drafts or exporting emails. Relative paths start from the CSV's folder. If you edit the CSV, upload it again.",
      details: issues.map((issue) => `Recipient row ${issue.rowIndex + 1}, attachment "${issue.path}": ${issue.message}`),
    });
  }

  if (!attachmentsChecked && data.some((row) => getRowAttachmentPaths(row).length > 0)) {
    warnings.push({
      id: "attachments-unchecked",
      title: "CSV attachment paths could not be checked",
      description: "You can continue editing. Open the CSV in the MailMagpie desktop app to check its attachment paths before creating drafts or exporting emails.",
      details: [],
    });
  }

  return warnings;
}
