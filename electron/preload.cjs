const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("eMergeDAuth", {
  signIn: () => ipcRenderer.invoke("auth:sign-in"),
  signOut: () => ipcRenderer.invoke("auth:sign-out"),
  getAccount: () => ipcRenderer.invoke("auth:get-account"),
  getAccessToken: (options = {}) =>
    ipcRenderer.invoke("auth:get-access-token", options),
});

contextBridge.exposeInMainWorld("eMergeDFiles", {
  selectCsv: () => ipcRenderer.invoke("files:select-csv"),
  prepareCsvAttachments: (request) =>
    ipcRenderer.invoke("files:prepare-csv-attachments", request),
  clearCsvSource: () => ipcRenderer.invoke("files:clear-csv-source"),
  exportAllEml: (data) =>
    ipcRenderer.invoke("files:export-all-eml", data),
});
