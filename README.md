# MailMagpie

MailMagpie is an Electron desktop app for creating personalised Outlook drafts from CSV data. Compose a shared email, insert placeholders from the CSV headers, preview and edit individual messages, then create Outlook drafts through Microsoft Graph or export `.eml` files. **MailMagpie does not send emails.**

The current application version is **1.0.0**. The configured distribution target is a **Windows x64 portable executable**.

## User documentation

- [User Guide (Word)](docs/MailMagpie-User-Guide.docx): CSV preparation, template creation, placeholder buttons, previews, attachments, draft creation and export.
- [Troubleshooting Guide (Word)](docs/MailMagpie-Troubleshooting-Guide.docx): sign-in problems, validation errors, warnings, attachment issues and interrupted operations.
- [Microsoft sign-in setup](DESKTOP_AUTH_FIX.md): Entra app registration and configuration for maintainers.

Distribute both Word guides with the final executable. Error messages and recovery instructions are covered in the separate Troubleshooting Guide.

## Using the app

1. Open MailMagpie and select **Sign in with Microsoft**, or choose **Skip sign-in** and confirm **Continue offline**. Microsoft sign-in enables Outlook drafts in that account. Offline mode supports CSV upload, editing, preview and local `.eml` export.
2. On **Upload files**, choose a CSV. The app shows the first three data rows, the total recipient-row count and any validation messages. Select **Next** once the file is accepted.
3. On **Create email template**, enter the subject and compose or paste the message. Click in the message body, then choose a button under **Insert placeholders**, such as `{{FirstName}}`. The buttons come from the uploaded CSV headers. Formatting controls include bold, italic, underline, headings, lists and links.
4. Select **Preview emails**. Review the recipients and merged content, use **Edit this email** for individual body changes, and add any shared attachments.
5. When signed in, select **Create all Outlook drafts** and confirm. Alternatively, select **Export all .eml files** and choose an output folder. Outlook draft creation is greyed out while signed out. Review the resulting messages in Outlook or your email client before sending them yourself.

### Offline .eml fallback

If Microsoft integration cannot be configured or internet access is unavailable, select **Skip sign-in** on Upload files. The popup explains that Outlook draft creation requires Microsoft sign-in. Choose **Continue offline** to proceed; **Cancel** or Escape closes the popup without enabling offline access.

Prepare the CSV and template, preview the messages and choose **Export all .eml files**. CSV attachments and shared attachments work offline using locally available files. Export does not contact Microsoft or create Outlook drafts. Open the resulting files in a compatible email client when ready. Remotely hosted content, such as images referenced by URLs in pasted templates, still needs internet access to load.

The offline choice is retained during navigation and a reload within the session. To enable Outlook drafts later, use **Back** to return to Upload files and select **Sign in with Microsoft**. Finish sign-in, then return to Preview. Signing in does not clear the loaded CSV or individual edits.

**Find recipients** searches names and To, CC and BCC addresses. Press **Ctrl+F** (or **Cmd+F** on macOS) on Preview to focus the search. Search and recipient selection navigate the preview; both output actions still process **every loaded CSV row**. To create one draft, load a CSV with one recipient row.

Hold **Ctrl** and scroll to zoom the desktop app from 50% to 300%. Press **Ctrl+0** to reset to 100%.

## Preparing the CSV

Save a comma-separated `.csv` file, preferably UTF-8, with unique, non-empty column headers in the first row and at least one recipient row. Excel workbooks (`.xlsx`) and semicolon- or tab-delimited files are not supported.

| Column | Purpose |
| --- | --- |
| `Email` or `RecipientEmail` | Required: recipient address for each row. Use one of these headers. |
| `FirstName`, `Course`, or other custom headers | Values available as message-body placeholders, such as `{{FirstName}}`. |
| `CC`, `BCC` | Optional addresses for that row. If the column exists, it controls the field for every row and disables the corresponding manual template field. Blank cells remain blank. |
| `ReplyTo` | Optional reply address for that row. A non-empty value overrides the template's **Reply To** field for Outlook drafts. |
| `Attachments` | Optional file paths for that row, separated by semicolons. |

Email, CC, BCC and Attachments header matching ignores letter case and surrounding spaces. Use the exact spelling `ReplyTo` for that column. Placeholder names match the custom header's letter case: `{{FirstName}}` matches `FirstName`.

For multiple addresses in one cell, separate addresses with **commas**. In a spreadsheet, enter them together in the same cell. In raw CSV text, enclose the whole cell in double quotes so those commas do not create extra columns:

