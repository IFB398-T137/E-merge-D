# E-merge-D Electron authentication fix

## What changed

- Removed renderer-side `@azure/msal-browser` / `@azure/msal-react` authentication.
- Added `@azure/msal-node` authentication in the Electron main process.
- Added a secure preload bridge and IPC handlers for sign-in and token acquisition.
- Changed the Electron local UI server from a random port to `127.0.0.1:42813`.
- Kept Microsoft Graph draft creation behaviour in the existing React code.

## Required Entra configuration

For application/client ID:

`73add89f-a195-4a8a-9397-783d3c37489d`

1. Go to **App registrations -> E-merge-D -> Authentication**.
2. Under **Mobile and desktop applications**, add this redirect URI:

   `http://localhost`

   The existing `msal73add89f-a195-4a8a-9397-783d3c37489d://auth` entry can remain, but this implementation uses MSAL Node's system-browser/loopback flow and therefore requires `http://localhost`.

3. Under **Advanced settings**, set **Allow public client flows** to **Yes**.
4. Keep supported account types set to allow organisational directories and personal Microsoft accounts.
5. Keep delegated Microsoft Graph permissions for `User.Read` and `Mail.ReadWrite`.

## Important port distinction

`42813` is the port used by the Electron app's local UI server:

`http://127.0.0.1:42813`

It is not the Microsoft authentication redirect URI. MSAL Node creates/manages its own loopback callback for interactive authentication. The registered desktop redirect is `http://localhost`.

## Install and test

Because the auth dependency changed, regenerate dependencies/lockfile on your development machine:

```bash
npm install
npm run desktop
```

Expected flow:

1. Electron opens on `http://127.0.0.1:42813` internally.
2. Select **Sign in with Microsoft**.
3. Your default browser opens the Microsoft sign-in page.
4. Personal Outlook/Microsoft accounts and permitted work/school accounts can authenticate through the `common` authority.
5. The browser shows a success page and you return to E-merge-D.
6. Upload a CSV and create an Outlook draft to verify `Mail.ReadWrite`.

## Packaging note

If your installer build uses `npm ci`, run `npm install` once and commit the newly generated `package-lock.json` before rebuilding the installer. The source package supplied here retains the old lockfile because the execution environment used to create this patch could not fetch the newly added package from its npm mirror.
