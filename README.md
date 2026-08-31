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

On the preview page, choose **Add files** to attach one or more files to every generated draft. Files must be non-empty and smaller than 3 MB. Potentially unsafe file types blocked by Outlook, such as executable and script files, are rejected before draft creation.

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

Once the .exe is built in release/ the portable installer is ready!
