import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

/**
 * Resolves an HTTP request URL to a safe filesystem path within rootDir.
 * Rejects path traversal attempts with null.
 * Maps '/' to '/index.html' and clean URLs like '/app' to '/app.html'.
 */
export function resolveSafePath(rootDir, urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return null;

  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  // Null byte injection check
  if (decoded.includes('\0')) return null;

  // Strip query string and hash
  let cleanPath = decoded.split('?')[0].split('#')[0];

  if (cleanPath === '/' || cleanPath === '') {
    cleanPath = '/index.html';
  } else if (cleanPath === '/app') {
    cleanPath = '/app.html';
  }

  const root = path.resolve(rootDir);
  // Ensure path is relative to root without leading slashes confusing resolve
  const safeRelative = cleanPath.replace(/^[/\\]+/, '');
  const resolved = path.resolve(root, safeRelative);

  const rel = path.relative(root, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }

  return resolved;
}

export const server = http.createServer((req, res) => {
  const filePath = resolveSafePath(__dirname, req.url);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  server.listen(PORT, () => {
    console.log(`Certify static server running at http://localhost:${PORT}/`);
  });
}
