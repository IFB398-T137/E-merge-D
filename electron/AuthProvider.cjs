const {
  PublicClientApplication,
  InteractionRequiredAuthError,
} = require("@azure/msal-node");
const { shell } = require("electron");

function publicAccount(account) {
  if (!account) return null;

  return {
    homeAccountId: account.homeAccountId,
    localAccountId: account.localAccountId,
    environment: account.environment,
    tenantId: account.tenantId,
    username: account.username,
    name: account.name || account.username || "Microsoft user",
  };
}

class AuthProvider {
  constructor(msalConfig) {
    this.clientApplication = new PublicClientApplication(msalConfig);
    this.cache = this.clientApplication.getTokenCache();
    this.account = null;
  }

  async getAccount() {
    if (this.account) return this.account;

    const accounts = await this.cache.getAllAccounts();
    this.account = accounts[0] || null;
    return this.account;
  }

  async acquireInteractive(scopes) {
    const response = await this.clientApplication.acquireTokenInteractive({
      scopes,
      openBrowser: async (url) => {
        await shell.openExternal(url);
      },
      successTemplate:
        "<h1>Signed in successfully</h1><p>You can close this browser window and return to E-merge-D.</p>",
      errorTemplate:
        "<h1>Sign-in failed</h1><p>Return to E-merge-D for details.</p>",
    });

    this.account = response.account || null;
    return response;
  }

  async signIn(scopes) {
    const response = await this.acquireInteractive(scopes);
    return publicAccount(response.account);
  }

  async getPublicAccount() {
    return publicAccount(await this.getAccount());
  }

  async getAccessToken(scopes, { forceRefresh = false, allowInteractive = true } = {}) {
    const account = await this.getAccount();

    if (!account) {
      if (!allowInteractive) {
        throw new Error("No Microsoft account is signed in.");
      }

      const response = await this.acquireInteractive(scopes);
      return response.accessToken;
    }

    try {
      const response = await this.clientApplication.acquireTokenSilent({
        scopes,
        account,
        forceRefresh,
      });

      if (!response?.accessToken) {
        throw new Error("Microsoft returned an empty access token.");
      }

      this.account = response.account || account;
      return response.accessToken;
    } catch (error) {
      const interactionRequired =
        error instanceof InteractionRequiredAuthError ||
        error?.errorCode === "no_tokens_found" ||
        error?.errorCode === "no_account_in_silent_request";

      if (!interactionRequired || !allowInteractive) {
        throw error;
      }

      const response = await this.acquireInteractive(scopes);
      return response.accessToken;
    }
  }

  async signOut() {
    const account = await this.getAccount();
    if (!account) return;

    await this.cache.removeAccount(account);
    this.account = null;
  }
}

module.exports = AuthProvider;
