import { isOwner, listStaffInvites, listUsers, requireOwner } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { Card, PageHeader } from '@/components/admin/fields';
import { CancelStaffInvite, GoogleG, RemoveStaff, StaffInviteTool } from '@/components/admin/AccountTools';

export const metadata = { title: 'Usuarios' };
export const dynamic = 'force-dynamic';

const fmt = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);

export default async function UsersPage() {
  const me = await requireOwner();
  const [s, users, invites] = await Promise.all([getSettings(), listUsers(), listStaffInvites()]);

  return (
    <>
      <PageHeader title="Usuarios" description="Las personas que pueden entrar al panel. Cada una tiene su propio usuario y contraseña (o entra con su Google) y ve el mismo panel que vos." />
      <div className="max-w-2xl space-y-6">
        <Card title="Sumar a una persona" description="Generá un link y mandáselo por WhatsApp. Con ese link la persona crea su propio usuario. Podés sumar a todas las que quieras, una por link.">
          <StaffInviteTool businessName={s.business_name} />
        </Card>

        {invites.length > 0 && (
          <Card title="Links enviados que todavía no se usaron">
            <ul className="space-y-2">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
                  <p className="flex-1"><strong>{i.label || 'Sin nombre'}</strong> · vence el {fmt(i.expires_at)}</p>
                  <CancelStaffInvite id={i.id} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title={`Quiénes pueden entrar (${users.length})`}>
          <ul className="space-y-3">
            {users.map((u) => {
              const owner = isOwner(u);
              const name = u.display_name || u.username;
              return (
                <li key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-gray-900">
                      {name}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${owner ? 'bg-gold text-ink' : 'bg-gray-100 text-gray-700'}`}>{owner ? 'Dueño' : 'Empleado'}</span>
                      {u.id === me.id && <span className="text-sm font-normal text-gray-500">(vos)</span>}
                    </p>
                    <p className="mt-1 break-all text-sm text-gray-600">
                      Usuario: {u.username}
                      {u.google_email && <span className="ml-2 inline-flex items-center gap-1"><GoogleG className="size-4" /> {u.google_email}</span>}
                    </p>
                    <p className="text-sm text-gray-500">{u.last_login_at ? `Último ingreso: ${fmt(u.last_login_at)}` : 'Todavía no entró'}</p>
                  </div>
                  {!owner && <RemoveStaff id={u.id} name={name} />}
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-gray-500">Si alguien deja de trabajar con vos, tocá <strong>Quitar</strong> y no puede entrar más.</p>
        </Card>
      </div>
    </>
  );
}
