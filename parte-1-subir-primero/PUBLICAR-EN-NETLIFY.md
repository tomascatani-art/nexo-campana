# Publicar la web de NEXO en Netlify (paso a paso)

Tiempo: unos 30 minutos. No hace falta usar la terminal ni instalar nada.

**Cómo queda armado:**
- **GitHub (cuenta de Diego):** guarda el código de la web.
- **Supabase (cuenta del dueño de NEXO, con Diego invitado):** guarda productos, pedidos, fotos y videos.
- **Netlify (cuenta de Diego o del dueño):** publica la web y la actualiza sola cada vez que cambia el código.

Las tres tienen plan gratis que alcanza para empezar.

---

## Paso 1 · Supabase (la base de datos), a nombre del dueño
1. El dueño entra a <https://supabase.com> y crea su cuenta (con su mail).
2. **New project**:
   - Name: `nexo-campana`
   - Database Password: tocá **Generate a password** y **guardala** (la vas a necesitar en el paso 3).
   - Region: **South America (São Paulo)**.
3. Para que Diego pueda ayudar: **Organization settings → Team → Invite** → el mail de Diego → rol **Developer** (o Administrator).
4. Arriba, tocá **Connect** → pestaña **Connection string** → elegí **Transaction pooler** (puerto **6543**).
   - Copiá esa dirección. Empieza con `postgresql://postgres.` y termina con `:6543/postgres`.
   - Reemplazá `[YOUR-PASSWORD]` por la contraseña del punto 2.
   - Esto es la **DATABASE_URL**. Guardala en un lugar seguro: es la llave de la base.

## Paso 2 · GitHub (el código)
El proyecto tiene unos 130 archivos y la página de GitHub deja subir hasta 100 de una vez, así que usamos **GitHub Desktop** (programa gratis, sin terminal):
1. Descomprimí `nexo-campana-web.zip` y dejá la carpeta `nexo` en un lugar fijo (ej: Documentos).
2. Instalá **GitHub Desktop** (<https://desktop.github.com>) y entrá con tu cuenta de GitHub.
3. Menú **File → Add local repository…** → elegí la carpeta `nexo`. Te dice que no es un repositorio: tocá **create a repository** → Name: `nexo-campana` → **Create repository**.
4. Arriba tocá **Publish repository** → dejá tildado **Keep this code private** → **Publish**.

Listo: el código queda en tu GitHub, privado. Los archivos que no tienen que subirse (`node_modules`, `.env.local`, etc.) quedan afuera solos gracias a `.gitignore`.

**Opción B, sin instalar nada (desde la página de GitHub):** usá `nexo-para-github-en-2-partes.zip`.
1. En GitHub: **New repository** → Name `nexo-campana` → **Private** → **Create repository** → tocá **uploading an existing file**.
2. Abrí `parte-1-subir-primero`, seleccioná **todo lo de adentro** (en Mac, antes apretá Cmd + Shift + . para ver los archivos ocultos), arrastralo y tocá **Commit changes**.
3. **Add file → Upload files**, arrastrá la carpeta `src` de `parte-2-subir-despues` y **Commit changes**. GitHub la junta con la `src` que ya estaba.

**Para cambios futuros:** reemplazá los archivos en la carpeta `nexo`, abrí GitHub Desktop, escribí un resumen abajo a la izquierda, **Commit to main** y **Push origin**. Netlify publica solo.

## Paso 3 · Netlify (la publicación)
1. Entrá a <https://app.netlify.com> → **Add new site → Import an existing project → GitHub** → autorizá → elegí `nexo-campana`.
2. Netlify detecta Next.js solo: **no cambies** el comando ni la carpeta (vienen en `netlify.toml`).
3. Antes de publicar, tocá **Add environment variables** y cargá estas 5:

| Nombre | Valor |
|---|---|
| `DATABASE_URL` | La dirección del paso 1.4 (con la contraseña puesta). |
| `AUTH_SECRET` | Una clave larga al azar. Generala en <https://generate-secret.vercel.app/48> y pegala. |
| `NEXT_PUBLIC_SITE_URL` | Por ahora `https://nexo-campana.netlify.app` (después, el dominio propio). |
| `ADMIN_USER` | `nexo` (el usuario con el que el dueño entra al panel). |
| `ADMIN_PASSWORD` | La contraseña del dueño para el panel (8 caracteres o más). |

4. **Deploy**. La primera vez tarda 3 o 4 minutos.
   - Se crean solas las tablas en Supabase, con productos de ejemplo para empezar.
   - También se crea el usuario del panel. La contraseña se guarda **cifrada**: nadie la puede leer, ni siquiera en Supabase.
5. Cuando diga **Published**, abrí la web y entrá a `/admin` con el usuario y la contraseña.
6. **Seguridad:** ya creado el usuario, borrá la variable `ADMIN_PASSWORD` en Netlify (**Site configuration → Environment variables**). No hace falta más.

## Paso 4 · Nombre de la web y dominio
- **Nombre gratis:** Site configuration → **Change site name** → `nexo-campana` (queda `nexo-campana.netlify.app`).
- **Dominio propio** (ej: `nexocampana.com.ar`):
  1. Se compra en <https://nic.ar>.
  2. En Netlify: **Domain management → Add a domain**, y seguí las instrucciones (te da los DNS para cargar en NIC).
  3. Después cambiá `NEXT_PUBLIC_SITE_URL` por el dominio nuevo y tocá **Deploys → Trigger deploy**.
  4. En el panel, cargá el mismo dominio en *Datos del negocio → Google → Dirección de la web*.

## Paso 5 · Lo primero en el panel
1. **Datos del negocio → WhatsApp y contacto:** el número y el enlace del canal.
2. **Datos del negocio → Envíos, pagos y promos:**
   - el recargo por transferencia y los avisos;
   - en Categorías, el 10% de Celulares;
   - la cotización del dólar, que se carga desde el Tablero.
3. **Productos:** cargá los reales con foto y borrá o ocultá los de ejemplo.

---

## Cambios futuros
Cada vez que hagas **Push origin** en GitHub Desktop, Netlify vuelve a publicar solo, en 3 o 4 minutos. **Los datos no se pierden:** productos, pedidos y fotos están en Supabase, no en el código.

## Si algo falla
- **"Falta DATABASE_URL" o "connect" en el registro de Netlify:** revisá la variable. Tiene que ser la de **Transaction pooler**, puerto **6543**, con la contraseña puesta y sin corchetes.
- **"password authentication failed":** la contraseña de Supabase no coincide. En Supabase podés resetearla: Project Settings → Database → Reset database password.
- **No puedo entrar al panel:** si borraste `ADMIN_PASSWORD` antes del primer deploy, volvé a cargarla y hacé **Trigger deploy**. Solo crea el usuario si todavía no hay ninguno.
- **Supabase gratis "pausa" el proyecto** si pasa 7 días sin visitas. Con la web publicada y con visitas eso no pasa; si pasara, se reactiva con un botón en Supabase.

## Qué queda guardado dónde (y qué es secreto)
- **Secretos** (`DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD`): **solo** en Netlify → Environment variables. Nunca en GitHub ni en el código. Ninguno llega al navegador.
- **Las contraseñas del panel:** cifradas (bcrypt) en Supabase.
- **El dueño es el titular de Supabase**, o sea de sus datos. Diego entra como invitado.