```csv
Email,FirstName,Course,CC,BCC,ReplyTo
alice@example.com,Alice,CAB301,"tutor@example.com,admin@example.com",,coordinator@example.com
bob@example.com,Bob,CAB301,,,
```

Each data row creates one message. A body such as `Hi {{FirstName}}, here is your {{Course}} update.` uses values from that row. Double quotes inside a quoted CSV value must be doubled, for example `"The ""Welcome"" session"`.

### Validation and warnings

Errors that prevent upload include an empty file, missing recipient header, blank or repeated headers, no recipient rows, unclosed quoted values and rows with more values than headers. A row with a missing recipient address is flagged on Preview and prevents draft creation or export for the batch.

The **Warnings — you can still continue** panel identifies repeated recipient addresses and attachment problems. Select **Show affected recipient rows** to expand available details. Row 1 means the first data row, excluding the header. Duplicate-address warnings do not remove rows or prevent duplicate drafts. Attachment warnings allow template editing, but invalid or unresolved files must be fixed before output.

See the [Troubleshooting Guide](docs/MailMagpie-Troubleshooting-Guide.docx) for explanations and corrective steps.

### Attachments

On Preview, **Add attachments** selects files to include in every message. For files that vary by recipient, use the CSV's `Attachments` column:

```csv
Email,FirstName,Attachments
alice@example.com,Alice,attachments/alice-report.pdf;attachments/course-guide.pdf
bob@example.com,Bob,attachments/bob-report.pdf
charlie@example.com,Charlie,
```

Separate paths with **semicolons**. Blank cells are valid. Each message receives the shared files plus the files from its own row, for both Outlook drafts and `.eml` exports.

Relative paths start from the **CSV's folder**. Selecting `F:\Mailout\recipients.csv` resolves `attachments/alice-report.pdf` to `F:\Mailout\attachments\alice-report.pdf`. Keep the CSV and its attachment folders together when moving them. Both `/` and `\` work as path separators on Windows.

Each file must be non-empty and **smaller than 3 MB** (3 × 1024 × 1024 bytes). The app rejects blocked executable and script extensions. The desktop app checks CSV paths on selection and checks and reads attachments again before output. All requested attachments are prepared before any drafts are created.

### Draft interruption and current limits

- **Interrupt draft creation** opens a confirmation. Creation continues until **Interrupt creation** is confirmed. No further draft requests then start, but a request already saving can finish. The final status reports confirmed drafts; existing drafts remain in Outlook. **Keep creating** or Escape dismisses the confirmation.
- Starting again begins at the first row. There is no resume operation or check against existing Outlook drafts, so repeat runs can create duplicates.
- Placeholders personalise the **message body only**. The subject is shared across the batch.
- `.eml` export includes To, CC, BCC, subject, body and attachments, but currently omits **Reply-To**. Files are named by row number and recipient; exporting again to the same folder can overwrite matching filenames. Choose a new or empty folder for each batch.
- The app has no **Save project** or **Save template** command. Session storage can preserve workflow data during a reload; keep source CSV files and template text separately. Shared attachments must be selected again after a reload, and CSV files must be reselected after an app restart to restore attachment access.
- Reloading the CSV or changing the shared template body clears individual message edits. Complete the source data and shared template before making individual changes.
- CSV structure checks do not guarantee valid or deliverable email addresses. Some malformed addresses are omitted when Outlook draft recipients are prepared; review the actual drafts before sending.

## Development setup

Use **Node.js 22.13 or newer within the 22.x series** and npm. Local validation for this handover used Node.js **22.22.2** and npm **10.9.7**. Internet access is required to install dependencies and to sign in or create Outlook drafts. Outlook draft creation requires an account with an Outlook mailbox and permission to use the configured Microsoft application. The packaged app's offline `.eml` workflow needs no Microsoft account or connection to Microsoft.

From the repository root:

```bash
npm ci
npm run desktop
```

`npm ci` installs the versions in the committed `package-lock.json`. `npm run desktop` builds the renderer and opens Electron. Packaged-app users do not need Node.js or npm installed.

| Command | Purpose |
| --- | --- |
| `npm run desktop` | Build the renderer and start the desktop app. |
| `npm start` | Start Electron using the existing `dist/` build. Rebuild first after source changes. |
| `npm run dev` | Run the Vite renderer development server in a browser. |
| `npm run build` | Create the production renderer in `dist/`. |
| `npm run preview` | Serve the built renderer in a browser. |
| `npm test` | Run the Vitest suite. |
| `npm run lint` | Run ESLint. |
| `npm run build:win` | Build the renderer and package the Windows x64 portable executable. |

