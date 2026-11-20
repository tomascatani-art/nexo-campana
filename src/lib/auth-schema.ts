import 'server-only';
import { sql } from './db';

// Las tablas nuevas de la cuenta del dueño se crean solas la primera vez que se
// abre el panel (así no hace falta correr nada a mano en Supabase).
// Son instrucciones "si no existe": repetirlas no cambia nada.
const STEPS = [
  `alter table admin_users alter column password_hash drop not null`,
  `alter table admin_users add column if not exists google_email text`,
  `alter table admin_users add column if not exists recovery_hash text`,
  `create unique index if not exists admin_users_google_email on admin_users (lower(google_email))`,
  `create table if not exists admin_invites (
     id uuid primary key default gen_random_uuid(), token_hash text not null unique, created_by text,
     created_at timestamptz not null default now(), expires_at timestamptz not null, used_at timestamptz)`,
  `alter table admin_invites enable row level security`,
  `create table if not exists auth_config (
     id int primary key default 1 check (id = 1), google_client_id text, google_client_secret text,
     updated_at timestamptz not null default now())`,
  `alter table auth_config enable row level security`,
];

const g = globalThis as unknown as { __authSchema?: Promise<void> };

async function run() {
  // ¿Ya está todo? (una sola consulta rápida)
  const [r] = await sql<{ ok: boolean }[]>`
    select (to_regclass('public.auth_config') is not null
        and to_regclass('public.admin_invites') is not null
        and exists (select 1 from information_schema.columns where table_name = 'admin_users' and column_name = 'recovery_hash')) as ok`;
  if (r?.ok) return;
  for (const s of STEPS) {
    try {
      await sql.unsafe(s);
    } catch (e) {
      // Si otra instancia lo creó al mismo tiempo, seguimos
      const code = (e as { code?: string }).code;
      if (code !== '42P07' && code !== '23505' && code !== '42710') throw e;
    }
  }
}

export function ensureAuthSchema(): Promise<void> {
  if (!g.__authSchema) {
    g.__authSchema = run().catch((e) => {
      g.__authSchema = undefined; // reintentar la próxima vez
      throw e;
    });
  }
  return g.__authSchema;
}
