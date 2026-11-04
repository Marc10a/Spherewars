# Instalación

```bash
npm install
cp .env.example .env.local   # rellenar claves de Supabase
npm run dev
```

## Base de datos y panel

1. Crear un proyecto en Supabase y copiar URL y anon key a `.env.local`.
2. `supabase link` y `supabase db push` (aplica `supabase/migrations/0001_init.sql` y `0002_cms.sql`).
3. En Supabase Auth, crear el primer usuario (correo + contraseña). Se crea su fila en `profiles` **sin rol**: no entra al panel hasta que se le asigne uno. Desactiva los registros públicos en Supabase Auth.
4. Promoverlo a administrador (SQL editor): `update profiles set role = 'admin' where id = '<uuid del usuario>';`
5. Entrar en `/admin/login`.

### Roles y flujo editorial (forzado por la base de datos)
| Rol | Puede |
|---|---|
| editor | crear y editar; mover borrador ⇄ pendiente de revisión |
| reviewer | pasar pendiente → aprobado, o devolver a borrador |
| admin | todo: publicar, archivar, eliminar |

El público solo ve filas `published` (RLS). Productos con `publish_at` futuro permanecen ocultos (embargo). Todos los cambios quedan en `audit_log`.

## Despliegue
Vercel: importar el repo y definir las variables de `.env.example`. Alternativa Docker: `output: "standalone"` en `next.config.ts`.

Copias de seguridad: backups diarios de Supabase y exportación semanal del bucket `media`.

# Contenido oficial de la wiki

`src/content/wiki.json` y `public/wiki/images/` son una copia de la wiki oficial (wiki-spherewars.klerix.com): 162 páginas y 300 imágenes WebP (~51 MB). La wiki sigue siendo la fuente canónica. Para refrescarla:

```bash
node scripts/sync-wiki.mjs        # descarga páginas e imágenes (tarda varios minutos)
node scripts/optimize-images.mjs  # convierte a WebP y reescribe referencias
```

El HTML se sanea con lista de etiquetas permitidas al sincronizar. Los enlaces internos se reescriben a `/{idioma}/wikisphere/...`. La wiki está solo en español, así que `/en` y `/ca` muestran ese contenido tal cual.

## Idiomas (es / en / ca)

- Todos los textos de interfaz viven en `src/lib/i18n.ts`, un único diccionario tipado: si falta una clave en un idioma, no compila. Las páginas no llevan texto fijo.
- Los nombres propios (Saphir, WikiSphere, SphereEvents, nombres de facciones, personajes y dioses) y el contenido canónico no se traducen. La wiki y las tres leyes divinas solo existen en español: se marcan con `lang="es"` y un aviso en `/en` y `/ca`.
- Los artículos de la wiki en `/en` y `/ca` llevan `canonical` al original en español y `noindex`; el sitemap los lista una sola vez. El resto de páginas tienen `hreflang` es/en/ca/x-default y `og:locale` propio.
- Idioma de entrada: cookie `sw_locale` (se guarda al visitar `/{idioma}`) > idioma del navegador > español. La redirección es 307 (no permanente).
- Fechas, precios y nombres de mes siguen el idioma de la página.
- Las traducciones EN/CA las escribió Claude y **están pendientes de validación**. El panel `/admin` está solo en español (uso interno).

## Estilos (Tailwind) y compilación

- El CSS de la web se **genera aquí** y se incluye ya compilado: `src/styles/tailwind.css` (fuente) → `src/app/globals.css` (generado, no editar). Así el servidor de compilación (Hostinger) no ejecuta Tailwind ni procesos auxiliares de Turbopack.
- Si añades o cambias clases de Tailwind o `src/styles/tailwind.css`, ejecuta `npm run css` antes de subir. `npm run dev` lo hace solo. `npm run check` avisa si el CSS está desactualizado.
- `npm run build` compila con webpack (`next build --webpack`) y deja un servidor autónomo en `.next/standalone` con estáticos e imágenes copiados.

