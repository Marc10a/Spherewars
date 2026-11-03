# WordPress headless para SphereWars

Estado: **capa de la web (Next.js) terminada y probada con un WordPress simulado. El plugin de WordPress y la migración NO están hechos** (ver "Pendiente"). Nada de esto se ha publicado en producción.

## Arquitectura

```
Editor ──► WordPress (cms.tu-dominio.com)  ──REST /wp-json/sphere/v1/*──►  Next.js (tu-dominio.com, público)
            panel privado, login Google                                     diseño oscuro intacto, es/en/ca
            plugin "SphereWars Core"        ◄── POST /api/revalidate ──     (al publicar refresca la página)
                                            ◄── GET  /api/preview    ──     (botón Vista previa de borradores)
```

- La web pública **no cambia de diseño**. WordPress solo aporta contenido.
- Si WordPress no responde (caída, lento >4 s, JSON inválido) la web usa su contenido estático/Supabase: **nunca se rompe ni se queda en blanco**. Probado.
- Sin `WP_API_URL` la web funciona exactamente como antes.
- Tienda y pedidos siguen en Stripe + Supabase (recomendado; WooCommerce no es necesario).

## Contrato de datos (`src/lib/cms/contract.ts`)

Endpoints que debe ofrecer el plugin, namespace `/wp-json/sphere/v1`, solo contenido **publicado** salvo con token:

| Endpoint | Parámetros | Devuelve |
|---|---|---|
| `news` | `lang`, `limit`, `slug`, `preview=1` | `{items:[{id,slug,title,category,published_at,excerpt,content_html,image{url,alt},seo{title,description}}]}` |
| `events` | `lang`, `when=upcoming\|past`, `slug`, `limit` | `{items:[{id,slug,kind,title,starts_at,ends_at,organizer,city,address,format,requirements,description,prizes,fee_cents,capacity,registration_url,image,seo}]}` |
| `featured-minis` | — | `{slugs:["personajes/<faccion>/<mini>", ...]}` (miniaturas destacadas de la home) |

Ejemplos reales en `wordpress/fixtures/`. Todo se valida con zod: lo que no cumple el contrato se descarta. URLs de imagen/enlaces: solo `https`.

## Seguridad ya implementada en la web

- HTML de WordPress re-sanitizado con lista blanca (sin scripts, estilos, manejadores de eventos, iframes, `javascript:`/`data:`/`http:`); enlaces externos con `rel="noopener nofollow"`.
- Imágenes de WordPress solo si son del mismo dominio que `WP_API_URL`.
- `/api/revalidate`: cabecera `x-revalidate-secret`, comparación en tiempo constante, solo rutas conocidas de la web (`/es/novedades/...`; rechaza `/admin`, `//evil.com`, `..`).
- `/api/preview`: `?secret=...&type=news|event&slug=...&locale=es` activa el modo borrador (cookie solo de ese navegador); `/api/preview/exit` lo cierra. Los borradores se piden a WordPress con `WP_PREVIEW_TOKEN` desde el servidor; un visitante nunca los ve (probado: 404 sin cookie).
- Los secretos solo existen en el servidor; no hay `NEXT_PUBLIC_` para ninguno.

## Variables de entorno

`WP_API_URL`, `WP_PREVIEW_TOKEN`, `PREVIEW_SECRET`, `REVALIDATE_SECRET` (ver `.env.example`). Genera cada secreto con un valor aleatorio largo y guárdalos solo en el panel del hosting y en `wp-config.php`. No los pegues en el chat.

## Diseño previsto del plugin "SphereWars Core" (pendiente)

