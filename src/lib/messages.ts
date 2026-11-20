import { formatPrice } from './pricing';
import { groupHours } from './format';
import type { Hours, Order, Settings } from './types';

export type QuickReply = { title: string; text: string };

/** Respuestas rápidas que vienen cargadas (el dueño las cambia en el panel). */
export const DEFAULT_REPLIES: QuickReply[] = [
  { title: 'Cómo llegar', text: '¡Hola {nombre}! Estamos en {direccion}. Te dejo el mapa: {mapa}' },
  { title: 'Horarios', text: '¡Hola {nombre}! Nuestro horario: {horario}. ¡Te esperamos!' },
  { title: 'Hay stock', text: '¡Hola {nombre}! Sí, tenemos stock. ¿Te lo separamos? Podés armar tu pedido acá: {web}' },
  { title: 'Sin stock', text: '¡Hola {nombre}! Por ahora no nos queda, pero entra mercadería todas las semanas. ¿Querés que te avisemos?' },
  { title: 'Medios de pago', text: '¡Hola {nombre}! Aceptamos: {pagos}.' },
  { title: 'Catálogo', text: '¡Hola {nombre}! Acá tenés todo el catálogo con precios: {web}' },
];

export function waIntl(phone: string) {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('54') ? d : `549${d.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1')}`;
}

const PAY: Record<string, string> = { efectivo: 'efectivo', transferencia: 'transferencia', debito: 'débito', credito: 'crédito', mercadopago: 'Mercado Pago' };

export function fillTemplate(t: string, s: Settings, hours: Hours[], site: string, name = '') {
  const address = [s.address, s.city].filter(Boolean).join(', ');
  return t
    .replaceAll('{nombre}', name)
    .replaceAll('{negocio}', s.business_name)
    .replaceAll('{direccion}', address)
    .replaceAll('{mapa}', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.maps_query || address)}`)
    .replaceAll('{horario}', groupHours(hours).map((g) => `${g.label}: ${g.text}`).join(' · '))
    .replaceAll('{web}', site)
    .replaceAll('{pagos}', (s.payment_methods ?? []).map((m) => PAY[m] ?? m).join(', '))
    .replace(/¡Hola\s+!/g, '¡Hola!');
}

/** Mensaje para avisarle al cliente cómo va su pedido. */
export function statusMessage(o: Pick<Order, 'code' | 'customer_name' | 'total' | 'delivery_method' | 'address' | 'status'>, s: Settings, site: string) {
  const n = o.customer_name.split(' ')[0];
  const total = formatPrice(o.total);
  const where = [s.address, s.city].filter(Boolean).join(', ');
  switch (o.status) {
    case 'confirmado': return `¡Hola ${n}! 👋 Confirmamos tu pedido #${o.code} por ${total}. ${o.delivery_method === 'envio' ? 'Te avisamos cuando salga para tu casa 🚚' : 'Te avisamos cuando esté listo para retirar.'}`;
    case 'preparando': return `¡Hola ${n}! Ya estamos preparando tu pedido #${o.code} 📦`;
    case 'enviado': return o.delivery_method === 'envio'
      ? `¡Hola ${n}! Tu pedido #${o.code} ya salió para ${o.address ?? 'tu dirección'} 🚚 Total: ${total}.`
      : `¡Hola ${n}! Tu pedido #${o.code} está listo para retirar ✅ Te esperamos en ${where}. Total: ${total}.`;
    case 'entregado': return `¡Gracias por tu compra, ${n}! 🙌 Si te gustó la atención, dejanos tu opinión acá: ${site}/#opiniones`;
    case 'vencido': return `Hola ${n}, te escribimos de ${s.business_name} por tu pedido #${o.code}: como no pasaste a retirarlo a tiempo, se canceló. Si todavía lo querés, escribinos y vemos si queda stock.`;
    case 'cancelado': return `Hola ${n}, te escribimos por tu pedido #${o.code}: lo tuvimos que cancelar. Cualquier duda, escribinos.`;
    default: return `¡Hola ${n}! Recibimos tu pedido #${o.code} por ${total}. En breve te lo confirmamos.`;
  }
}

/** Saludo del día para el canal (como los que ya publica NEXO). */
export const DEFAULT_GREETING = `*BUEN {DIA} PARA TODOS*😉☀
*{ESTADO}*

📱 _Las transferencias tienen recargo, {RECARGO}_‼
👉🏻RECUERDEN PEDIR ALIAS ANTES DE TRANSFERIR, CASO CONTRARIO NO SE ACEPTAN RECLAMOS ‼

*EL DINERO NO SE DEVUELVE.*
*NO HAY EXCEPCIONES, SON LAS POLÍTICAS DEL LOCAL*

Aceptamos dólar, cotización en el día💰 {COTIZACION}
☺ *TODO EL EQUIPO DE {NEGOCIO} LES DESEA BUENAS VENTAS*
LOS ESPERAMOS‼`;

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

/** Completa el saludo con el día, si hoy abre (feriados incluidos), el recargo y la cotización. */
export function fillGreeting(tpl: string, v: { day: number; openToday: boolean; closedReason?: string | null; recargo: string | null; usdRate: number | null; business: string }) {
  const lines = tpl.split('\n').filter((l) => !(l.includes('{RECARGO}') && !v.recargo));
  return lines.join('\n')
    .replaceAll('{DIA}', DIAS[v.day])
    .replaceAll('{ESTADO}', v.openToday ? 'ESTAMOS ACTIVOS' : `HOY ESTAMOS CERRADOS${v.closedReason ? ` (${v.closedReason.toUpperCase()})` : ''}`)
    .replaceAll('{RECARGO}', v.recargo ?? '')
    .replaceAll('{COTIZACION}', v.usdRate ? `(hoy $${v.usdRate.toLocaleString('es-AR')})` : '')
    .replaceAll('{NEGOCIO}', v.business.toUpperCase())
    .replace(/ +\n/g, '\n').trim();
}
