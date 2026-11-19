import { requireAdmin } from '@/lib/auth';
import { getHours, getSettings } from '@/lib/data';
import { siteUrl } from '@/lib/format';
import { DEFAULT_REPLIES, fillTemplate } from '@/lib/messages';
import { PageHeader } from '@/components/admin/fields';
import { AdminForm, SubmitButton } from '@/components/admin/ui';
import { saveRepliesAction } from '../../actions';
import { RepliesEditor } from './RepliesEditor';

export const metadata = { title: 'Respuestas rápidas' };

export default async function Respuestas() {
  await requireAdmin();
  const [s, hours] = await Promise.all([getSettings(), getHours()]);
  const replies = s.quick_replies ?? DEFAULT_REPLIES;
  const site = siteUrl(s);
  return (
    <>
      <PageHeader title="Respuestas rápidas" description="Mensajes guardados para lo que más te preguntan. Los usás con un toque desde cada pedido, o copialos para pegarlos en WhatsApp." />
      <AdminForm action={saveRepliesAction} className="space-y-4">
        <RepliesEditor replies={replies.map((r) => ({ ...r, preview: fillTemplate(r.text, s, hours, site, 'Juan') }))} />
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">Palabras que se completan solas: <b>{'{nombre}'}</b> (del cliente), <b>{'{direccion}'}</b>, <b>{'{mapa}'}</b>, <b>{'{horario}'}</b>, <b>{'{web}'}</b>, <b>{'{pagos}'}</b>, <b>{'{negocio}'}</b>.</p>
        <div className="sticky bottom-20 z-10 flex justify-end rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <SubmitButton>Guardar respuestas</SubmitButton>
        </div>
      </AdminForm>
    </>
  );
}
