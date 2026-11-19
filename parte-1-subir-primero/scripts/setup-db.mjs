// Crea las tablas y (si la base está vacía) carga el contenido inicial de ejemplo.
// Uso: npm run db:setup            (no toca datos existentes)
//      npm run db:setup -- --force-seed   (BORRA el catálogo y recarga el ejemplo)
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { makeBrandArt, makeProductArt } from './art.mjs';
import bcrypt from 'bcryptjs';
import { loadEnv } from './env.mjs';

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) { console.error('Falta DATABASE_URL (ver .env.example)'); process.exit(1); }
const sql = postgres(url, { prepare: false, onnotice: () => {}, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require' });

async function save(a) {
  const [r] = await sql`insert into images (data, mime, width, height, size_bytes) values (${a.data}, 'image/webp', ${a.width}, ${a.height}, ${a.data.length}) returning id`;
  return r.id;
}
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

try {
  await sql.unsafe(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  console.log('✓ Esquema aplicado');

  const [{ count }] = await sql`select count(*)::int as count from site_settings`;
  if (count > 0 && !process.argv.includes('--force-seed')) {
    console.log('• La base ya tiene datos: no se carga contenido de ejemplo.');
  } else {
    if (count > 0) await sql`truncate site_settings, opening_hours, special_days, shipping_waitlist, reviews, product_stats, categories, products, product_variants, stock_movements, orders, images cascade`;
    const hero = await save(await makeBrandArt({ w: 1920, h: 1080, icons: ['tv', 'blender', 'headphones', 'microwave', 'fan', 'coffee', 'speaker', 'cooking-pot'] }));
    const about = await save(await makeBrandArt({ w: 1200, h: 900, icons: ['package', 'truck', 'store', 'badge-check'] }));

    await sql`insert into site_settings ${sql({
      id: 1,
      business_name: 'NEXO Campana',
      business_kind: 'Mayorista y minorista',
      slogan: 'Grandes productos, mejores precios',
      tagline: 'Electro · Hogar · Tecnología',
      hero_title: 'Grandes productos, mejores precios',
      hero_subtitle: 'Mayorista y minorista de electro, hogar y tecnología en Campana. Armá tu pedido, mirá el total al instante y mandalo por WhatsApp.',
      hero_welcome: 'Bienvenidos',
      hero_image_id: hero,
      about_title: 'Calidad, confianza y buenos precios',
      about_text: 'NEXO es mayorista y minorista en Campana, para equipar tu casa o tu negocio. Trabajamos con stock propio de electro, bazar, hogar y tecnología, y renovamos la mercadería todas las semanas.\n\nVení a recorrer el depósito o armá tu lista desde la web: te la preparamos y la retirás sin vueltas.',
      about_image_id: about,
      whatsapp_number: '',
      channel_url: '',
      phone: '',
      email: '',
      address: 'Colectora Norte 1668',
      city: 'Campana',
      province: 'Buenos Aires',
      postal_code: '2804',
      maps_query: 'Colectora Norte 1668, Campana, Buenos Aires, Argentina',
      instagram_url: 'https://www.instagram.com/nexocampana/',
      price_note: 'Precios en pesos argentinos, sujetos a cambios sin previo aviso. Consultá disponibilidad por WhatsApp.',
      list_note: 'No se cobra nada online: armás tu pedido, sabés cuánto vas a gastar y te lo confirmamos por WhatsApp. Pagás al retirar o por transferencia.',
      share_footer: '📍 Colectora Norte 1668, Campana\n🕙 Lunes a sábado de 10 a 17:30',
      announcement_text: '🚚 Mercadería nueva todas las semanas · Comprá por unidad o por cantidad',
      announcement_on: true,
      pickup_enabled: true,
      shipping_enabled: false,
      shipping_mode: 'proximamente', // todavía no hacen envíos: cartel "próximamente" + lista de interesados
      shipping_zones: sql.json([{ name: 'Campana', cost: 3500 }, { name: 'Zárate', cost: 5500 }, { name: 'Otras zonas cercanas', cost: null }]),
      shipping_cost: 4500,
      free_shipping_from: 150000,
      shipping_info: 'Envíos en Campana y Zárate en 24/48 hs. Otras zonas: consultá costo por WhatsApp.',
      payment_methods: ['efectivo', 'transferencia', 'dolares', 'debito', 'credito'],
      transfer_info: 'Alias: NEXO.CAMPANA (a confirmar)',
      transfer_info_public: false, // NEXO pide que el cliente solicite el alias por WhatsApp
      transfer_surcharge_pct: 5,
      transfer_notice: 'Pedí el alias por WhatsApp ANTES de transferir. Caso contrario, no se aceptan reclamos.',
      refund_policy: 'El dinero no se devuelve. No hay excepciones: son las políticas del local.',
      admission_notice: 'Nos reservamos el derecho de admisión y permanencia.',
      usd_rate: 1450, // cotización de ejemplo: el dueño la actualiza cada día desde el tablero
      usd_rate_at: sql`now()`,
      seo_title: 'NEXO Campana | Electro, hogar y tecnología, mayorista y minorista en Campana',
      seo_description: 'Mayorista y minorista en Campana: electrodomésticos, bazar, hogar y tecnología a los mejores precios. Mirá el catálogo con precios, armá tu lista y consultá por WhatsApp. Colectora Norte 1668.',
      site_url: process.env.NEXT_PUBLIC_SITE_URL || null,
    })}`;

    const hours = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day_of_week: d, is_open: d !== 0, open1: d !== 0 ? '10:00' : null, close1: d !== 0 ? '17:30' : null, open2: null, close2: null }));
    await sql`insert into opening_hours ${sql(hours)}`;
    // Feriados de ejemplo (el dueño los cambia en Horarios → Feriados y días especiales)
    await sql`insert into special_days ${sql([
      { day: '2026-12-08', is_open: false, reason: 'Feriado: Inmaculada Concepción' },
      { day: '2026-12-24', is_open: true, open1: '10:00', close1: '13:00', reason: 'Nochebuena' },
      { day: '2026-12-25', is_open: false, reason: 'Navidad' },
      { day: '2026-12-31', is_open: true, open1: '10:00', close1: '13:00', reason: 'Fin de año' },
      { day: '2027-01-01', is_open: false, reason: 'Año Nuevo' },
    ].map((d) => ({ open1: null, close1: null, ...d })), 'day', 'is_open', 'open1', 'close1', 'reason')} on conflict (day) do nothing`;

    const cats = [['Electro', 'plug-zap'], ['Cocina', 'cooking-pot'], ['Bazar y vajilla', 'utensils'], ['Hogar', 'sofa'], ['Tecnología', 'headphones'], ['Celulares', 'smartphone'], ['Climatización', 'fan']];
    const catIds = {};
    let k = 0;
    for (const [name, icon] of cats) {
      const image_id = await save(await makeProductArt({ icon, seed: k + 2, size: 600 }));
      const [r] = await sql`insert into categories ${sql({ name, slug: slugify(name), icon, image_id, sort_order: k++ * 10 })} returning id`;
      catIds[name] = r.id;
    }
    await sql`update categories set transfer_surcharge_pct = 10 where name = 'Celulares'`; // recargo propio: 10% en celulares

    // [nombre, categoría, ícono, precio, precio anterior, unidad, mayorista cant, mayorista precio, stock, destacado, descripción]
    const products = [
      ['Pava eléctrica 1,7 L acero', 'Electro', 'coffee', 18999, 23999, 'c/u', 6, 16999, 24, true, 'Corte automático, base 360° y visor de nivel. 2200 W.'],
      ['Freidora de aire 4 L digital', 'Electro', 'cooking-pot', 74999, 89999, 'c/u', 3, 69999, 8, true, 'Panel táctil, 8 programas, canasto antiadherente apto lavavajillas.'],
      ['Licuadora 1,5 L 600 W', 'Electro', 'blender', 32999, null, 'c/u', 4, 29999, 12, false, 'Jarra de vidrio, 5 velocidades + pulsador.'],
      ['Microondas 20 L', 'Electro', 'microwave', 129999, 149999, 'c/u', null, null, 3, true, '700 W, 5 niveles de potencia, descongelado por peso.'],
      ['Cafetera de filtro 12 tazas', 'Cocina', 'coffee', 27999, null, 'c/u', 4, 25499, 10, false, 'Jarra de vidrio, sistema antigoteo y placa calefactora.'],
      ['Set de sartenes antiadherentes x3', 'Cocina', 'cooking-pot', 39999, 46999, 'set', 3, 36999, 6, false, '20, 24 y 28 cm. Aptas para todo tipo de cocina.'],
      ['Juego de vajilla 18 piezas', 'Bazar y vajilla', 'utensils', 45999, null, 'set', 2, 42999, 9, true, '6 platos playos, 6 hondos y 6 de postre. Porcelana blanca.'],
      ['Copas de vidrio x6', 'Bazar y vajilla', 'wine', 12999, null, 'x6', 5, 11499, 30, false, 'Copa de vino 350 ml. Ideal eventos y regalería.'],
      ['Fuente para horno redonda 28 cm', 'Bazar y vajilla', 'soup', 9999, null, 'c/u', 6, 8499, 2, false, 'Cerámica blanca apta horno y microondas.'],
      ['Ventilador de pie 20"', 'Climatización', 'fan', 54999, 62999, 'c/u', 3, 51999, 14, true, '3 velocidades, oscilante, altura regulable.'],
      ['Turbo ventilador 16"', 'Climatización', 'air-vent', 38999, null, 'c/u', 3, 35999, 0, false, 'Gran caudal de aire, inclinación regulable.'],
      ['Celular 6,5" 128 GB', 'Celulares', 'smartphone', 289999, null, 'c/u', null, null, 6, false, 'Pantalla 6,5", 128 GB, cámara doble, liberado.'],
      ['Auriculares Bluetooth', 'Tecnología', 'headphones', 15999, 19999, 'c/u', 10, 13499, 40, true, 'Hasta 20 h de batería, manos libres y estuche de carga.'],
      ['Parlante portátil Bluetooth', 'Tecnología', 'speaker', 24999, null, 'c/u', 5, 22499, 18, false, 'Resistente al agua, radio FM y entrada USB.'],
      ['Smart TV 43" Full HD', 'Tecnología', 'tv', 389999, 429999, 'c/u', null, null, 4, true, 'Android TV, Wi-Fi, 3 HDMI. Garantía oficial.'],
      ['Lámpara de escritorio LED', 'Hogar', 'lamp-desk', 13999, null, 'c/u', 6, 12499, 22, false, 'Brazo flexible, 3 tonos de luz, carga USB.'],
      ['Organizador de placard x3', 'Hogar', 'package', 8999, null, 'set', 10, 7499, 50, false, 'Cajas plegables de tela con visor.'],
    ];
    let i = 0;
    const ids = {};
    for (const [name, cat, icon, price, old_price, unit_label, bulk_qty, bulk_price, stock, featured, description] of products) {
      const image_id = await save(await makeProductArt({ icon, seed: i }));
      const [p] = await sql`insert into products ${sql({
        slug: slugify(name), name, category_id: catIds[cat], description, image_id, price, old_price, unit_label,
        bulk_qty, bulk_price, cost: Math.round(price * 0.68), stock_qty: stock, min_stock: 3, featured, is_new: i < 6,
        sort_order: i * 10, sku: `NX-${String(100 + i)}`,
        created_at: sql`now() - ${(i % 8) + ' days'}::interval`,
      })} returning id`;
      await sql`insert into stock_movements ${sql({ product_id: p.id, kind: 'entrada', qty: stock, note: 'Stock inicial', created_by: 'sistema', created_at: new Date(Date.now() - 20 * 864e5) })}`;
      // ventas de ejemplo repartidas en las últimas semanas (para que el tablero tenga datos)
      const sold = [9, 4, 6, 2, 5, 3, 7, 12, 3, 8, 6, 14, 5, 2, 4, 10][i % 16];
      for (let d = 0; d < sold; d++) {
        await sql`insert into stock_movements ${sql({ product_id: p.id, kind: 'venta', qty: -1, unit_price: price, note: 'Venta en local', created_by: 'sistema', created_at: new Date(Date.now() - ((i * 7 + d * 3) % 27 + 0.3) * 864e5) })}`;
      }
      await sql`update stock_movements set qty = ${stock + sold} where product_id = ${p.id} and kind = 'entrada'`;
      // Variantes de ejemplo
      const variants = { 'Auriculares Bluetooth': ['Color', [['Negro', 18], ['Blanco', 14], ['Rosa', 8]]], 'Pava eléctrica 1,7 L acero': ['Color', [['Acero', 16], ['Negro mate', 8]]] }[name];
      if (variants) {
        await sql`update products set variant_label = ${variants[0]} where id = ${p.id}`;
        let v = 0;
        for (const [vn, vq] of variants[1]) await sql`insert into product_variants ${sql({ product_id: p.id, name: vn, stock_qty: vq, sort_order: v++ * 10 })}`;
      }
      ids[name] = { id: p.id, price };
      i++;
    }

    // Pedidos de ejemplo (para ver el panel funcionando)
    const mk = async (code, name, phone, delivery, items, status, hoursAgo) => {
      const lines = items.map(([n, qty]) => ({ product_id: ids[n].id, variant_id: null, name: n, variant: null, qty, unit_price: ids[n].price, subtotal: ids[n].price * qty }));
      const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
      const shipping = delivery === 'envio' ? (subtotal >= 150000 ? 0 : 4500) : null;
      const at = new Date(Date.now() - hoursAgo * 3600e3);
      await sql`insert into orders ${sql({ code, customer_name: name, customer_phone: phone, delivery_method: delivery, address: delivery === 'envio' ? 'Av. Rivadavia 1234, Campana' : null, payment_method: 'transferencia', items: sql.json(lines), subtotal, shipping_cost: shipping, total: subtotal + (shipping ?? 0), status, stock_applied: false, history: sql.json([{ status: 'pendiente', at: at.toISOString(), by: 'cliente' }]), created_at: at, updated_at: at })}`;
    };
    if (process.argv.includes('--demo')) { // pedidos de ejemplo: solo en la demo, nunca en la web publicada
      await mk('1042', 'María González', '3489 15-555123', 'retiro', [['Juego de vajilla 18 piezas', 1], ['Copas de vidrio x6', 2]], 'pendiente', 1.5);
      await mk('1041', 'Lucas Fernández', '3489 15-444987', 'envio', [['Freidora de aire 4 L digital', 1], ['Pava eléctrica 1,7 L acero', 1]], 'pendiente', 5);
      await mk('1040', 'Bazar Don Luis (revendedor)', '3487 15-222333', 'retiro', [['Copas de vidrio x6', 10], ['Organizador de placard x3', 12]], 'pendiente', 26);
      await mk('1035', 'María González', '3489 15-555123', 'retiro', [['Freidora de aire 4 L digital', 1]], 'entregado', 24 * 9);
      await mk('1031', 'Bazar Don Luis (revendedor)', '3487 15-222333', 'retiro', [['Copas de vidrio x6', 12], ['Juego de vajilla 18 piezas', 3]], 'entregado', 24 * 16);
    }
    // Oferta programada de ejemplo: activa ahora, termina en 3 días
    await sql`update products set offer_price = round(price * 0.85 / 100) * 100, offer_from = now() - interval '1 hour', offer_until = now() + interval '3 days' where name = 'Pava eléctrica 1,7 L acero'`;

    if (process.argv.includes('--demo')) {
      // Solo en la DEMO: opiniones y visitas inventadas para que se vean esas pantallas con datos.
      // (Con una base real, las opiniones las dejan los clientes y las aprueba el dueño.)
      await sql`insert into reviews ${sql([
        { name: 'Cliente de prueba 1', rating: 5, text: '[DEMO] Ejemplo de opinión publicada: así se ve en la web.', status: 'publicada' },
        { name: 'Cliente de prueba 2', rating: 4, text: '[DEMO] Otro ejemplo de opinión aprobada por el dueño.', status: 'publicada' },
        { name: 'Cliente de prueba 3', rating: 5, text: '[DEMO] Ejemplo de opinión pendiente: el dueño la aprueba o la oculta desde el panel.', status: 'pendiente' },
      ])}`;
      const all = await sql`select id from products order by sort_order`;
      for (const [k, p] of all.entries()) {
        for (let d = 0; d < 10; d++) {
          const views = [14, 3, 9, 1, 6, 0, 11, 22, 2, 8, 5, 18, 4, 0, 7, 12][k % 16];
          if (!views) continue;
          await sql`insert into product_stats (product_id, day, views, adds) values (${p.id}, (now() at time zone 'America/Argentina/Buenos_Aires')::date - ${d}::int, ${Math.max(0, views - d)}, ${Math.max(0, Math.round((views - d) / 4))}) on conflict do nothing`;
        }
      }
    }
    console.log('✓ Contenido de ejemplo cargado');
  }

  // Primer usuario del panel en la publicación (Netlify): solo si todavía no hay ninguno.
  // La contraseña llega por variable de entorno y se guarda cifrada (bcrypt), nunca en texto plano.
  const [{ admins }] = await sql`select count(*)::int as admins from admin_users`;
  if (admins === 0 && process.env.ADMIN_USER && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 8) throw new Error('ADMIN_PASSWORD tiene que tener al menos 8 caracteres.');
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
    await sql`insert into admin_users (username, display_name, password_hash) values (${process.env.ADMIN_USER.trim().toLowerCase()}, ${'Dueño'}, ${hash})`;
    console.log(`✓ Usuario del panel "${process.env.ADMIN_USER.trim().toLowerCase()}" creado. Ya podés borrar ADMIN_PASSWORD de Netlify.`);
  } else if (admins === 0) {
    console.log('• Todavía no hay usuario del panel: cargá ADMIN_USER y ADMIN_PASSWORD en Netlify y volvé a publicar.');
  }
} catch (e) {
  console.error('✗ Error:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
