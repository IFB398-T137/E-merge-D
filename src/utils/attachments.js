export const MAX_ATTACHMENT_SIZE_BYTES = 3 * 1024 * 1024;

// Outlook blocks executable and script-based attachments because they can be unsafe.
const blockedExtensions = new Set([
  "ade",
  "adp",
  "app",
  "asp",
  "bat",
  "chm",
  "cmd",
  "com",
  "cpl",
  "exe",
  "hta",
  "inf",
  "ins",
  "isp",
  "jar",
  "js",
  "jse",
  "lnk",
  "mda",
  "mdb",
  "mde",
  "msc",
  "msi",
  "msp",
  "mst",
  "pif",
  "ps1",
  "reg",
  "scr",
  "sct",
  "shb",
  "shs",
  "vb",
  "vbe",
  "vbs",
  "wsc",
  "wsf",
  "wsh",
]);

function getFileExtension(fileName = "") {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot === -1 ? "" : fileName.slice(lastDot + 1).toLowerCase();
}

export function formatFileSize(sizeInBytes) {
  if (sizeInBytes < 1024) return `${sizeInBytes} B`;
  if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentValidationError(file) {
  if (!file || !file.name) {
    return "The selected attachment is not a valid file.";
  }

  if (file.size === 0) {
    return `${file.name} is empty.`;
  }

  if (file.size >= MAX_ATTACHMENT_SIZE_BYTES) {
    return `${file.name} is ${formatFileSize(file.size)}. Attachments must be smaller than 3 MB.`;
  }

  const extension = getFileExtension(file.name);
  if (blockedExtensions.has(extension)) {
    return `${file.name} is an unsafe file type blocked by Outlook.`;
  }

  return null;
}

export function validateAttachmentSelection(files) {
  const validFiles = [];
  const errors = [];

  for (const file of files) {
    const error = getAttachmentValidationError(file);

    if (error) {
      errors.push(error);
    } else {
      validFiles.push(file);
    }
  }

  return { validFiles, errors };
}

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

export async function fileToGraphAttachment(file) {
  const validationError = getAttachmentValidationError(file);

  if (validationError) {
    throw new Error(validationError);
  }

  return {
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: file.name,
    contentType: file.type || "application/octet-stream",
    contentBytes: arrayBufferToBase64(await file.arrayBuffer()),
  };
}

export function prepareGraphAttachments(files) {
  return Promise.all(files.map(fileToGraphAttachment));
}

export function getRowAttachmentPaths(row) {
  const header = Object.keys(row || {}).find(
    (key) => key.trim().toLowerCase() === "attachments",
  );
  const value = header ? row[header] : null;

  if (value == null || value === "") return [];

  return String(value).split(";").map((entry) => entry.trim()).filter(Boolean);
}

// Prepare the entire requested batch before the caller creates any drafts.
// Row indexes refer to the original CSV, even when only one recipient is selected.
export async function prepareEmailAttachments({
  emails,
  globalFiles = [],
  csvSourceId,
  fileApi = globalThis.window?.eMergeDFiles,
}) {
  const globalAttachments = await prepareGraphAttachments(globalFiles);
  const rowsWithAttachments = emails.filter((email) => email.attachmentPaths?.length);
  let attachmentsByRow = {};

  if (rowsWithAttachments.length > 0) {
    if (!fileApi?.prepareCsvAttachments) {
      throw new Error("CSV attachments require the MaggieMail desktop app. Open the app and select the CSV again.");
    }
    if (!csvSourceId) {
      throw new Error("Select the CSV again on the Upload page so its attachment paths can be resolved from the CSV folder.");
    }

    const result = await fileApi.prepareCsvAttachments({
      sourceId: csvSourceId,
      rowIndexes: rowsWithAttachments.map((email) => email.rowIndex),
    });

    if (result.errors.length > 0) {
      throw new Error(`CSV attachment validation failed:\n${result.errors.join("\n")}`);
    }

    attachmentsByRow = result.attachmentsByRow;
    for (const email of rowsWithAttachments) {
      if (!Array.isArray(attachmentsByRow[email.rowIndex]) ||
          attachmentsByRow[email.rowIndex].length !== email.attachmentPaths.length) {
        throw new Error("The selected CSV no longer matches the preview. Select the CSV again on the Upload page.");
      }
    }
  }

  return emails.map((email) => ({
    ...email,
    attachments: [
      ...globalAttachments,
      ...(email.attachmentPaths?.length ? attachmentsByRow[email.rowIndex] : []),
    ],
  }));
}
