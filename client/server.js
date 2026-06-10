const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  const filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST, 'index.html'), (_err2, fallback) => {
        res.writeHead(fallback ? 200 : 404, { 'Content-Type': 'text/html' });
        res.end(fallback || 'Not found');
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`listening on port ${PORT}`);
  console.log(`serving ${DIST}`);
  fs.readdir(DIST, (err, files) => {
    console.log(err ? `dist error: ${err.message}` : `dist files: ${files.join(', ')}`);
  });
});
