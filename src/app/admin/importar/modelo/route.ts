import { getCurrentAdmin } from '@/lib/auth';

// Planilla modelo para la carga masiva (CSV: se abre con Excel o Google Sheets).
export async function GET() {
  if (!(await getCurrentAdmin())) return new Response('No autorizado', { status: 401 });
  const rows = [
    ['Código', 'Producto', 'Categoría', 'Precio', 'Precio anterior', 'Costo', 'Stock', 'Descripción'],
    ['NX-500', 'Sartén Dinax 24 cm antiadherente', 'Cocina', '36500', '', '24000', '12', 'Antiadherente. Apta todas las cocinas. Mango soft touch'],
    ['NX-501', 'Ventilador de pie 20"', 'Clima', '89999', '99999', '61000', '6', '5 aspas, 3 velocidades'],
  ];
  return new Response('﻿' + rows.map((r) => r.join(';')).join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="planilla-modelo-nexo.csv"', 'Cache-Control': 'no-store' },
  });
}
