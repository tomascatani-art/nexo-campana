import 'server-only';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta la variable de entorno DATABASE_URL');

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

const globalForDb = globalThis as unknown as { __sql?: postgres.Sql };

export const sql =
  globalForDb.__sql ??
  postgres(url, {
    prepare: false, // compatible con el pooler de Supabase (modo transacción)
    max: Number(process.env.DB_MAX) || (isLocal ? 10 : 3),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: isLocal ? false : 'require',
    onnotice: () => {},
  });

if (process.env.NODE_ENV !== 'production') globalForDb.__sql = sql;
