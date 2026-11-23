import Link from 'next/link';
import { PageHeader } from '@/components/admin/fields';

export const metadata = { title: 'Ayuda' };

const QA: [string, React.ReactNode][] = [
  ['¿Cómo cargo un producto desde el celular?', <>Tocá el botón dorado <b>+ Cargar</b> (abajo al medio). Sacale una foto (el fondo se saca solo y se pone el de NEXO con tu logo; si preferís, elegí Fondo claro u Original), escribí nombre y precio, elegí la categoría y tocá <b>Guardar y compartir</b>. Ya está en la web.</>],
  ['¿Cómo lo publico en mi canal de WhatsApp?', <>Después de guardar se abre <b>Compartir en el canal</b> con la foto y el texto armados como tus publicaciones (frase, ✅ características, 💥 precio, cierre). Elegí la plantilla, mirá la vista previa y tocá <b>Compartir en mi canal</b>, elegí WhatsApp y tu canal. Para varios productos juntos usá <Link href="/admin/canal" className="underline">Compartir en canal</Link>. WhatsApp no deja que ninguna web publique sola: siempre falta tu toque final.</>],
  ['¿Cómo cambio un precio?', <>En <Link href="/admin/productos" className="underline">Productos</Link> tocá el precio, escribí el nuevo y <b>Guardar</b>. Para subir todo un porcentaje: <Link href="/admin/precios" className="underline">Aumentar precios</Link>. Para muchos desde una planilla: <Link href="/admin/importar" className="underline">Cargar desde Excel</Link>.</>],
  ['¿Cómo funciona el stock?', <>Cada producto tiene sus unidades. Cuando llega mercadería: <Link href="/admin/stock" className="underline">Stock</Link> → <b>Entrada</b>. Si vendés en el mostrador: <b>Venta</b>. Si contás y hay otro número: <b>Conteo</b>. Los pedidos de la web descuentan solos al confirmarlos. Si un producto llega a 0, la web muestra “Sin stock”.</>],
  ['¿Cómo me llegan los pedidos?', <>El cliente arma el carrito, completa sus datos y toca <b>Enviar pedido por WhatsApp</b>: te llega un mensaje ordenado con el número de pedido, productos, cantidades, precios, total, entrega y pago. El pedido también queda en <Link href="/admin/pedidos" className="underline">Pedidos</Link>. Ahí lo pasás por los estados: Confirmado → Preparando → Enviado → Entregado.</>],
  ['¿Se cobra online?', <>No. El cliente no paga en la web: el pago lo coordinás vos (efectivo, transferencia, tarjeta o un link de Mercado Pago). La web está preparada para sumar el cobro con Mercado Pago más adelante.</>],
  ['¿Qué son las variantes?', <>Si un producto viene en varios colores, talles o modelos, en la ficha activá <b>Tiene variantes</b> y cargá cada opción con su stock (y precio, si cambia).</>],
  ['¿Cómo pongo un producto en oferta?', <>En el producto completá <b>Precio anterior</b> (sale tachado con el % de descuento), el <b>precio por cantidad</b> (ej: llevando 6, $X c/u) o una <b>oferta programada</b> con fecha de inicio y fin, que se activa y se termina sola. El descuento por pagar en efectivo se pone en Datos del negocio → Envíos, pagos y promos.</>],
  ['¿Cómo pongo un feriado?', <><Link href="/admin/horarios" className="underline">Horarios y feriados</Link> → elegí la fecha, cerrado u otro horario, y el motivo. La web avisa desde 10 días antes y el día pasado se borra solo.</>],
  ['¿Cómo activo los envíos?', <><Link href="/admin/envios" className="underline">Envíos</Link> → tocá <b>Activo</b>. Mientras tanto, en “Próximamente” los clientes dejan su WhatsApp para que les avises.</>],
  ['¿Me puede llegar un resumen todos los días solo?', <>Hoy es un toque: en el Tablero, <b>Mandarme el resumen</b> abre WhatsApp con el resumen del día listo. Que llegue solo requiere la API paga de WhatsApp Business (se puede sumar más adelante).</>],
  ['¿Cómo sumo a un empleado al panel?', <>Entrá a <Link href="/admin/usuarios" className="underline">Usuarios</Link>, escribí su nombre y tocá <b>Generar link de invitación</b>. Mandáselo por WhatsApp: con ese link crea su propio usuario y contraseña (o entra con su Google). Podés sumar a todas las personas que quieras. Si alguien deja de trabajar con vos, tocá <b>Quitar</b>.</>],
  ['Olvidé mi contraseña', <>Pedile a quien te hizo la web que te genere una nueva. Para cambiarla vos: <Link href="/admin/cuenta" className="underline">Mi contraseña</Link>.</>],
];

export default function Ayuda() {
  return (
    <>
      <PageHeader title="Ayuda" description="Lo más común, explicado corto." />
      <div className="space-y-3">
        {QA.map(([q, a], i) => (
          <details key={i} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" open={i === 0}>
            <summary className="cursor-pointer list-none text-lg font-bold marker:hidden">{q}</summary>
            <p className="mt-3 leading-relaxed text-gray-700">{a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
