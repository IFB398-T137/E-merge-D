const path = require("path");
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
} = require("electron");
const { startServer } = require("./server.cjs");
const AuthProvider = require("./AuthProvider.cjs");
const { msalConfig, GRAPH_SCOPES } = require("./authConfig.cjs");
const { exportEmlFiles } = require("./emlExport.cjs");
const { createCsvAttachmentStore } = require("./csvAttachments.cjs");

const APP_PORT = 42813;

let mainWindow;
let server;
const authProvider = new AuthProvider(msalConfig);
const csvAttachmentStore = Promise.all([
  import("../src/utils/parseFile.js"),
  import("../src/utils/attachments.js"),
]).then(([{ parseCSV }, { getRowAttachmentPaths, getAttachmentValidationError }]) =>
  createCsvAttachmentStore({ parseCSV, getRowAttachmentPaths, getAttachmentValidationError }),
);

function assertMainWindowSender(event) {
  const trustedOrigin = `http://127.0.0.1:${APP_PORT}`;
  if (!mainWindow || mainWindow.isDestroyed() ||
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame ||
      !event.senderFrame.url.startsWith(`${trustedOrigin}/`)) {
    throw new Error("File access is only available to the application window.");
  }
}

function registerAuthHandlers() {
  ipcMain.handle("auth:sign-in", async () => {
    return authProvider.signIn(GRAPH_SCOPES);
  });

  ipcMain.handle("auth:sign-out", async () => {
    await authProvider.signOut();
    return true;
  });

  ipcMain.handle("auth:get-account", async () => {
    return authProvider.getPublicAccount();
  });

  ipcMain.handle("auth:get-access-token", async (_event, options = {}) => {
    return authProvider.getAccessToken(GRAPH_SCOPES, {
      forceRefresh: Boolean(options.forceRefresh),
      allowInteractive: options.allowInteractive !== false,
    });
  });
}

function registerFileHandlers() {
  ipcMain.handle("files:select-csv", async (event) => {
    assertMainWindowSender(event);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose recipient CSV",
      filters: [{ name: "CSV files", extensions: ["csv"] }],
      properties: ["openFile"],
    });

    if (result.canceled || !result.filePaths[0]) return null;
    assertMainWindowSender(event);
    return (await csvAttachmentStore).selectCsv(event.sender.id, result.filePaths[0]);
  });

  ipcMain.handle("files:prepare-csv-attachments", async (event, request) => {
    assertMainWindowSender(event);
    return (await csvAttachmentStore).prepareCsvAttachments(event.sender.id, request);
  });

  ipcMain.handle("files:clear-csv-source", async (event) => {
    assertMainWindowSender(event);
    (await csvAttachmentStore).clearCsvSource(event.sender.id);
  });

  ipcMain.handle("files:export-all-eml", async (_event, data) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose folder for exported emails",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) {
      return {
        canceled: true,
        count: 0,
      };
    }

    const folder = result.filePaths[0];

    await exportEmlFiles(
      folder,
      data.emails,
      data.subject,
      data.attachments,
    );

    return {
      canceled: false,
      count: data.emails.length,
      folder,
    };
  });
}

function createWindow() {
  const iconPath = path.join(
    __dirname,
    "../dist",
    process.platform === "win32" ? "app-icon.ico" : "app-icon.png",
  );

  if (process.platform === "darwin") {
    app.dock.setIcon(iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  const senderId = mainWindow.webContents.id;
  mainWindow.webContents.once("destroyed", () => {
    void csvAttachmentStore.then((store) => store.clearCsvSource(senderId));
  });

  server = startServer();

  server.listen(APP_PORT, "127.0.0.1", () => {
    mainWindow.loadURL(`http://127.0.0.1:${APP_PORT}`);
  });
}

app.whenReady().then(() => {
  registerAuthHandlers();
  registerFileHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});
