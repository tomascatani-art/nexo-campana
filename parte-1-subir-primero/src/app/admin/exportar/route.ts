import { getCurrentAdmin } from '@/lib/auth';
import { getProducts } from '@/lib/data';

// Exporta el inventario a CSV (se abre con Excel o Google Sheets).
export async function GET() {
  if (!(await getCurrentAdmin())) return new Response('No autorizado', { status: 401 });
  const rows = await getProducts();
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Código', 'Producto', 'Variante', 'Categoría', 'Precio', 'Precio anterior', 'Costo', 'Stock', 'Stock mínimo', 'Vendidos 30 días', 'Visible'];
  const lines = [head.join(';')];
  for (const p of rows) {
    const base = [p.sku, p.name];
    const tail = (stock: number, v: string | null, price: number | null) => [v, p.category_name, price ?? p.price, p.old_price, p.cost, stock, p.min_stock, p.sold_30d ?? 0, p.active ? 'Sí' : 'No'];
    if (p.variants?.length) for (const v of p.variants) lines.push([...base, ...tail(v.stock_qty, v.name, v.price)].map(esc).join(';'));
    else lines.push([...base, ...tail(p.stock_qty, null, null)].map(esc).join(';'));
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="stock-${date}.csv"`, 'Cache-Control': 'no-store' },
  });
}
