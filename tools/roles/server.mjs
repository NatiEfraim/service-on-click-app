import { existsSync } from 'node:fs';
if (process.env.NODE_ENV === 'production' || existsSync('/.dockerenv') || existsSync('/run/.containerenv')) {
  throw new Error('Local-only roles tool cannot run in production or a container.');
}
// Local role switcher: a page on http://localhost:3001 that shows every user and sets one's role and booking types,
// so testing as another kind of user does not need a terminal command each time.
// It only runs the API's own `php artisan users:permissions` (local-only) in the API folder; nothing in the API changes.
//   npm run roles               (API folder: ../service-on-click-api, or set API_DIR)
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(process.env.API_DIR ?? path.join(here, '..', '..', '..', 'service-on-click-api'));
const PORT = Number(process.env.ROLES_PORT ?? 3001);
const HOST = '127.0.0.1'; // this machine only

const ROLES = new Set(['super_admin', 'admin', 'approver', 'vice_approver', 'user', 'transportation_control_officer']);

/** Runs `php artisan users:permissions ...args --json` in the API folder (arguments passed as a list: no shell). */
function artisan(args) {
  return new Promise((resolve, reject) => {
    execFile('php', ['artisan', 'users:permissions', ...args, '--json'], { cwd: API_DIR, timeout: 60_000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) return reject(new Error((stderr || stdout || error.message).trim()));
      try {
        // the JSON is the last line (artisan may print notices before it)
        resolve(JSON.parse(stdout.trim().split(/\r?\n/).pop()));
      } catch {
        reject(new Error(`Unexpected output: ${stdout.trim().slice(0, 300)}`));
      }
    });
  });
}

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 10_000) req.destroy();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      return send(res, 200, await readFile(path.join(here, 'index.html'), 'utf8'), 'text/html; charset=utf-8');
    }

    if (req.method === 'GET' && req.url === '/api/state') {
      return send(res, 200, await artisan([]));
    }

    if (req.method === 'POST' && req.url === '/api/set') {
      const { personal_number: personalNumber, role, types } = JSON.parse((await readBody(req)) || '{}');
      // validated here so only known values ever reach the command line
      if (!/^\d{5,9}$/.test(String(personalNumber ?? ''))) return send(res, 400, { error: 'מספר אישי לא תקין' });
      if (!ROLES.has(role)) return send(res, 400, { error: 'תפקיד לא מוכר' });
      if (!Array.isArray(types) || !types.every((id) => Number.isInteger(id) && id > 0)) return send(res, 400, { error: 'תחומים לא תקינים' });

      const args = [String(personalNumber), `--role=${role}`];
      // the super admin covers everything through the role; a plain user may have no booking type at all;
      // a managing role needs at least one (a commander of nothing means nothing)
      if (role === 'super_admin') {
        args.push('--types=all');
      } else if (types.length > 0) {
        args.push(`--types=${types.join(',')}`);
      } else if (role === 'user') {
        args.push('--types=none');
      } else {
        return send(res, 400, { error: 'לתפקיד ניהולי יש לבחור לפחות תחום אחד' });
      }
      return send(res, 200, await artisan(args));
    }

    send(res, 404, { error: 'Not found' });
  } catch (error) {
    send(res, 500, { error: error.message });
  }
}).listen(PORT, HOST, () => {
  console.log(`Role switcher: http://localhost:${PORT}  (API folder: ${API_DIR})`);
});
