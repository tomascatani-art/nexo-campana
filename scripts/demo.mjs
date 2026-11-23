// MODO DEMO: levanta la web completa (tienda + panel) en tu computadora SIN Supabase ni Vercel.
// Usa una base PostgreSQL embebida (PGlite) que se guarda en la carpeta .demo-db
// Uso:  npm install   y después   npm run demo
//       npm run demo -- --reset   (borra la base demo y vuelve a cargar el ejemplo)
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const dir = path.join(root, '.demo-db');
const PORT = 54329;
const WEB = Number(process.env.PORT) || 3000;

if (process.argv.includes('--reset')) rmSync(dir, { recursive: true, force: true });
const firstRun = !existsSync(path.join(dir, 'data'));
mkdirSync(dir, { recursive: true });
const secretFile = path.join(dir, 'secret');
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString('base64url'));

console.log('\n  NEXO · modo demo\n  ─────────────────');
console.log('  • Iniciando base de datos local…');
const db = await PGlite.create(path.join(dir, 'data'));
const server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1', maxConnections: 8 });
await server.start();

const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres`,
  AUTH_SECRET: readFileSync(secretFile, 'utf8'),
  NEXT_PUBLIC_SITE_URL: `http://localhost:${WEB}`,
  DB_MAX: '1',
  NEXO_DEMO: '1', // la demo conserva los números de stock de ejemplo
  NEXT_TELEMETRY_DISABLED: '1',
};
const run = (cmd, args) => new Promise((res, rej) => {
  const p = spawn(cmd, args, { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
  p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${cmd} ${args.join(' ')} terminó con error ${c}`))));
});

try {
  await run('node', ['scripts/setup-db.mjs', '--demo']);
  if (firstRun) await run('node', ['scripts/create-admin.mjs', 'nexo', 'Nexo2026demo', 'Dueño NEXO']);
  if (!existsSync(path.join(root, '.next', 'BUILD_ID')) || process.argv.includes('--build')) {
    console.log('  • Preparando la web (la primera vez tarda 1 o 2 minutos)…');
    await run('npx', ['next', 'build']);
  }
  console.log(`\n  ✔ Listo. Abrí en el navegador:\n\n     Tienda:  http://localhost:${WEB}\n     Panel:   http://localhost:${WEB}/admin   (usuario: nexo · contraseña: Nexo2026demo)\n\n  Para ver la web desde tu celular (misma red Wi-Fi), usá la IP de esta computadora en lugar de "localhost".\n  Para cerrar: Ctrl + C\n`);
  const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', `http://localhost:${WEB}`]] : process.platform === 'darwin' ? ['open', [`http://localhost:${WEB}`]] : ['xdg-open', [`http://localhost:${WEB}`]];
  setTimeout(() => { try { spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).on('error', () => {}); } catch { /* sin navegador */ } }, 2500);
  await run('npx', ['next', 'start', '-p', String(WEB), '-H', '0.0.0.0']);
} catch (e) {
  console.error('\n  ✗', e.message);
  process.exitCode = 1;
} finally {
  await server.stop();
  await db.close();
}
