import { BellRing, CircleSlash, Truck } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { getSettings, getWaitlist } from '@/lib/data';
import { formatPrice, timeAgo } from '@/lib/format';
import { SHIPPING_SOON_DEFAULT } from '@/lib/types';
import { Card, Field, PageHeader, PriceField, TextArea } from '@/components/admin/fields';
import { AdminForm, SubmitButton } from '@/components/admin/ui';
import { saveShippingAction, setShippingModeAction } from '../../actions';
import { WaitlistRow, ZonesEditor } from './client';

export const metadata = { title: 'Envíos' };

const MODES = [
  { v: 'off', title: 'Desactivado', sub: 'La web no habla de envíos. Solo retiro en el local.', Icon: CircleSlash, on: 'border-gray-800 bg-gray-900 text-white' },
  { v: 'proximamente', title: 'Próximamente', sub: 'Cartel “🚚 ¡próximamente!” y botón “Avisame” para juntar interesados.', Icon: BellRing, on: 'border-gold-deep bg-gold/25 text-ink' },
  { v: 'activo', title: 'Activo', sub: 'El cliente elige retiro o envío, pone su dirección y se suma el costo.', Icon: Truck, on: 'border-emerald-600 bg-emerald-50 text-emerald-900' },
] as const;

export default async function Envios() {
  await requireAdmin();
  const [s, list] = await Promise.all([getSettings(), getWaitlist()]);
  const pending = list.filter((w) => !w.notified_at).length;
  return (
    <>
      <PageHeader title="Envíos a domicilio" description="Activalos, ponelos en “próximamente” o apagalos con un toque. No hace falta tocar nada más." />
      <AdminForm action={setShippingModeAction} className="mb-6">
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Estado de los envíos">
          {MODES.map(({ v, title, sub, Icon, on }) => {
            const active = s.shipping_mode === v;
            return (
              <button key={v} type="submit" name="mode" value={v} role="radio" aria-checked={active} className={`flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition ${active ? `${on} shadow-md` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <span className="flex w-full items-center justify-between"><Icon className="size-6" /> {active && <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs font-bold">ACTUAL</span>}</span>
                <span className="text-lg font-bold">{title}</span>
                <span className={`text-sm ${active ? 'opacity-80' : 'text-gray-500'}`}>{sub}</span>
              </button>
            );
          })}
        </div>
      </AdminForm>

      {s.shipping_mode === 'activo' && pending > 0 && (
        <p className="mb-6 rounded-2xl bg-emerald-600 p-4 font-semibold text-white">🎉 Tenés {pending} {pending === 1 ? 'persona esperando' : 'personas esperando'} que arranquen los envíos. Avisales desde la lista de abajo.</p>
      )}

      <AdminForm action={saveShippingAction} className="space-y-6">
        <Card title="Costo del envío" description="Usá un monto fijo, o cargá zonas con su precio (si hay zonas, el cliente elige la suya).">
          <div className="grid gap-5 sm:grid-cols-2">
            <PriceField label="Costo fijo (si no usás zonas)" name="shipping_cost" defaultValue={s.shipping_cost} help="Vacío = “a convenir”." />
            <PriceField label="Envío gratis desde" name="free_shipping_from" defaultValue={s.free_shipping_from} help="Vacío = nunca gratis. El carrito avisa cuánto falta." />
          </div>
          <ZonesEditor zones={s.shipping_zones ?? []} />
          <TextArea label="Condiciones (las ve el cliente)" name="shipping_info" defaultValue={s.shipping_info} maxLength={400} rows={2} placeholder="Entregamos en 24/48 hs, de lunes a sábado." />
        </Card>
        <Card title="Cartel de “próximamente”">
          <Field label="Texto del cartel" name="shipping_soon_text" defaultValue={s.shipping_soon_text} maxLength={120} placeholder={SHIPPING_SOON_DEFAULT} />
        </Card>
        <div className="sticky bottom-20 z-10 flex justify-end rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <SubmitButton>Guardar envíos</SubmitButton>
        </div>
      </AdminForm>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Interesados en envíos <span className="text-gray-400">({list.length})</span></h2>
        <p className="mb-3 text-sm text-gray-500">Gente que tocó “Avisame cuando haya envíos”. Cuando los actives, avisales con un toque.</p>
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">Todavía nadie se anotó.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((w) => <WaitlistRow key={w.id} w={{ ...w, created_at: new Date(w.created_at).toISOString(), notified_at: w.notified_at ? new Date(w.notified_at).toISOString() : null }} ago={timeAgo(new Date(w.created_at).toISOString())} message={`¡Hola${w.name ? ` ${w.name.split(' ')[0]}` : ''}! Te escribimos de ${s.business_name}: ya hacemos envíos a domicilio 🚚${s.free_shipping_from ? ` (gratis desde ${formatPrice(s.free_shipping_from)})` : ''}. Armá tu pedido acá 👉 ${s.site_url || process.env.NEXT_PUBLIC_SITE_URL || ''}`} />)}
          </ul>
        )}
      </section>
    </>
  );
}
