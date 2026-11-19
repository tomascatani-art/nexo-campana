import { requireAdmin } from '@/lib/auth';
import { getHours, getSpecialDays } from '@/lib/data';
import { SpecialDays } from './SpecialDays';
import { nowInArgentina } from '@/lib/format';
import { DAY_NAMES } from '@/lib/format';
import { PageHeader } from '@/components/admin/fields';
import { AdminForm, SubmitButton } from '@/components/admin/ui';
import { saveHoursAction } from '../../actions';

export const metadata = { title: 'Horarios y feriados' };

const time = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base tabular-nums outline-none focus:border-gold-deep focus:ring-4 focus:ring-gold/30';

export default async function HoursPage() {
  await requireAdmin();
  const [hours, specials] = await Promise.all([getHours(), getSpecialDays()]);
  const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
  return (
    <>
      <PageHeader title="Horarios de atención" description="Marcá los días que abrís. Si cortás al mediodía, completá el segundo turno. Si hacés horario corrido, dejá el segundo turno vacío." />
      <AdminForm action={saveHoursAction} className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const h = byDay.get(d);
          return (
            <fieldset key={d} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <legend className="sr-only">{DAY_NAMES[d]}</legend>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <label className="flex w-40 cursor-pointer items-center gap-3">
                  <input type="checkbox" name={`open_${d}`} defaultChecked={h?.is_open} className="size-6 accent-gold-deep" />
                  <span className="text-lg font-bold">{DAY_NAMES[d]}</span>
                </label>
                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="text-sm text-gray-500">Abre<input type="time" name={`open1_${d}`} defaultValue={h?.open1 ?? ''} className={time} /></label>
                  <label className="text-sm text-gray-500">Cierra<input type="time" name={`close1_${d}`} defaultValue={h?.close1 ?? ''} className={time} /></label>
                  <label className="text-sm text-gray-500">Abre (tarde)<input type="time" name={`open2_${d}`} defaultValue={h?.open2 ?? ''} className={time} /></label>
                  <label className="text-sm text-gray-500">Cierra (tarde)<input type="time" name={`close2_${d}`} defaultValue={h?.close2 ?? ''} className={time} /></label>
                </div>
              </div>
            </fieldset>
          );
        })}
        <p className="text-sm text-gray-500">Los días sin marcar se muestran como “Cerrado”. La web muestra sola si estás “Abierto ahora”.</p>
        <div className="sticky bottom-20 z-10 flex justify-end rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
          <SubmitButton>Guardar horarios</SubmitButton>
        </div>
      </AdminForm>
      <SpecialDays days={specials} today={nowInArgentina().ymd} />
    </>
  );
}
