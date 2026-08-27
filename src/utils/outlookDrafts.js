import { parseEmailCell } from "./processRecipients.js";

export async function createOutlookDraft(
  accessToken,
  {
    to,
    cc = [],
    bcc = [],
    subject,
    htmlBody,
    attachments = [],
  },
) {
  if (!accessToken) {
    throw new Error(
      "Cannot create Outlook draft because the Microsoft access token is empty.",
    );
  }

  const toRecipients = parseEmailCell(to);

  const emailFields = {
    subject,
    body: {
      contentType: "HTML",
      content: htmlBody,
    },
    toRecipients: toRecipients.map((email) => ({
      emailAddress: {
        address: email,
      },
    })),
  };

  if (cc.length > 0) {
    emailFields.ccRecipients = cc.map((email) => ({
      emailAddress: {
        address: email,
      },
    }));
  }

  if (bcc.length > 0) {
    emailFields.bccRecipients = bcc.map((email) => ({
      emailAddress: {
        address: email,
      },
    }));
  }

  if (attachments.length > 0) {
    emailFields.attachments = attachments;
  }

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/me/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailFields),
    },
  );

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
      `Draft creation failed: ${response.status}${
        graphMessage ? ` - ${graphMessage}` : ""
      }`,
    );

    error.status = response.status;
    throw error;
  }

  return response.json();
}