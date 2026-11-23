import { cookies } from 'next/headers';
import Link from 'next/link';
import { getPendingInvite, isOwner, requireAdmin, RECOVERY_COOKIE } from '@/lib/auth';
import { sql } from '@/lib/db';
import { callbackPath, getGoogleConfig, requestOrigin } from '@/lib/google';
import { Card, Field, PageHeader } from '@/components/admin/fields';
import { AdminForm, Flash, SubmitButton } from '@/components/admin/ui';
import { GoogleButton, InviteTool, RecoveryCodeBox, RegenerateRecovery, SecureBadge, UnlinkGoogle } from '@/components/admin/AccountTools';
import { changePasswordAction, changeProfileAction } from '../../actions';
import { dismissRecoveryAction, saveGoogleConfigAction } from '../../account-actions';

export const metadata = { title: 'Mi cuenta' };
export const dynamic = 'force-dynamic';

const fmt = (d: Date) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string; ok?: string; error?: string }> }) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const newCode = (await cookies()).get(RECOVERY_COOKIE)?.value;
  const google = await getGoogleConfig();
  const pending = await getPendingInvite();
  const owner = isOwner(user);
  const [{ n: others }] = await sql<{ n: number }[]>`select count(*)::int as n from admin_users where id <> ${user.id}`;
  const entries = await sql<{ username: string; created_at: Date }[]>`
    select username, created_at from login_attempts
    where success and username in (${user.username}, ${'google:' + (user.google_email ?? '-')})
    order by created_at desc limit 6`;
  const [recovery] = await sql<{ has: boolean }[]>`select recovery_hash is not null as has from admin_users where id = ${user.id}`;
  const redirectUri = (await requestOrigin()) + callbackPath;

  return (
    <>
      <PageHeader title="Mi cuenta" description={`Usuario: ${user.username}${user.display_name ? ` · ${user.display_name}` : ''}`} />
      {sp.ok && <Flash message={sp.ok} />}
      {sp.error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{sp.error}</p>}

      <div className="max-w-2xl space-y-6">
        {newCode && (
          <Card title="¡Tu cuenta está lista! 🎉" description={owner && others === 0 ? 'Desde ahora solo vos podés entrar a este panel. Antes de seguir, guardá este código:' : 'Ya podés usar el panel. Antes de seguir, guardá este código:'}>
            <RecoveryCodeBox code={newCode} />
            <form action={dismissRecoveryAction}>
              <SubmitButton>Ya lo guardé, seguir</SubmitButton>
            </form>
          </Card>
        )}

        <AdminForm action={changeProfileAction}>
          <Card title="Tu usuario y tu nombre" description="Podés cambiar el usuario con el que entrás. La contraseña no cambia.">
            <Field label="Usuario para entrar" name="username" defaultValue={user.username} required help="Sin espacios ni tildes (podés usar . _ -)." />
            <Field label="Tu nombre" name="display_name" defaultValue={user.display_name} />
            <SubmitButton>Guardar usuario</SubmitButton>
          </Card>
        </AdminForm>

        <AdminForm action={changePasswordAction} resetOnSuccess>
          <Card
            title={user.has_password ? 'Cambiar contraseña' : 'Crear una contraseña (opcional)'}
            description={user.has_password ? 'Mínimo 8 caracteres, con letras y números. Al cambiarla se cierra la sesión en los otros dispositivos.' : 'Hoy entrás solo con Google. Si querés, creá también una contraseña de respaldo.'}
          >
            {user.has_password && <Field label="Contraseña actual" name="current" type="password" required />}
            <Field label="Nueva contraseña" name="next" type="password" required />
            <Field label="Repetir nueva contraseña" name="confirm" type="password" required />
            <SubmitButton>{user.has_password ? 'Cambiar contraseña' : 'Crear contraseña'}</SubmitButton>
          </Card>
        </AdminForm>

        <Card title="Quién puede entrar al panel">
          {owner ? (
            <>
              {others === 0 ? <SecureBadge text="Solo vos tenés acceso a este panel." /> : <p className="font-semibold text-gray-800">Vos y {others === 1 ? 'otra persona' : `${others} personas más`}.</p>}
              <Link href="/admin/usuarios" className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-bold text-ink hover:bg-gold-deep">Ver y sumar usuarios</Link>
            </>
          ) : <p className="text-gray-700">Entrás con tu propio usuario. Los usuarios del panel los maneja el dueño.</p>}
          <div>
            <p className="font-semibold text-gray-800">Tus últimos ingresos</p>
            {entries.length ? (
              <ul className="mt-2 space-y-1 text-gray-600">
                {entries.map((e, i) => <li key={i}>• {fmt(e.created_at)} {e.username.startsWith('google:') ? '(con Google)' : '(con contraseña)'}</li>)}
              </ul>
            ) : <p className="mt-1 text-gray-500">Todavía no hay registros.</p>}
          </div>
        </Card>

        {owner && <Card
          title="Entregar el panel al dueño"
          description="Generá un link de un solo uso y mandáselo al dueño. Con ese link él crea su propio usuario y contraseña (o entra con su Google). En ese momento se borran los demás usuarios, incluido el tuyo: nadie más sabe su contraseña."
        >
          <InviteTool pendingUntil={pending ? fmt(pending.expires_at) : null} />
        </Card>}

        <Card title="Entrar con Google" description={google ? 'Entrás con tu cuenta de Google, sin recordar otra contraseña.' : 'Todavía no está activado. Abajo están los datos para activarlo.'}>
          {google && (user.google_email ? (
            <>
              <SecureBadge text={`Vinculado a ${user.google_email}`} />
              {user.has_password && <UnlinkGoogle />}
            </>
          ) : (
            <GoogleButton href="/admin/google/entrar?modo=vincular">Vincular mi cuenta de Google</GoogleButton>
          ))}
          {owner && <details className="rounded-xl border border-gray-200 p-4" open={!google}>
            <summary className="cursor-pointer font-semibold text-gray-800">{google ? 'Configuración de Google (técnico)' : 'Activar el ingreso con Google'}</summary>
            {google?.source === 'hosting' ? (
              <p className="mt-3 text-gray-600">Está configurado desde el hosting (variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET).</p>
            ) : (
              <AdminForm action={saveGoogleConfigAction} className="mt-4 space-y-4">
                <p className="text-sm text-gray-600">En Google Cloud, al crear el &quot;ID de cliente de OAuth&quot; (tipo Aplicación web), pegá esta dirección en &quot;URI de redireccionamiento autorizados&quot;:</p>
                <p className="select-all break-all rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900">{redirectUri}</p>
                <Field label="ID de cliente" name="client_id" defaultValue={google?.clientId} placeholder="123456-abc.apps.googleusercontent.com" />
                <Field label="Secreto del cliente" name="client_secret" type="password" placeholder={google ? '•••••••• (guardado)' : 'GOCSPX-…'} />
                <div className="flex flex-wrap gap-2">
                  <SubmitButton>Guardar</SubmitButton>
                  {google && <button name="borrar" value="1" className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700">Desactivar Google</button>}
                </div>
              </AdminForm>
            )}
          </details>}
          {!owner && !google && <p className="text-gray-600">El dueño todavía no lo activó.</p>}
        </Card>


        <Card
          title="Código de recuperación"
          description={recovery?.has
            ? 'Ya tenés un código guardado. Si lo perdiste, creá uno nuevo y anotalo.'
            : 'Todavía no tenés código. Creá uno y guardalo: sirve para volver a entrar si te olvidás la contraseña.'}
        >
          <RegenerateRecovery />
        </Card>
      </div>
    </>
  );
}