- Tipos de contenido: Miniaturas, Facciones, Lore/Historias, Noticias, Eventos, con campos propios y borrador → revisión → publicado.
- Panel limpio con la marca SphereWars y solo los menús necesarios; edición de SEO (título/descripción) y redirecciones por contenido.
- **Acceso:** solo Google OAuth y solo **una cuenta autorizada** definida en una constante de `wp-config.php` (no editable desde el panel); comprobación en el servidor del correo verificado (`email_verified`), `state`/PKCE, sin contraseña local para ese usuario, 2FA/login por defecto desactivados o restringidos, límite de intentos.
- Al publicar: llamada a `/api/revalidate`. Botón "Vista previa" hacia `/api/preview`.
- Imágenes: biblioteca de medios de WordPress con texto alternativo obligatorio.
- Traducciones es/en/ca: depende de tu respuesta (Polylang u otra opción).

## Plan de migración (con copia de seguridad antes)

1. Copia completa del WordPress actual de spherewars.es (archivos + base de datos) y del Supabase si ya existe. Descargarla fuera del servidor.
2. Montar WordPress nuevo en un subdominio (p. ej. `cms.`) sin tocar el dominio público.
3. Instalar el plugin, importar lore (162 páginas) y miniaturas (71) y las imágenes.
4. Apuntar un entorno de pruebas de la web a ese WordPress y revisar todo con vista previa.
5. Con tu aprobación explícita: redirecciones 301 de las URL antiguas, cambio de DNS y publicación.

## Cómo probarlo en local (sin WordPress)

```bash
npm run mock:wp          # WordPress simulado en http://localhost:4020 (usa wordpress/fixtures)
npm run test:cms         # 12 pruebas: contrato, cliente, sanitizado, secretos
```
Después compilar con `WP_API_URL=http://localhost:4020`, `WP_PREVIEW_TOKEN=secret-preview-token`, `PREVIEW_SECRET`, `REVALIDATE_SECRET`.

Resultado de la prueba de extremo a extremo hecha: noticias, eventos y miniaturas destacadas del WordPress simulado aparecen en la home; el detalle de noticia se sanitiza; la vista previa muestra el borrador solo con cookie; `/api/revalidate` responde 401 sin secreto y filtra rutas; con el WordPress parado la web compila y sirve el contenido de respaldo.

## Lo que NO está verificado / pendiente

- El plugin PHP no existe todavía: en este equipo no hay PHP ni MySQL para ejecutarlo y probarlo, y no quiero entregar sin pruebas un login Google de cuenta única. Hay que probarlo en un WordPress de pruebas.
- El contenido real de WordPress no se ha importado.

## Tienda con WooCommerce (headless) — análisis y propuesta

**Cómo está hoy la tienda:** Next.js + catálogo en Supabase (productos, precios, stock, pedidos) + pago con Stripe Checkout. Catálogo = las 71 miniaturas de la wiki (foto y nombre); precio, cantidad y compra solo en la ficha `/tienda/<facción>/<miniatura>`. Un producto es comprable únicamente si tiene precio y está publicado; si no, la ficha muestra «No disponible» y desactiva la compra. No hay precios ni stock inventados.

**Opciones para WooCommerce (sin cambiar el diseño ni el framework):**

| | A. WooCommerce como backend de la tienda (recomendada si usas WordPress) | B. Seguir con Supabase + Stripe y WordPress solo para contenido |
|---|---|---|
| Productos, galerías, precios, stock | En WooCommerce (panel de WordPress) | En `/admin` de la web |
| Carrito | En la web (como ahora); al pagar se envía a WooCommerce | En la web |
| Pedidos, clientes, pagos | WooCommerce (Stripe/PayPal/Redsys con sus plugins), facturas, correos, impuestos | Stripe + panel propio, más básico |
| Panel único | Sí (todo en WordPress) | No (dos paneles) |
| Trabajo | Capa de conexión + plugin de apoyo + pruebas en un WooCommerce real | Ya hecho |

