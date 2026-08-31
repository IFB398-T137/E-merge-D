const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("eMergeDAuth", {
  signIn: () => ipcRenderer.invoke("auth:sign-in"),
  signOut: () => ipcRenderer.invoke("auth:sign-out"),
  getAccount: () => ipcRenderer.invoke("auth:get-account"),
  getAccessToken: (options = {}) =>
    ipcRenderer.invoke("auth:get-access-token", options),
});

contextBridge.exposeInMainWorld("eMergeDFiles", {
  exportAllEml: (data) =>
    ipcRenderer.invoke("files:export-all-eml", data),
});