Browser-only modes are for UI development. **Skip sign-in** lets you exercise CSV upload, template creation and preview in a browser. Microsoft sign-in, the desktop CSV picker, CSV attachment access and `.eml` export use Electron's preload bridge and require the desktop app. Use `npm run desktop` for end-to-end testing, including offline export.

## Microsoft authentication

The Electron main process uses MSAL Node and opens the system browser for sign-in. The renderer requests authentication through the preload/IPC bridge and uses Microsoft Graph to create drafts.

| Setting | Default |
| --- | --- |
| Application/client ID | `73add89f-a195-4a8a-9397-783d3c37489d` |
| Authority | `https://login.microsoftonline.com/common` |
| Delegated Graph scopes | `User.Read`, `Mail.ReadWrite` |
| Registered desktop redirect URI | `http://localhost` |
| Internal desktop UI address | `http://127.0.0.1:42813` |

Runtime environment variables `MS_CLIENT_ID` and `MS_TENANT_ID` override the client ID and tenant in [electron/authConfig.cjs](electron/authConfig.cjs). Set them in the environment that launches Electron or the packaged executable. The desktop process does not automatically load a `.env` file, and the old `VITE_MS_*` renderer settings are not used for desktop sign-in. No client secret is required.

The fixed UI port `42813` is separate from MSAL's sign-in callback. Keep it available and run one app instance at a time. See [Microsoft sign-in setup](DESKTOP_AUTH_FIX.md) for registration and verification steps.

## Project structure

| Location | Responsibility |
| --- | --- |
| `src/pages/` | Upload, template and preview workflow. |
| `src/components/RichTextEditor.jsx` | Built-in rich-text editor and placeholder insertion support. |
| `src/utils/` | CSV parsing and validation, warnings, recipient handling, merging, attachments and Graph draft requests. |
| `src/auth/` | Renderer authentication context. |
| `electron/` | Desktop window, local UI server, authentication, file access, attachment preparation and `.eml` export. |
| `public/` | Bundled app icons and public assets. |
| `docs/` | User and troubleshooting guides; earlier experiments under `docs/experiments/`. |
| `experiments/` | Development experiments and sample inputs, including intentionally invalid files. |

The stack is Electron, React, Vite, MSAL Node, Microsoft Graph and a built-in rich-text editor. Vitest and ESLint provide automated checks.

The app retains the identifier `com.electron.e-merge-d`, the `e-merge-d` desktop profile directory and existing IPC/storage names for continuity. These internal names are intentional. The magpie app icon and QUT branding are bundled; attribution is recorded in [app-icon-source.md](public/app-icon-source.md) and [qut-logo-source.md](src/assets/qut-logo-source.md).

## Windows release and handover

On the Windows build machine, install the locked dependencies and run the checks before packaging:

```bash
npm ci
npm test
npm run lint
npm run build:win
```

The build script creates a portable executable in **`release./`** — the directory name includes a trailing period — named **`MailMagpie 1.0.0.exe`** for the current version. The command rebuilds `dist/` and embeds `public/app-icon.ico`. This is a portable app, not an installer. Generated files are ignored by Git. macOS and Linux release targets are not configured by this script.

Before handover:

1. Confirm the intended release version in `package.json` and `package-lock.json`, and align the guide versions. If changing the version, use `npm version <version> --no-git-tag-version` to update both package files.
2. Include both Word guides in the release commit and handover bundle, alongside the README and Microsoft sign-in setup. Exclude temporary Office lock files (`.~lock.*`).
3. Test the newly built executable on the target Windows machine with a test Outlook account and a small fictional CSV. Exercise sign-in, placeholder buttons, multiple CC addresses, validation and warnings, individual edits, shared and CSV attachments, draft creation, interruption and `.eml` export. Also start a fresh session without internet access: confirm **Skip sign-in → Continue offline**, check that Outlook draft creation stays disabled, and export messages with local attachments. Check the resulting recipients, formatting and attachments in Outlook.
4. Record the source commit, package version, build environment and verification results with the handover. Confirm the receiving maintainer has access to the repository and the Entra app registration.

The automated suite covers CSV parsing and validation, warnings, merging, attachments, Graph request behaviour and `.eml` generation. It does not verify interactive Microsoft sign-in or the packaged Windows workflow; those require the desktop checks above.
