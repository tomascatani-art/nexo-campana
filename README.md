# NEXO Campana — Tienda online mayorista y minorista + panel de administración

Web de catálogo con carrito tipo "lista de súper" que se envía por WhatsApp, más un panel privado (`/admin`) para que el dueño cargue productos desde el celular, controle stock, gestione pedidos y comparta productos en su canal de WhatsApp.

Cliente: **NEXO Campana** · Electro · Hogar · Tecnología · Colectora Norte 1668, Campana (Bs. As.) · Lunes a sábado de 10 a 17:30 · IG @nexocampana

---

## Verla ya (modo demo, sin Supabase ni Vercel)

Requisito: **Node.js 20 o superior** (<https://nodejs.org>, botón "LTS").

```bash
npm install
npm run demo
```

- Windows: también podés hacer doble clic en `VER-DEMO.bat`. Mac: doble clic en `ver-demo.command`.
- La primera vez tarda 1 o 2 minutos (prepara la base de demo y compila la web). Después arranca en segundos.
- Se abre sola en el navegador:
  - Tienda: <http://localhost:3000>
  - Panel: <http://localhost:3000/admin> · usuario **nexo** · contraseña **Nexo2026demo**
- Para mostrarla desde el celular: misma red Wi-Fi y en el celular entrá a `http://IP-DE-LA-COMPU:3000` (la IP la ves con `ipconfig` en Windows).
- `npm run demo -- --reset` borra todo lo que cargaste y vuelve al contenido de ejemplo.
- Otro puerto: `PORT=3100 npm run demo` (Windows PowerShell: `$env:PORT=3100; npm run demo`).

El modo demo usa una base PostgreSQL embebida (PGlite) guardada en la carpeta `.demo-db/`. Es solo para mostrar y probar: en producción se usa Supabase (u otro Postgres).

---

## Qué incluye

**Tienda pública**
- Portada con logo, slogan, estado "Abierto ahora / Cerrado", barra de anuncio, categorías con imagen, ofertas, más vendidos (automático según ventas de 30 días), destacados, novedades del canal, catálogo con buscador, filtros por categoría, ofertas y orden (destacados, populares, nuevos, menor y mayor precio).
- Ficha de producto con galería, variantes (color/talle/modelo con precio y stock propios), precio por cantidad, precio anterior tachado y % de descuento, productos relacionados, botón compartir.
- Carrito tipo lista de súper: cantidades, total al instante, aviso de "te faltan $X para el envío gratis", compra mínima, retiro o envío, forma de pago, datos del cliente (se recuerdan). El pedido se guarda en el panel con número y se envía armado por WhatsApp. **No hay cobro online.**
- Páginas `/novedades` (lo último cargado) y `/lista-de-precios` (imprimible / PDF).
- SEO: datos estructurados `Store`, `sitemap.xml`, `robots.txt`, imagen Open Graph por producto.

**Panel (`/admin`, pensado para el celular)**
- Tablero: ventas de hoy / mes / total, pedidos, productos publicados, sin stock, stock bajo, valor del inventario a costo y a precio, gráfico de 30 días, más vendidos, lista para reponer, últimos movimientos.
- Productos: alta en un paso (foto, nombre, precio), SKU, costo, precio anterior, precio por cantidad, galería, variantes, stock y mínimo, destacado, nuevo, visible/oculto, duplicar, borrar, cambio de precio en línea.
- Compartir en el canal de WhatsApp: imagen lista (publicación 4:5 y estado 9:16) + texto + enlace; de a uno o en lote (hasta 10).
- Stock: entradas, ventas en mostrador, conteos (ajustes) y devoluciones con historial y filtros; exportar a Excel (CSV).
- Pedidos: estados pendiente → confirmado → preparando → enviado/listo → entregado, o cancelado. Al confirmar se descuenta el stock; al cancelar se devuelve. Nota interna y marca de pago.
- Categorías con imagen/ícono y orden; aumento masivo de precios por %; datos del negocio (WhatsApp, canal, redes, envíos, pagos, promos, textos, portada, SEO); horarios; cartel con QR para imprimir; cambio de contraseña; ayuda.

**Segunda tanda (incluida)**
- **Canal de WhatsApp con el formato del negocio:** gancho + ✨ NOMBRE ✨ + ✅ características + 💥 PRECIO 💥 + cierre, con textos por categoría y editables por producto; vista previa estilo WhatsApp; plantillas Clásica, Oferta flash, Corta y Combo; foto del producto o imagen con precio y logo; Web Share con imagen + texto.
- **Foto automática:** al sacar la foto se recorta el fondo en el propio celular (modelo U²-Net-p, sin servicios externos ni costo) y se arma con el fondo NEXO + logo + nombre; versiones Fondo NEXO / Fondo claro / Original.
- **Envíos en 3 estados** (Desactivado / Próximamente con lista "Avisame" / Activo con zonas y envío gratis desde $X).
- **Horarios y feriados:** días especiales (cerrado u horario reducido) con aviso en la web 10 días antes; los días pasados se ocultan solos.
- **Descuento pagando en efectivo**, **ofertas programadas** (se activan y terminan solas, revalidación cada 5 min), **precio por cantidad** (rotulado "Llevando X+"; NEXO es mayorista y minorista).
- **Opiniones** con moderación del dueño; **clientes frecuentes**; **estadísticas** (más mirados, mirados y no pedidos, sin movimiento); **carga masiva desde Excel/CSV** con vista previa; **lista de precios PDF** con la marca.
- **Video de bienvenida** en la portada (`public/video/nexo-entrada.mp4`, 1,1 MB, H.264 sin audio, con fundido para el loop) con cartel "Bienvenidos" animado; el dueño puede cambiarlo, cambiar el texto o apagarlo. Los videos subidos se guardan en la tabla `media` (subida en partes de 3 MB por el límite de Vercel) y se sirven en `/media/[id]` con soporte de Range (necesario para Safari).
- **Políticas del local:** recargo por transferencia general (5%) y por categoría (Celulares 10%) calculado por línea; aviso "pedí el alias antes de transferir" (alias oculto por defecto); política de devoluciones; derecho de admisión (también al pie); pago en **dólares** con cotización del día editable en el tablero (total ÷ cotización, redondeado hacia arriba); todo guardado en el pedido (`surcharge`, `discount`, `usd_rate`).
- **Carteles de precio** (`/admin/carteles`): carteles para imprimir y pegar en los productos (A4: 1, 4 u 8 por hoja; diseños Oferta / Negro y dorado / Blanco; cinta ¡OFERTA!, etc.). Precio escrito a mano o traído de la web; opciones de precio en efectivo con % propio, precio mayorista, precio anterior con % off, dólares, nombre y logo. Se imprime con el diálogo del navegador (o PDF).
- **Historia de Instagram** desde la pantalla de compartir: imagen 1080×1920 (`/compartir/<id>?f=ig`) con márgenes seguros para la interfaz de Instagram; se comparte con el menú del celular (Web Share API, solo la imagen para que aparezca "Historias") y copia el enlace del producto para el sticker. Sin API de Meta: publicar solo en Instagram requeriría cuenta profesional + app aprobada por Meta (no configurado).
- **Saludo del día** para el canal ("BUEN JUEVES PARA TODOS… ESTAMOS ACTIVOS") con día, estado según horarios/feriados, recargo y cotización; plantilla editable.
- **Aviso al cliente por estado**, **respuestas rápidas** editables y **resumen del día** por WhatsApp (por enlace, ver abajo).

## Tecnología

| Parte | Elección |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, ISR) + React 19 + TypeScript |
| Estilos | Tailwind CSS 4 · Montserrat + Inter |
| Base de datos | PostgreSQL (Supabase recomendado) vía `postgres.js` |
| Imágenes | WebP optimizadas guardadas en la base, servidas por `/img/[id]` con caché permanente |
| Imágenes para el canal | Generadas en el servidor con `next/og` (`/compartir/[id]`) |
| Autenticación | Usuarios propios, bcrypt, sesión firmada (JWT) en cookie `httpOnly` |
| Hosting | Netlify (`netlify.toml` + `@netlify/plugin-nextjs`); también Vercel o cualquier host Node 20+ |

