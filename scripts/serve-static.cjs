const fs = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const host = '127.0.0.1';
const startPort = Number(process.env.PORT) || 8765;
const endPort = startPort + 14;

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function isFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

async function findPort() {
  for (let port = startPort; port <= endPort; port += 1) {
    if (await isFree(port)) return port;
  }
  throw new Error(`No free local port was found between ${startPort} and ${endPort}.`);
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, body) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'content-type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    });
    res.end(body);
  });
}

function openBrowser(url) {
  const command = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];

  const child = spawn(command[0], command[1], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

function handleRequest(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(root, `.${requested}`);

  if (!filePath.startsWith(root + path.sep) && filePath !== root) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  sendFile(res, filePath);
}

async function main() {
  const port = await findPort();
  const url = `http://${host}:${port}/index.html`;
  const server = http.createServer(handleRequest);

  server.listen(port, host, () => {
    console.log('Starting Gravilog...');
    console.log('');
    console.log(`URL: ${url}`);
    console.log(`Directory: ${root}`);
    console.log('');
    console.log('Keep this window open while using Gravilog.');
    console.log('Press Ctrl+C here to stop the local server.');
    console.log('');
    openBrowser(url);
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