## Fotos de miniaturas
- Cada miniatura usa, por orden: **tu foto** (carpeta `fotos-miniaturas/`) → la imagen de su ficha en la wiki (un render `mini` cuenta como foto, el resto como «Ilustración oficial») → una **ilustración oficial** de la biblioteca de la wiki (`scripts/mini-photo-sources.json`) → marcador «imagen provisional».
- Para añadir tus fotos: guarda cada una con el final del nombre de la ficha (`nirlem.jpg`, `lince.png`…), ejecuta `npm run photos` y vuelve a compilar. Detalle en `fotos-miniaturas/LEEME.txt`.
- Si el producto de la tienda tiene su propia foto subida en el panel, esa se muestra en la tienda.

## Home compacta y contacto (Fase B)
- Carruseles propios (`src/components/Carousel.tsx`): desplazamiento táctil nativo, flechas, puntos y teclado; sin librerías ni autoplay. «Elige tu facción» muestra una facción cada vez; historias, vídeos y miniaturas destacadas son carruseles; en pantallas grandes las historias vuelven a la rejilla original.
- Novedades y eventos: dos columnas compactas con los últimos elementos y botones «Ver todas». `/novedades` es nueva (lee la tabla `news` publicada). La home es estática y se refresca cada 5 minutos.
- Contacto (`#contacto`): formulario con validación en servidor, campo trampa, control de tiempo, límite de 3 mensajes por hora y remitente (huella de IP con sal, sin guardar la IP), Turnstile opcional y entrega por correo (Resend) y/o guardado en la tabla `contact_messages` (migración 0006). Si no hay destino configurado, muestra un aviso en lugar del formulario. Variables en `.env.example`.
- Pruebas: `npm test` (tienda + contacto).

## Comandos útiles
- `npm run check`: verifica enlaces internos, imágenes y arte de facciones (falla si algo falta).
- `npm run sync:wiki`: refresca wiki e imágenes.
- Antiguas URLs de spherewars.es redirigen con 308 (ver `next.config.ts`).

# Estado

**Funciona y está verificado**
- Migraciones: aplicadas y probadas en un Postgres de prueba (flujo editorial por rol, aforo de eventos, consentimiento de galería, auditoría).
- Build, lint y rutas públicas sin Supabase configurado (estados vacíos honestos; `/admin` redirige a login).

**Implementado pero NO probado contra un Supabase real** (no hay proyecto conectado)
- Login/logout, protección de `/admin` en `proxy.ts`, dashboard con cifras reales.
- CRUD de artículos (con versiones y vista previa) y productos (con subida de imagen y texto alternativo obligatorio), cambios de estado.
- Catálogo (`/miniaturas`, filtros por facción y categoría, ficha) y WikiSphere (`/wikisphere`, categorías, búsqueda por título, artículo) leyendo de la BD.
- Las políticas RLS (distintas de los triggers) no se han ejercitado: comprobarlas con usuarios reales al conectar el proyecto.

- Eventos: agenda por meses con filtros (próximos/pasados, ciudad, tipo), ficha con aforo e inscripción propia (aforo forzado por trigger, honeypot anti-bots) o enlace externo; admin con listado de inscritos.
- Descargas: centro público por categorías (versión, idioma, tipo, tamaño, fecha) y admin con subida a Storage (PDF/ZIP/CSV/PNG/JPG, máx. 50 MB).
- Buscador global (`/buscar`): wiki, miniaturas, eventos y recursos publicados, filtrable por tipo; coincidencia por título/nombre (sin índice de texto completo).
- Migración `0003` probada en Postgres de prueba junto a las anteriores.

**Pendiente**
- Editor visual (hoy: texto con marcas simples), gestión de usuarios desde el panel, CRUD de noticias/tiendas/galería.
- Favoritos, visor de mapa, cronologías, formularios de contacto y Heraldos/Embajadores.
- Limitación de peticiones (rate limiting) en la inscripción: hay que añadirla en el borde (Vercel WAF o Upstash) antes de publicar.
- Redirecciones 308 de URLs antiguas, textos legales, tests automatizados.

# Contenido oficial pendiente
Arte panorámico y por facción, logotipo, fotos y datos de miniaturas, textos canónicos de facciones y wiki, mapa de Saphir, cronologías, reglamento 3ª edición (PDF alojado), perfiles, capturas del generador, URL HT Publishers, tiendas colaboradoras, eventos, textos legales, Heraldos/Embajadores, traducciones EN/CA validadas, y resolver las contradicciones de `AUDIT.md`.
