import type { Hours, PublicProduct, Settings } from './types';
import { siteUrl } from './format';

const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Datos estructurados para negocio local (Google). */
export function buildJsonLd(s: Settings, hours: Hours[], products: PublicProduct[]) {
  const url = siteUrl(s);
  const openingHoursSpecification = hours.flatMap((h) =>
    !h.is_open ? [] : [[h.open1, h.close1], [h.open2, h.close2]].filter(([a, b]) => a && b)
      .map(([opens, closes]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${SCHEMA_DAYS[h.day_of_week]}`, opens, closes })));
  return {
    '@context': 'https://schema.org',
    '@type': ['Store', 'WholesaleStore'],
    '@id': `${url}/#negocio`,
    name: s.business_name,
    description: s.seo_description || s.hero_subtitle || undefined,
    slogan: s.slogan || undefined,
    url,
    image: s.hero_image_id ? `${url}/img/${s.hero_image_id}` : undefined,
    logo: s.logo_image_id ? `${url}/img/${s.logo_image_id}` : `${url}/icon.svg`,
    telephone: s.phone || (s.whatsapp_number ? `+${s.whatsapp_number}` : undefined),
    email: s.email || undefined,
    priceRange: '$',
    currenciesAccepted: 'ARS',
    address: { '@type': 'PostalAddress', streetAddress: s.address || undefined, addressLocality: s.city || undefined, addressRegion: s.province || undefined, postalCode: s.postal_code || undefined, addressCountry: 'AR' },
    hasMap: `https://www.google.com/maps?q=${encodeURIComponent(s.maps_query || [s.address, s.city].filter(Boolean).join(', '))}`,
    openingHoursSpecification,
    sameAs: [s.instagram_url, s.facebook_url, s.tiktok_url, s.channel_url].filter(Boolean),
    areaServed: s.city || undefined,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Catálogo',
      itemListElement: products.slice(0, 50).map((p) => ({
        '@type': 'Offer',
        url: `${url}/producto/${p.slug}`,
        itemOffered: { '@type': 'Product', name: p.name, image: p.image_id ? `${url}/img/${p.image_id}` : undefined },
        ...(p.price != null ? { price: p.price, priceCurrency: 'ARS' } : {}),
        availability: p.availability === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      })),
    },
  };
}

export function productJsonLd(s: Settings, p: PublicProduct) {
  const url = siteUrl(s);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || undefined,
    image: [p.image_id, ...p.gallery].filter(Boolean).map((id) => `${url}/img/${id}`),
    category: p.category_name || undefined,
    brand: { '@type': 'Brand', name: s.business_name },
    offers: p.price != null ? {
      '@type': 'Offer', url: `${url}/producto/${p.slug}`, priceCurrency: 'ARS', price: p.price,
      availability: p.availability === 'out' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: s.business_name },
    } : undefined,
  };
}
