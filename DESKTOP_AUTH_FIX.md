# MailMagpie Microsoft sign-in setup

This document describes the current desktop authentication configuration for maintainers. End-user sign-in instructions and recovery steps are in the separate [User Guide](docs/MailMagpie-User-Guide.docx) and [Troubleshooting Guide](docs/MailMagpie-Troubleshooting-Guide.docx).

Checked against the application code and Microsoft documentation on **18 October 2026**.

## Authentication architecture

The Electron main process uses MSAL Node's `acquireTokenInteractive` method to sign in through the system browser using the authorization code flow with PKCE. The React renderer requests accounts and access tokens through `electron/preload.cjs`. Draft creation uses Microsoft Graph with delegated `User.Read` and `Mail.ReadWrite` permissions. The app creates drafts and does not send mail.

The active configuration is [electron/authConfig.cjs](electron/authConfig.cjs):

| Setting | Default | Runtime override |
| --- | --- | --- |
| Application/client ID | `73add89f-a195-4a8a-9397-783d3c37489d` | `MS_CLIENT_ID` |
| Tenant | `common` | `MS_TENANT_ID` |
| Authority | `https://login.microsoftonline.com/common` | Derived from the tenant above. |
| Graph scopes | `User.Read`, `Mail.ReadWrite` | Defined in the configuration file. |

Set overrides in the environment that launches Electron or the packaged app. The desktop process does not automatically read `.env`, and `VITE_MS_CLIENT_ID` / `VITE_MS_TENANT_ID` in the legacy renderer configuration are not used. This is a public desktop client; no client secret is required.

## Entra app registration

In the Microsoft Entra admin center, open **App registrations** and select the registration whose Application (client) ID matches the app's configuration. To create a replacement registration, choose **New registration**, give it a display name such as MailMagpie and select the intended account audience before registering it. A replacement receives a new client ID; use that ID in `MS_CLIENT_ID`, or update the default in `electron/authConfig.cjs` and rebuild the distributable.

1. For the app's default audience, allow accounts from any organisational directory and personal Microsoft accounts, and keep `MS_TENANT_ID` as `common`. For an organisation-only deployment, select the single-tenant audience and set `MS_TENANT_ID` to that directory's tenant ID. The registration audience and authority must agree. See [MSAL Node authority configuration](https://learn.microsoft.com/en-us/entra/msal/javascript/node/initialize-public-client-application#configure-authority).
2. Open **Authentication**, choose **Add a platform** if needed, and select **Mobile and desktop applications**. Register `http://localhost` and save the configuration. Use the desktop platform for this app's system-browser sign-in. An existing custom `msal...://auth` URI does not replace the loopback redirect. See [Microsoft's platform registration guidance](https://learn.microsoft.com/en-us/graph/auth-register-app-v2#configure-platform-settings).
3. For a new registration used only by this implementation, leave **Allow public client flows** set to **No**. MailMagpie is a public desktop client, but its authorization code flow with a registered desktop redirect does not require this additional switch. Microsoft reserves it for flows such as device code, integrated Windows authentication and username/password authentication, which this app does not use. See [Microsoft's explanation of the public-client-flow setting](https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-applications#when-should-you-enable-a-public-client-flow-in-your-app-registration).
4. Open **API permissions → Add a permission → Microsoft Graph → Delegated permissions**. Add `User.Read` and `Mail.ReadWrite`, then save. `User.Read` supports the app's profile check; `Mail.ReadWrite` permits [draft creation](https://learn.microsoft.com/en-us/graph/api/user-post-messages?view=graph-rest-1.0). This workflow does not require `Mail.Send` or application permissions.
5. Arrange user or administrator consent as required by the organisation's policies, and use a test account with an Outlook mailbox. No client secret is needed for this desktop flow.

The receiving maintainer needs access to this registration to manage configuration and consent during handover.

## Port distinction

`http://127.0.0.1:42813` serves the app's local UI. It is not the Microsoft authentication redirect URI. MSAL Node manages its own loopback callback; the registered desktop redirect is `http://localhost`.

Keep UI port `42813` available and run one MailMagpie instance at a time.

## Local verification

From the repository root, install the committed dependencies and launch the desktop app:

```bash
npm ci
npm run desktop
```

The lockfile includes MSAL Node and matches `package.json`; no dependency migration or lockfile regeneration is required for a normal checkout.

1. Select **Sign in with Microsoft** and complete sign-in in the system browser.
2. After the success page appears, return to MailMagpie and confirm that CSV selection is enabled.
3. Upload a small fictional CSV and create a test draft. Confirm it appears in the signed-in account's Outlook Drafts folder with the expected recipients and content.
4. Repeat the sign-in and draft check using the final packaged Windows executable before handover.

`npm run dev` and `npm run preview` run the renderer in a normal browser and do not provide the Electron authentication bridge. The MSAL account and token cache are held in the running desktop process; a fresh app session requires sign-in again.
