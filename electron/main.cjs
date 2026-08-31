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
const { exportEmlFiles } = require("./emlExporter.cjs");

const APP_PORT = 42813;

let mainWindow;
let server;
const authProvider = new AuthProvider(msalConfig);

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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  server = startServer();

  server.listen(42813, () => {
    port = server.address().port;
    mainWindow.loadURL(`http://127.0.0.1:42813`);
  });

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