### Seguridad
- Contraseñas con bcrypt (nunca en texto plano). Sesión firmada en cookie `httpOnly`, `secure` en producción.
- Panel protegido en dos capas: `src/proxy.ts` + `requireAdmin()` en cada página y acción del servidor.
- Bloqueo por fuerza bruta (8 intentos fallidos → 15 min). Límite de pedidos por IP (12 por hora).
- Precios y stock se recalculan siempre en el servidor: el cliente no puede alterar el total.
- Validación con zod; imágenes re-procesadas con `sharp` (sin EXIF).
- RLS activado en todas las tablas sin políticas: la clave pública de Supabase no puede leer nada. `DATABASE_URL` y `AUTH_SECRET` solo existen en el servidor; ninguna credencial llega al navegador.
- Cabeceras de seguridad, `noindex` y `no-store` en `/admin`.

---

## Puesta en producción

> 30 a 40 minutos. Necesitás cuenta en Supabase y en Vercel (o Netlify).

### 1. Base de datos (Supabase)
1. <https://supabase.com> → **New project**. Región **South America (São Paulo)**. Guardá la contraseña.
2. **Connect** → **Connection string** → **Transaction pooler** (puerto 6543). Copiá la URL y reemplazá `[YOUR-PASSWORD]`.

### 2. Preparar en tu computadora
```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
```
Completá `.env.local`:
```
DATABASE_URL=postgresql://postgres.xxxx:CONTRASEÑA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
AUTH_SECRET=<generalo con el comando de abajo>
NEXT_PUBLIC_SITE_URL=https://nexocampana.com.ar
```
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # AUTH_SECRET
npm run db:setup                                   # crea tablas y carga contenido de ejemplo
npm run admin -- nexo "UnaClaveSegura2026" "Dueño NEXO"   # crea el usuario del dueño
npm run dev                                        # probar en http://localhost:3000
```
`db:setup` no pisa datos si la base ya tiene contenido. Para empezar de cero sin productos de ejemplo, borrá los de ejemplo desde el panel (o `npm run db:setup -- --force-seed` para volver al ejemplo).

### 3. Publicar
**Netlify (elegido para NEXO):** paso a paso para no técnicos en [PUBLICAR-EN-NETLIFY.md](PUBLICAR-EN-NETLIFY.md). Resumen: repo en GitHub → Netlify importa el repo (lee `netlify.toml`: `npm run db:setup && npm run build`, adaptador `@netlify/plugin-nextjs`, Node 22) → variables `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` y, solo la primera vez, `ADMIN_USER` + `ADMIN_PASSWORD` (crea el usuario con bcrypt si no existe ninguno; después se borra). Las subidas de video van en partes de 3 MB, por debajo del límite de 6 MB de las funciones de Netlify. Verificado localmente con `netlify build --offline`: compilación de Next y empaquetado de funciones OK (el empaquetado de edge functions necesita internet y lo hace Netlify).

**Vercel:** subí el proyecto a un repo de GitHub → <https://vercel.com/new> → importalo → en *Environment Variables* cargá `DATABASE_URL`, `AUTH_SECRET` y `NEXT_PUBLIC_SITE_URL` → Deploy. Nota: el plan Hobby de Vercel es para uso no comercial; para un negocio corresponde el plan Pro, o usar **Netlify** (mismo procedimiento, detecta Next.js solo).

**Dominio:** comprá el `.com.ar` en NIC Argentina y apuntalo desde el panel de Vercel/Netlify (Domains). Después actualizá `NEXT_PUBLIC_SITE_URL` y el campo "Dirección de la web" en *Datos del negocio → Google*.

---

## Qué falta configurar (no está simulado)

| Pendiente | Dónde se carga | Estado |
|---|---|---|
| Número de WhatsApp real | Panel → Datos del negocio → WhatsApp y contacto | Vacío. Mientras falte, el panel muestra un aviso, los botones de WhatsApp no aparecen y los pedidos igual se guardan en el panel (el cliente ve el pedido para copiarlo). |
| Enlace del canal de WhatsApp | Mismo lugar | Vacío. Se obtiene en WhatsApp → Novedades → el canal → Compartir enlace. |
| Fotos reales de productos y logo | Panel → Productos / Datos del negocio → Nombre y logo | Las imágenes actuales son ilustraciones de ejemplo generadas. |
| Productos, precios y stock reales | Panel → Productos | Los 17 productos y precios son de ejemplo; la cotización del dólar ($1.450) también. |
| Base de datos y hosting | Supabase (cuenta del dueño, Diego invitado) + Netlify | Sin crear. Ver PUBLICAR-EN-NETLIFY.md. |
| Dominio | NIC Argentina | Sin comprar. |
| Cobro online con Mercado Pago | — | **No activo.** Ver abajo. |
| Resumen diario automático por WhatsApp | — | **No activo.** Hoy es un botón "Mandarme el resumen" que abre WhatsApp con el texto listo. Para que llegue solo hace falta la **WhatsApp Business Cloud API** (Meta, paga por mensaje): número verificado, token y plantilla aprobada. No se simula. |
| Avisos al cliente automáticos | — | Igual que arriba: hoy son botones que abren WhatsApp con el mensaje armado; automáticos requieren la API paga. |

### Mercado Pago (preparado, no activo)
La tabla `orders` ya tiene `payment_status` (pendiente/pagado) y `payment_ref` (para el ID de pago), y "Mercado Pago" existe como forma de pago que se puede tildar en el panel (hoy significa "te paso el link/alias de MP por WhatsApp"). Para cobrar online hace falta:
1. Cuenta de Mercado Pago del negocio → <https://www.mercadopago.com.ar/developers> → crear aplicación → **Access Token** de producción.
2. Variable de entorno `MP_ACCESS_TOKEN` (solo servidor, nunca en el navegador).
3. Implementar: al enviar el pedido, crear una *preferencia* (Checkout Pro) con los ítems recalculados en el servidor y redirigir; un webhook `/api/mp/webhook` que verifique el pago con la API de MP y marque `payment_status='pagado'` + `payment_ref`.
Sin esas credenciales no se activa ningún botón de pago online.

### Por qué el canal de WhatsApp no se publica solo
WhatsApp no ofrece ninguna API para publicar en Canales (ni en estados). Cualquier "publicación automática" sería un bot no oficial que arriesga el bloqueo del número. Por eso el panel genera la imagen + texto + enlace y, en el celular, un toque abre el menú de compartir con todo listo: se elige el canal y se envía. Es un solo paso manual y queda registrado qué productos ya se compartieron.

---

## Créditos y licencias de terceros
- Recorte de fondo: modelo **U²-Net-p** (Qin et al., licencia Apache 2.0) en `public/models/u2netp.onnx`, ejecutado con **ONNX Runtime Web** (Microsoft, MIT) desde `public/vendor/ort/`. Todo corre en el navegador del dueño: las fotos no se mandan a ningún servicio.
- Lectura de Excel: **read-excel-file** (MIT).
- Íconos: Lucide (ISC). Tipografías: Inter y Montserrat (OFL).

## Estructura

```
db/schema.sql                 Esquema (idempotente)
scripts/setup-db.mjs          Crea tablas + contenido de ejemplo
scripts/create-admin.mjs      Crea/actualiza el usuario del panel
scripts/demo.mjs              Modo demo con PGlite
src/app/(site)/               Web pública
src/app/admin/                Panel
src/app/compartir/[id]/       Imágenes para canal/estados
src/app/order-actions.ts      Alta de pedidos (validación, precios, stock)
src/app/admin/actions.ts      Acciones del panel
src/lib/                      Datos, precios, formato, SEO, auth
```

Comandos: `npm run dev` · `npm run build` · `npm run typecheck` · `npm run db:setup` · `npm run admin -- usuario "clave" "Nombre"` · `npm run demo`.
 
