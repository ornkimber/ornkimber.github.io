import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { build, root } from './build.mjs';

const directory = resolve(root, 'dist');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
await build();
// Rebuild on each HTML navigation so edits appear on refresh, without a watcher dependency.
let pendingBuild = Promise.resolve();
const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (path.includes('\0') || path.includes('\\')) { response.writeHead(400).end(); return; }
    const file = resolve(directory, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(`${directory}${sep}`)) { response.writeHead(403).end(); return; }
    if (file === resolve(directory, 'index.html')) {
      pendingBuild = pendingBuild.then(build, build);
      await pendingBuild;
    }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' });
    response.end(error.code === 'ENOENT' ? 'Not found' : 'Preview build failed. See the terminal for details.');
    if (error.code !== 'ENOENT') console.error(error.message);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port} (refresh after editing)`));
