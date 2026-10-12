const fs = require("fs/promises");
const { constants } = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

function resolveAttachmentPath(csvPath, attachmentPath, pathModule = path) {
  // C:report.pdf depends on Windows' current directory for that drive.
  if (/^[a-z]:($|[^\\/])/i.test(attachmentPath)) {
    throw new Error("Drive-relative paths are not supported. Use a relative path or a complete absolute path.");
  }

  if (pathModule.sep !== "\\" && /^[a-z]:[\\/]/i.test(attachmentPath)) {
    throw new Error("This Windows absolute path cannot be resolved on this computer. Use a path relative to the CSV.");
  }

  const normalized = attachmentPath.replace(/[\\/]/g, pathModule.sep);
  return pathModule.resolve(pathModule.dirname(csvPath), normalized);
}

function recipientDescription(row, rowIndex) {
  const emailKey = Object.keys(row).find((key) =>
    ["recipientemail", "email"].includes(key.trim().toLowerCase()),
  );
  const email = emailKey && row[emailKey];
  return `Recipient row ${rowIndex + 1}${email ? ` (${email})` : ""}`;
}

function describeReadError(error) {
  if (error.code === "ENOENT" || error.code === "ENOTDIR") {
    return "File does not exist.";
  }
  if (error.code === "EACCES" || error.code === "EPERM") {
    return "File cannot be read. Check its permissions.";
  }
  // Node filesystem messages include absolute paths; only expose the CSV value.
  return "File could not be read.";
}

function createCsvAttachmentStore({
  parseCSV,
  getCsvValidationError,
  getRowAttachmentPaths,
  getAttachmentValidationError,
  fileSystem = fs,
  pathModule = path,
  createSourceId = randomUUID,
}) {
  const sources = new Map();

  async function inspectAttachment(csvPath, originalPath) {
    let resolvedPath;
    try {
      resolvedPath = resolveAttachmentPath(csvPath, originalPath, pathModule);
    } catch (error) {
      return { kind: "unresolved", message: error.message };
    }

    try {
      const stats = await fileSystem.stat(resolvedPath);
      if (!stats.isFile()) {
        return { kind: "unresolved", message: "Path does not refer to a regular file." };
      }
      const name = pathModule.basename(resolvedPath);
      const message = getAttachmentValidationError({ name, size: stats.size });
      if (message) return { kind: "invalid", message };
      return { resolvedPath, name };
    } catch (error) {
      return { kind: "unresolved", message: describeReadError(error) };
    }
  }

  async function checkAttachmentPaths(csvPath, data) {
    const issues = [];
    const checkedPaths = new Map();
    for (const [rowIndex, row] of data.entries()) {
      for (const originalPath of getRowAttachmentPaths(row)) {
        if (!checkedPaths.has(originalPath)) {
          let result = await inspectAttachment(csvPath, originalPath);
          if (!result.message) {
            try {
              // Check readability without loading each attachment into memory.
              await fileSystem.access(result.resolvedPath, constants.R_OK);
            } catch (error) {
              result = { kind: "unresolved", message: describeReadError(error) };
            }
          }
          checkedPaths.set(originalPath, result);
        }
        const result = checkedPaths.get(originalPath);
        if (result.message) {
          issues.push({ rowIndex, path: originalPath, kind: result.kind, message: result.message });
        }
      }
    }
    return issues;
  }

  async function selectCsv(senderId, csvPath) {
    if (!pathModule.isAbsolute(csvPath)) {
      throw new Error("The selected CSV must have an absolute filesystem path.");
    }
    if (pathModule.extname(csvPath).toLowerCase() !== ".csv") {
      throw new Error("Unsupported file type. Please upload a CSV file.");
    }

    const { headers, data } = parseCSV(await fileSystem.readFile(csvPath, "utf8"));
    const validationError = getCsvValidationError({ headers, data });
    if (validationError) throw new Error(validationError);
    const attachmentIssues = await checkAttachmentPaths(csvPath, data);
    const sourceId = createSourceId();
    sources.set(senderId, {
      sourceId,
      csvPath,
      // Keep the authoritative CSV rows separate from the returned data.
      rows: data.map((row) => ({ ...row })),
    });

    return { sourceId, name: pathModule.basename(csvPath), headers, data, attachmentIssues, attachmentsChecked: true };
  }

  function clearCsvSource(senderId) {
    sources.delete(senderId);
  }

  async function prepareCsvAttachments(senderId, request = {}) {
    const source = sources.get(senderId);
    if (!source || request?.sourceId !== source.sourceId) {
      return {
        attachmentsByRow: {},
        errors: ["The CSV source is no longer available. Upload the CSV again before creating drafts."],
      };
    }

    const rowIndexes = request.rowIndexes;
    if (!Array.isArray(rowIndexes) || rowIndexes.some((index) =>
      !Number.isInteger(index) || index < 0 || index >= source.rows.length,
    )) {
      return { attachmentsByRow: {}, errors: ["The selected CSV recipient rows are invalid. Upload the CSV again."] };
    }

    const attachmentsByRow = {};
    const errors = [];

    for (const rowIndex of new Set(rowIndexes)) {
      const row = source.rows[rowIndex];
      attachmentsByRow[rowIndex] = [];

      for (const originalPath of getRowAttachmentPaths(row)) {
        const prefix = `${recipientDescription(row, rowIndex)}, attachment "${originalPath}": `;
        const inspection = await inspectAttachment(source.csvPath, originalPath);
        if (inspection.message) {
          errors.push(prefix + inspection.message);
          continue;
        }
        const { resolvedPath, name } = inspection;

        try {
          const content = await fileSystem.readFile(resolvedPath);
          // Recheck the bytes in case the file changed after stat().
          const contentError = getAttachmentValidationError({ name, size: content.length });
          if (contentError) {
            errors.push(prefix + contentError);
            continue;
          }

          attachmentsByRow[rowIndex].push({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name,
            contentType: "application/octet-stream",
            contentBytes: content.toString("base64"),
          });
        } catch (error) {
          errors.push(prefix + describeReadError(error));
        }
      }
    }

    if (sources.get(senderId)?.sourceId !== source.sourceId) {
      errors.push("The CSV source changed while checking attachments. Try creating the drafts again.");
    }

    // Return no partial batch when any row failed validation.
    return { attachmentsByRow: errors.length ? {} : attachmentsByRow, errors };
  }

  return { selectCsv, clearCsvSource, prepareCsvAttachments };
}

module.exports = { createCsvAttachmentStore, resolveAttachmentPath };
