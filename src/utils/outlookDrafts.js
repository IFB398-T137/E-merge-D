export async function createOutlookDraft(accessToken, { to, subject, htmlBody }) {
  if (!accessToken) {
    throw new Error("Cannot create Outlook draft because the Microsoft access token is empty.");
  }

  const response = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject,
      body: {
        contentType: "HTML",
        content: htmlBody,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    }),
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
