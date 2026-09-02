const fs = require("fs/promises");
const path = require("path");

function wrapBase64(value) {
  return value.match(/.{1,76}/g)?.join("\r\n") || "";
}

function encodeHeader(value = "") {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function formatRecipients(value) {
  if (!value) return "";

  return Array.isArray(value)
    ? value.filter(Boolean).join(", ")
    : value;
}

function sanitiseHeaderValue(value = "") {
  return String(value).replace(/[\r\n"]/g, "");
}

function sanitiseFileName(value = "email") {
  return value
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

function createEml({
  to,
  cc = [],
  bcc = [],
  subject = "",
  htmlBody = "",
  attachments = [],
}) {
  const boundary = `----=_EmergeD_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;

  const lines = [
    `To: ${formatRecipients(to)}`,
  ];

  if (formatRecipients(cc)) {
    lines.push(`Cc: ${formatRecipients(cc)}`);
  }

  if (formatRecipients(bcc)) {
    lines.push(`Bcc: ${formatRecipients(bcc)}`);
  }

  lines.push(
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "X-Unsent: 1",
  );

  const encodedBody = wrapBase64(
    Buffer.from(htmlBody, "utf8").toString("base64"),
  );

  if (attachments.length === 0) {
    lines.push(
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodedBody,
    );

    return lines.join("\r\n");
  }

  lines.push(
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodedBody,
  );

  for (const attachment of attachments) {
    const name = sanitiseHeaderValue(attachment.name);

    lines.push(
      "",
      `--${boundary}`,
      `Content-Type: ${attachment.contentType || "application/octet-stream"}; name="${name}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${name}"`,
      "",
      wrapBase64(attachment.contentBytes),
    );
  }

  lines.push("", `--${boundary}--`);

  return lines.join("\r\n");
}

async function exportEmlFiles(folder, emails, subject, attachments) {
  for (let index = 0; index < emails.length; index++) {
    const email = emails[index];

    const eml = createEml({
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject,
      htmlBody: email.content,
      attachments,
    });

    const recipient = Array.isArray(email.to)
      ? email.to[0]
      : email.to;

    const number = String(index + 1).padStart(3, "0");

    const fileName =
      `${number}-${sanitiseFileName(recipient || "email")}.eml`;

    await fs.writeFile(
      path.join(folder, fileName),
      eml,
      "utf8",
    );
  }
}

module.exports = {
  exportEmlFiles,
};