const http = require("http");
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "public");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function getPort() {
  const portIndex = process.argv.indexOf("--port");
  if (portIndex !== -1 && process.argv[portIndex + 1]) {
    return Number(process.argv[portIndex + 1]);
  }
  return 3000;
}

function resolveRequestPath(urlPath) {
  const requestedPath = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const relativePath = safePath === "/" ? "index.html" : safePath.replace(/^[/\\]/, "");
  return path.join(PUBLIC_DIR, relativePath);
}

const server = http.createServer((req, res) => {
  const filePath = resolveRequestPath(req.url || "/");

  fs.stat(filePath, (statError, stats) => {
    let finalPath = filePath;

    if (!statError && stats.isDirectory()) {
      finalPath = path.join(filePath, "index.html");
    }

    fs.readFile(finalPath, (readError, content) => {
      if (readError) {
        const notFoundPath = path.join(PUBLIC_DIR, "index.html");
        fs.readFile(notFoundPath, (fallbackError, fallbackContent) => {
          if (fallbackError) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Arquivo nao encontrado.");
            return;
          }

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(fallbackContent);
        });
        return;
      }

      const extension = path.extname(finalPath).toLowerCase();
      const contentType = MIME_TYPES[extension] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  });
});

const port = getPort();
server.listen(port, () => {
  console.log("Servidor em http://localhost:" + port);
});
