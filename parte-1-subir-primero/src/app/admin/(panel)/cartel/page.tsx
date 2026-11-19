import QRCode from 'qrcode';
import { getSettings } from '@/lib/data';
import { siteUrl } from '@/lib/format';
import { PrintButton } from '@/components/site/PrintButton';

export const metadata = { title: 'Cartel con QR' };

export default async function Cartel() {
  const s = await getSettings();
  const url = siteUrl(s);
  const qr = await QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#0b0b0c', light: '#ffffff' } });
  const qrChannel = s.channel_url ? await QRCode.toString(s.channel_url, { type: 'svg', margin: 0 }) : null;
  return (
    <>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Cartel con QR</h1>
          <p className="text-gray-500">Imprimilo y pegalo en el mostrador: los clientes escanean y ven el catálogo con precios.</p>
        </div>
        <span className="rounded-xl bg-ink text-white [&_button]:border-0 [&_button]:text-white"><PrintButton /></span>
      </div>
      <article className="mx-auto flex aspect-[1/1.414] max-w-xl flex-col items-center justify-between rounded-3xl bg-ink p-10 text-center text-white shadow-2xl print:max-w-none print:rounded-none print:shadow-none" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <div>
          <svg viewBox="0 0 64 64" className="mx-auto size-20" aria-hidden><circle cx="32" cy="32" r="28.5" fill="none" stroke="#f2c230" strokeWidth="3" /><path d="M19 46V18h8l11 16V18h7v28h-8L26 30v16z" fill="#f2c230" /></svg>
          <p className="mt-3 text-3xl font-black uppercase tracking-tight">{s.business_name}</p>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#f2c230]">{s.tagline || s.business_kind}</p>
        </div>
        <div>
          <p className="text-4xl font-black leading-tight">Mirá todos los precios<br /><span className="text-[#f2c230]">desde tu celular</span></p>
          <div className="mx-auto mt-6 w-56 rounded-2xl bg-white p-4 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-3 font-semibold text-white/70">{url.replace(/^https?:\/\//, '')}</p>
        </div>
        <div className="flex w-full items-center justify-center gap-4">
          {qrChannel && <div className="size-20 rounded-xl bg-white p-2 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrChannel }} />}
          <p className="text-left text-sm text-white/80">{qrChannel ? <>Seguí nuestro canal de WhatsApp<br />y enterate primero de las ofertas</> : <>Armá tu pedido y mandalo por WhatsApp<br />{s.address}, {s.city}</>}</p>
        </div>
      </article>
    </>
  );
}
