import type { MetadataRoute } from 'next';
import { getPublicProducts, getSettings } from '@/lib/data';
import { siteUrl } from '@/lib/format';

// Se arma en cada visita con los datos de la base: la publicación no necesita conectarse a la base
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [s, products] = await Promise.all([getSettings(), getPublicProducts()]);
  const site = siteUrl(s);
  return [
    { url: `${site}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${site}/novedades`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${site}/lista-de-precios`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    ...products.map((p) => ({ url: `${site}/producto/${p.slug}`, lastModified: new Date(p.created_at), changeFrequency: 'weekly' as const, priority: 0.7 })),
  ];
}
