import { createContext, useContext, useEffect, useMemo, useState } from "react";

const DesktopAuthContext = createContext(null);

function getDesktopAuthBridge() {
  if (!window.eMergeDAuth) {
    throw new Error(
      "Microsoft desktop authentication is only available when E-merge-D is running inside Electron.",
    );
  }

  return window.eMergeDAuth;
}

export function DesktopAuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const currentAccount = await getDesktopAuthBridge().getAccount();
        if (active) setAccount(currentAccount);
      } catch (error) {
        console.warn("Unable to restore Microsoft account:", error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      account,
      isAuthenticated: Boolean(account),
      isLoading,
      async signIn() {
        const signedInAccount = await getDesktopAuthBridge().signIn();
        setAccount(signedInAccount);
        return signedInAccount;
      },
      async signOut() {
        await getDesktopAuthBridge().signOut();
        setAccount(null);
      },
      async getAccessToken(options = {}) {
        const token = await getDesktopAuthBridge().getAccessToken(options);

        if (!token || typeof token !== "string") {
          throw new Error("Microsoft returned an invalid access token.");
        }

        const currentAccount = await getDesktopAuthBridge().getAccount();
        setAccount(currentAccount);
        return token;
      },
    }),
    [account, isLoading],
  );

  return (
    <DesktopAuthContext.Provider value={value}>
      {children}
    </DesktopAuthContext.Provider>
  );
}

export function useDesktopAuth() {
  const context = useContext(DesktopAuthContext);

  if (!context) {
    throw new Error("useDesktopAuth must be used inside DesktopAuthProvider.");
  }

  return context;
}
