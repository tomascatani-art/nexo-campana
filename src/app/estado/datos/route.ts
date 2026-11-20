import { getPublicData } from '@/lib/data';

export const dynamic = 'force-dynamic';

// Forma de los datos públicos (para diagnóstico). Los textos de configuración se reemplazan por su largo.
export async function GET() {
  const d = await getPublicData();
  const s: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d.settings)) {
    s[k] = typeof v === 'string' ? `<texto ${v.length}>` : v instanceof Date ? `<fecha ${isNaN(v.getTime()) ? 'INVALIDA' : 'ok'}>` : Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : typeof x)) : v && typeof v === 'object' ? `<objeto ${JSON.stringify(v).length}>` : v;
  }
  const body = { settings: s, hours: d.hours, specials: d.specials, categories: d.categories.map((c) => ({ ...c, description: undefined })), reviews: { count: d.reviews.count, avg: d.reviews.avg, n: d.reviews.list.length }, products: d.products.map((p) => ({ ...p, description: p.description ? `<texto ${p.description.length}>` : null })) };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
