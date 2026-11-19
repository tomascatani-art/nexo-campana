import { requireAdmin } from '@/lib/auth';
import { Card, Field, PageHeader } from '@/components/admin/fields';
import { AdminForm, SubmitButton } from '@/components/admin/ui';
import { changePasswordAction } from '../../actions';

export const metadata = { title: 'Mi contraseña' };

export default async function AccountPage() {
  const user = await requireAdmin();
  return (
    <>
      <PageHeader title="Mi contraseña" description={`Usuario: ${user.username}`} />
      <AdminForm action={changePasswordAction} resetOnSuccess className="max-w-lg">
        <Card title="Cambiar contraseña" description="Mínimo 8 caracteres, con letras y números. Al cambiarla se cierra la sesión en los otros dispositivos.">
          <Field label="Contraseña actual" name="current" type="password" required />
          <Field label="Nueva contraseña" name="next" type="password" required />
          <Field label="Repetir nueva contraseña" name="confirm" type="password" required />
          <SubmitButton>Cambiar contraseña</SubmitButton>
        </Card>
      </AdminForm>
    </>
  );
}
