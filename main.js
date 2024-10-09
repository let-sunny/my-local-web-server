const {
  app,
  nativeImage,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");

let servers = {};

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 500,
    resizable: false, // Make the window non-resizable
    icon: path.join(__dirname, "assets", "icon@2x.icns"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  Object.values(servers).forEach((server) => server.close());
});

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result;
});

ipcMain.on("start-server", (event, { name, path: folderPath, port }) => {
  const startServer = (name, port, folderPath) => {
    const server = http.createServer((_req, res) => {
      const filePath = path.join(folderPath, "index.html");
      fs.readFile(filePath, (_error, content) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content, "utf-8");
      });
    });

    server.listen(port, () => {
      console.log(`${name} server is running on http://localhost:${port}`);
    });

    servers[name] = server;
  };

  startServer(name, port, path.resolve(folderPath));
});

ipcMain.on("stop-server", (event, name) => {
  if (servers[name]) {
    servers[name].close(() => {
      console.log(`${name} server stopped`);
      delete servers[name];
    });
  }
});

ipcMain.on("open-browser", (event, url) => {
  shell.openExternal(url);
});

const image = nativeImage.createFromPath(app.getAppPath() + "/assets/icon.png");
app.dock.setIcon(image);
