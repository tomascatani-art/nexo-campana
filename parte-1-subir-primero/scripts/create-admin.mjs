// Crea un usuario administrador o cambia su contraseña.
// Uso: npm run admin -- <usuario> <contraseña> ["Nombre visible"]
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { loadEnv } from './env.mjs';

loadEnv();
const [username, password, displayName] = process.argv.slice(2);
if (!username || !password) {
  console.error('Uso: npm run admin -- <usuario> <contraseña> ["Nombre visible"]');
  process.exit(1);
}
if (password.length < 8) { console.error('La contraseña debe tener al menos 8 caracteres.'); process.exit(1); }
const url = process.env.DATABASE_URL;
const sql = postgres(url, { prepare: false, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require' });
const hash = await bcrypt.hash(password, 12);
const u = username.trim().toLowerCase();
await sql`
  insert into admin_users (username, display_name, password_hash)
  values (${u}, ${displayName || null}, ${hash})
  on conflict (username) do update set password_hash = excluded.password_hash,
    display_name = coalesce(excluded.display_name, admin_users.display_name),
    session_version = admin_users.session_version + 1`;
console.log(`✓ Usuario "${u}" listo.`);
await sql.end();
