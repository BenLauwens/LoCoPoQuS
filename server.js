const fs = require("fs");
const http = require("http");
const path = require("path");
const postgres = require("postgres");
const querystring = require("querystring");

const MIME_TYPES = {
  default: "application/octet-stream",
  html: "text/html; charset=UTF-8",
  js: "application/javascript",
  css: "text/css",
  png: "image/png",
  jpg: "image/jpg",
  gif: "image/gif",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

const STATIC_PATH = process.cwd();

const HOSTNAME = '127.0.0.1';
const PORT = 8000;

const sql = postgres({
  host: HOSTNAME,
  port: 5432,
  database: 'ben',
  username: 'ben'
});

sql`do language plv8 ' load_module("locopoqus"); ';`.execute();

const toBool = [() => true, () => false];

const prepareFile = async (url) => {
  const paths = [STATIC_PATH, url];
  if (url.endsWith("/")) paths.push("index.html");
  const filePath = path.join(...paths);
  const pathTraversal = !filePath.startsWith(STATIC_PATH);
  const exists = await fs.promises.access(filePath).then(...toBool);
  const found = !pathTraversal && exists;
  const streamPath = found ? filePath : STATIC_PATH + "/static/404.html";
  const ext = path.extname(streamPath).substring(1).toLowerCase();
  const stream = fs.createReadStream(streamPath);
  return { found, ext, stream };
};

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", chunk => {
    body += chunk.toString();
  });
  req.on("end", async () => {
    const [http_path, search] = req.url.split("?");
    console.log(http_path);
    if (http_path.startsWith("/static")) {
      const file = await prepareFile(req.url);
      const statusCode = file.found ? 200 : 404;
      const mimeType = MIME_TYPES[file.ext] || MIME_TYPES.default;
      res.writeHead(statusCode, { "Content-Type": mimeType });
      file.stream.pipe(res);
    } else {
      console.log(search + ' ' + body);
      const parameters = querystring.parse(search);
      const data = await sql`SELECT locopoqus.response(${http_path}, ${req.method}, ${JSON.stringify(parameters)}, ${body}) AS html`.execute();
      let content = data[0].html;
      if (content === "") {
        const file = await prepareFile("/static/404.html");
        res.writeHead(404, { "Content-Type": "text/html" });
        file.stream.pipe(res);
      } else {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.end(content);
      }
    }
  });
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});
