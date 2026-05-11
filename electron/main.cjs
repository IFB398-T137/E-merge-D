const { app, BrowserWindow } = require("electron");
const { startServer } = require("./server.cjs");

let mainWindow;
let server;
let port;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // wait until server is ready, then load it
  server = startServer();

  server.listen(0, () => {
    port = server.address().port;
    mainWindow.loadURL(`http://127.0.0.1:${port}`);
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) server.close();
  if (process.platform !== "darwin") app.quit();
});