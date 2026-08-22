import { parseEmailCell } from "./parseFile.js";
export async function createOutlookDraft(accessToken, { to, cc, bcc, subject, htmlBody }) {
  if (!accessToken) {
    throw new Error("Cannot create Outlook draft because the Microsoft access token is empty.");
  }

  // ensure 'to', 'cc' and 'bcc' are arrays of trimmed email addresses
  const toRecipients = parseEmailCell(to);
  const ccRecipients = parseEmailCell(cc);
  const bccRecipients = parseEmailCell(bcc);

  const emailFields = {
    subject,
    body: {
      contentType: "HTML",
      content: htmlBody,
    },
    toRecipients: toRecipients.map(email => ({
      emailAddress: { address: email },
    })),
  }

  // only add CC or BCC fields if email address exists in csv file
  if (ccRecipients.length > 0) {
    emailFields.ccRecipients = ccRecipients.map(email => ({
      emailAddress: { address: email },
    }));
  }

  if (bccRecipients.length > 0) {
    emailFields.bccRecipients = bccRecipients.map(email => ({
      emailAddress: { address: email },
    }));
  }

  const response = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailFields)
  });

  if (!response.ok) {
    const errorText = await response.text();
    const authHeader = response.headers.get("www-authenticate");
    let graphMessage = errorText;

    try {
      const errorJson = JSON.parse(errorText);
      graphMessage =
        errorJson?.error?.message ||
        errorJson?.message ||
        JSON.stringify(errorJson);
    } catch {
      // Keep the raw response body when Graph does not return JSON.
    }

    if (!graphMessage && authHeader) {
      graphMessage = authHeader;
    }

    const error = new Error(
      `Draft creation failed: ${response.status}${graphMessage ? ` - ${graphMessage}` : ""}`,
    );
    error.status = response.status;
    throw error;
  }

  return response.json();
}
