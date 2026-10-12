import { parseEmailCell } from "./processRecipients.js";

async function verifyGraphProfileAccess(accessToken) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(
      `Microsoft Graph rejected the access token before draft creation: ${response.status}${errorText ? ` - ${errorText}` : ""}`,
    );
    error.status = response.status;
    throw error;
  }
}

export async function createOutlookDraftWithRefresh(
  accessToken,
  message,
  { getAccessToken, signal },
) {
  async function createWithToken(token) {
    signal?.throwIfAborted();
    await verifyGraphProfileAccess(token);
    signal?.throwIfAborted();
    // Let a submitted POST finish so interruption can count confirmed drafts.
    // Aborting its response cannot undo a draft already saved by Outlook.
    await createOutlookDraft(token, message);
    return token;
  }

  try {
    return await createWithToken(accessToken);
  } catch (error) {
    if (error.status !== 401) throw error;
    signal?.throwIfAborted();
    const refreshedToken = await getAccessToken({
      forceRefresh: true,
      allowInteractive: false,
    });
    return createWithToken(refreshedToken);
  }
}

export async function createOutlookDraft(
  accessToken,
  {
    to,
    cc = [],
    bcc = [],
    replyTo,
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
  const replyToRecipients = parseEmailCell(replyTo);

  const emailFields = {
    subject,
    body: {
      contentType: "HTML",
      content: htmlBody,
    },
    toRecipients: toRecipients.map((email) => ({
      emailAddress: {
        address: email,
    }
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

  if (replyToRecipients.length > 0) {
    emailFields.replyTo = replyToRecipients.map((email) => ({
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
