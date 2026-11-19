import Link from 'next/link';
import { Eye, ShoppingCart, ClipboardList, PackageSearch } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { getProductStats, type ProductStat } from '@/lib/data';
import { PageHeader } from '@/components/admin/fields';

export const metadata = { title: 'Estadísticas' };

export default async function Estadisticas({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  await requireAdmin();
  const days = [7, 30, 90].includes(Number((await searchParams).dias)) ? Number((await searchParams).dias) : 30;
  const all = await getProductStats(days);
  const active = all.filter((p) => p.active);
  const tot = all.reduce((a, p) => ({ views: a.views + p.views, adds: a.adds + p.adds, ordered: a.ordered + p.ordered }), { views: 0, adds: 0, ordered: 0 });
  const mostViewed = [...active].sort((a, b) => b.views - a.views).filter((p) => p.views > 0).slice(0, 8);
  const mostOrdered = [...active].sort((a, b) => b.ordered + b.sold - (a.ordered + a.sold)).filter((p) => p.ordered + p.sold > 0).slice(0, 8);
  const lookNoBuy = [...active].filter((p) => p.views >= 3 && p.ordered === 0).sort((a, b) => b.views - a.views).slice(0, 8);
  const never = active.filter((p) => p.ordered === 0 && p.sold === 0);
  return (
    <>
      <PageHeader title="Estadísticas" description="Qué se mira, qué se pide y qué no se mueve. Para saber qué reponer, qué promocionar y qué liquidar." />
      <div className="mb-5 flex gap-2">
        {[7, 30, 90].map((d) => <Link key={d} href={`/admin/estadisticas?dias=${d}`} className={`rounded-full border px-4 py-2 text-sm font-semibold ${d === days ? 'border-ink bg-ink text-white' : 'border-gray-300 bg-white'}`}>Últimos {d} días</Link>)}
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Box icon={Eye} label="Visitas a productos" value={tot.views} />
        <Box icon={ShoppingCart} label="Agregados a listas" value={tot.adds} />
        <Box icon={ClipboardList} label="Unidades pedidas por la web" value={tot.ordered} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <List title="👀 Los más mirados" items={mostViewed} show={(p) => `${p.views} visitas · ${p.adds} a la lista`} empty="Todavía no hay visitas registradas." />
        <List title="🏆 Los más pedidos y vendidos" items={mostOrdered} show={(p) => `${p.ordered} pedidos web · ${p.sold} vendidos`} empty="Todavía no hay pedidos en este período." />
        <List title="🤔 Se miran pero no se piden" hint="Revisá precio, foto o descripción. O compartilos con una oferta." items={lookNoBuy} show={(p) => `${p.views} visitas · 0 pedidos`} empty="Nada por ahora 👌" />
        <List title={`💤 Sin pedidos ni ventas (${never.length})`} hint="Candidatos a promo, combo o liquidación." items={never.slice(0, 12)} show={(p) => `${p.views} visitas`} empty="¡Todo se movió en este período!" />
      </div>
      <p className="mt-6 text-sm text-gray-500">Las visitas se cuentan una vez por persona y por día de navegación, sin guardar datos personales.</p>
    </>
  );
}

function Box({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <Icon className="size-5 text-gold-deep" />
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value.toLocaleString('es-AR')}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function List({ title, hint, items, show, empty }: { title: string; hint?: string; items: ProductStat[]; show: (p: ProductStat) => string; empty: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="text-sm text-gray-500">{hint}</p>}
      {items.length === 0 ? <p className="mt-4 flex items-center gap-2 text-gray-500"><PackageSearch className="size-4" /> {empty}</p> : (
        <ul className="mt-3 divide-y divide-gray-100">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3 py-2.5 hover:bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.image_id ? <img src={`/img/${p.image_id}`} alt="" className="size-10 rounded-lg object-cover" /> : <span className="size-10 rounded-lg bg-gray-100" />}
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <span className="shrink-0 text-sm text-gray-500">{show(p)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
