# E-merge-D

E-merge-D is an Electron desktop email merge application for generating personalised Outlook drafts from CSV data. Users upload recipient data, create or paste an HTML/plain-text template, preview merged results, and save personalised messages directly to their Outlook Drafts folder through Microsoft Graph.

## Tech stack

- Electron
- React
- Vite
- MSAL Node (`@azure/msal-node`)
- Microsoft Graph API
- TinyMCE

## Microsoft authentication

The Electron main process handles Microsoft authentication with MSAL Node. The React renderer communicates with it through the preload/IPC bridge.

Default configuration:

- Client ID: `73add89f-a195-4a8a-9397-783d3c37489d`
- Authority: `https://login.microsoftonline.com/common`
- Graph scopes: `User.Read`, `Mail.ReadWrite`
- Desktop redirect URI registered in Entra: `http://localhost`
- Electron local UI: `http://127.0.0.1:42813`

See `DESKTOP_AUTH_FIX.md` for the required Entra configuration.

## Install

```bash
npm install
```

## Run the desktop application

```bash
npm run desktop
```

This builds the Vite renderer and starts Electron.

## Run renderer only

```bash
npm run dev
```

Microsoft sign-in is intentionally unavailable in a normal browser because authentication now runs in the Electron main process.

## Attachments

On the preview page, choose **Add attachments** to attach one or more files to every generated draft. Files must be non-empty and smaller than 3 MB. Potentially unsafe file types blocked by Outlook, such as executable and script files, are rejected before draft creation.

To attach different files to individual recipients, add an optional `Attachments` column to the CSV:

```csv
RecipientEmail,FirstName,Attachments
alice@example.com,Alice,attachments/alice-report.pdf;attachments/course-guide.pdf
bob@example.com,Bob,attachments/bob-report.pdf
charlie@example.com,Charlie,
```

Separate multiple paths with `;`. Whitespace around paths and empty entries are ignored, and blank or missing cells are valid. Header matching is case-insensitive. Each recipient receives the global files selected on Preview plus only the attachments from their own CSV row. Preview shows the selected recipient's CSV paths separately from the global files; `.eml` exports use the same combined attachments.

Relative paths start from the **CSV's folder**, regardless of where the portable executable is located. For example, selecting `F:\Semester1\Mailout\students.csv` resolves `attachments/alice-report.pdf` to `F:\Semester1\Mailout\attachments\alice-report.pdf`. Keep the CSV and attachment folders together when moving them to another computer or drive; selecting the CSV from its new location automatically uses the new drive letter. Both `/` and `\` separators work on Windows.

All attachments for the requested recipients are checked and read before any drafts are created. Missing, unreadable, empty, oversized, or blocked files stop the operation with errors identifying the recipient row and attachment path. Recipient row numbers start at 1 for the first data row, excluding the header. Fix the files or CSV and retry; if you edit the CSV, select it again to refresh its data.

The desktop CSV picker retains the actual CSV path and original rows in Electron's main process. The renderer receives an opaque source ID and can request attachments only by row index from that selected CSV. Clearing or replacing the CSV discards the old source. A renderer reload preserves the source during the same app session; if the app restarts with a restored preview, select the CSV again to restore access to its attachments. CSV attachments require the desktop application.

The application always displays a final confirmation before creating a single draft or all drafts. Drafts are saved to Outlook but are not sent.

## Test

```bash
npm test
```

# Build Windows portable exe

Run:

npm install
npm run build
npx electron-builder --win portable --x64 -c.directories.output=release.

Once the .exe is built in release/ the portable installer is ready


## App icon

The app uses the supplied magpie head artwork on a solid white background.
`public/app-icon.svg` embeds the original PNG on a white canvas;
`public/app-icon.png` and the multi-size `public/app-icon.ico` are its desktop exports.
See `public/app-icon-source.md` for the artwork source.
The icon is used by the Electron window, macOS Dock, packaged apps and browser favicon.
Restart `npm run desktop` to see the updated window icon. Rebuild packaged apps
with Electron Builder to update their executable or launcher icon.