**Cómo encajaría A (headless):**
1. Productos: la web lee `GET /wp-json/wc/v3/products` (o el endpoint propio del plugin) **solo desde el servidor** con claves de WooCommerce de solo lectura; se valida con zod igual que noticias y se cachea/revalida al publicar (`/api/revalidate`). Mapeo: `slug` del producto = última parte de la miniatura de la wiki (o campo propio `wiki_slug`), `images[]` = galería, `regular_price`/`sale_price` = precio, `stock_status`/`stock_quantity` = disponibilidad, `categories` = facción, `status=publish` = visible.
2. Carrito y «Comprar ahora»: la web conserva su carrito. Al «Finalizar compra», el servidor crea el pedido en WooCommerce (`POST /wp-json/wc/v3/orders`, precios releídos de WooCommerce, nunca del navegador) y lleva al cliente a la página de pago de WooCommerce (`order-pay`) con el pasarela real configurada. Alternativa: Store API (`/wc/store/v1/cart`) con el carrito de WooCommerce.
3. Pedidos y clientes: se gestionan en WooCommerce; el webhook de WooCommerce avisa a la web si hace falta.
4. Panel (lo que pides): añadir/editar miniaturas, varias fotos por producto, nombre, precio, facción (categoría), activar/desactivar (publicar/borrador), existencias, pedidos, eliminar con confirmación (papelera de WooCommerce) y descripción SEO. Acceso solo con tu cuenta de administrador autorizada (ver diseño de acceso con Google arriba).

**No está hecho todavía** (necesita un WooCommerce real para probarse; aquí no hay PHP/MySQL): la lectura de productos de WooCommerce, el pedido/pago hacia WooCommerce y el plugin de apoyo. Hasta que decidas A o B, la tienda funciona con Supabase + Stripe. **No cambio nada de la tienda real ni la publico sin tu autorización.**

### Estado de la integración WooCommerce (opción A elegida)
**Hecho y probado contra un WooCommerce simulado (`npm run mock:wc`, `npm run test:woo`, 9 pruebas):**
- Catálogo: la web lee los productos publicados de WooCommerce (`/wc/v3/products`, claves solo en el servidor, validados con zod). Precio, stock, galería (solo imágenes https del dominio de WooCommerce), facción (categoría con el *slug* de la facción) y enlace con la miniatura de la wiki (campo personalizado `sw_wiki_slug`, o si no, mismo *slug* que la miniatura).
- Envíos: se leen de las zonas de WooCommerce (tarifa plana numérica y envío gratis desde X). Las tarifas con fórmula/clases se ignoran en vez de cobrar mal.
- Pago: al «Finalizar compra» el servidor vuelve a leer productos y envío en WooCommerce, aplica las mismas reglas del carrito, crea el pedido pendiente (solo ids y cantidades; WooCommerce calcula precios) y redirige a la página de pago de WooCommerce (su pasarela real). Se comprobó el pedido creado en el simulado.
- Webhook firmado (`/api/woo/webhook`, HMAC-SHA256): al crear/editar/borrar un producto la tienda se refresca en segundos (probado: válido 200, alterado/sin firma 401).
- Si WooCommerce no responde: la tienda no lista productos (no datos viejos ni inventados) y el checkout se cierra.

**Pasos para ponerlo en marcha (tú, en tu WordPress):** instalar WooCommerce; crear las 4 categorías con el slug de cada facción; crear productos (nombre, precio, galería, stock, categoría; opcional el campo `sw_wiki_slug`); configurar zonas de envío y la pasarela de pago (Stripe/PayPal/Redsys); crear la clave API (lectura/escritura) y el webhook de productos; poner las 4 variables `WC_*` en el hosting. El panel de WooCommerce ya permite subir varias fotos, cambiar nombre/precio/facción, activar/desactivar (borrador), stock, ver pedidos y borrar con papelera.

**No verificado (no hay PHP/WooCommerce reales aquí):** el comportamiento con un WooCommerce de verdad (versiones, impuestos, plugins de envío), el redirect tras el pago a la web, y el acceso con tu cuenta de Google a WordPress (plugin pendiente). Hay que probarlo en un WordPress de pruebas antes de publicar. No se ha publicado nada.

**Importar los productos en WooCommerce:** `wordpress/productos-woocommerce.csv` (24 miniaturas con precio «Propuesta», SKU del Excel, categoría = facción y campo `sw_wiki_slug`). En WordPress: Productos > Importar > elegir el CSV. Luego añade las fotos en cada producto.
