const http = require("http");
const fs = require("fs");
const path = require("path");

function startServer() {
  const dist = path.join(__dirname, "../dist");

  const server = http.createServer((req, res) => {
    let reqPath = req.url;

    // remove query strings
    reqPath = reqPath.split("?")[0];

    let filePath = path.join(dist, reqPath);

    // default route
    if (reqPath === "/") {
      filePath = path.join(dist, "index.html");
    }

    // SPA fallback
    if (!fs.existsSync(filePath)) {
      filePath = path.join(dist, "index.html");
    }

    const ext = path.extname(filePath);

    const mime = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
    };

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }

      res.writeHead(200, {
        "Content-Type": mime[ext] || "text/plain",
      });

      res.end(data);
    });
  });

  return server;
}

module.exports = { startServer };