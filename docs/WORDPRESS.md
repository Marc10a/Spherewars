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
**Hecho y probado contra un WooCommerce simulado (`npm run mock:wc`, `npm run test:woo`):**
- Catálogo: la web lee los productos publicados de WooCommerce (`/wc/v3/products`, claves solo en el servidor, validados con zod). Precio, stock, galería (solo imágenes https del dominio de WooCommerce), facción (categoría con el *slug* de la facción) y enlace con la miniatura de la wiki (campo personalizado `sw_wiki_slug`, o si no, mismo *slug* que la miniatura).
- Catálogo tolerante: un producto con datos inválidos se omite y se registra en el log (id y campos, sin valores); el resto de la tienda sigue. Dinero e ids se siguen validando estrictamente. Los Starter Packs se enlazan con `sw_wiki_slug` = `packs/<facción>` (solo enlace explícito) y los alias (`postulante-raso` = `corazon-postulante`) cuentan como el mismo producto. Las rebajas se exponen en `regular_price_cents` y `sale_price_cents`; lo que se cobra sigue siendo `price_cents`.
- Envíos: se leen de las zonas de WooCommerce (tarifa plana numérica y envío gratis desde X), en su mismo orden, porque WooCommerce elige la primera zona que coincide. Los continentes se convierten en países con la lista del propio WooCommerce (`/data/continents`). Las tarifas con fórmula/clases cierran esos países en vez de cobrar mal. Si una zona o continente no se puede leer, se cierra el envío.
- Pago: al «Finalizar compra» el servidor vuelve a leer productos y envío en WooCommerce, aplica las mismas reglas del carrito, crea el pedido pendiente (solo ids y cantidades; WooCommerce calcula precios) y redirige a la página de pago de WooCommerce (su pasarela real). Se comprobó el pedido creado en el simulado.
- Webhook firmado (`/api/woo/webhook`, HMAC-SHA256): al crear/editar/borrar un producto la tienda se refresca en segundos (probado: alterado/sin firma 401). El «ping» de WooCommerce al guardar el webhook no va firmado: solo su forma exacta (`webhook_id=<id>`, sin cabecera de firma) recibe 200, y no cambia nada.
- Si WooCommerce no responde: la tienda no lista productos (no datos viejos ni inventados) y el checkout se cierra.

- Antes de cobrar: se exige una pasarela activa, leída de `/payment_gateways`. Si no se puede leer (por ejemplo, una clave sin permisos), el pago se cierra. La clave debe ser de un usuario administrador o gestor de tienda.
- Límites: 20 intentos por visitante y hora y 60 por red (en memoria, por instancia del servidor), antes de llamar a WooCommerce. Además hay un límite duradero contado sobre los pedidos reales de la última hora: 5 sin pagar por visitante y 15 por red. Un visitante es una IPv4 o un bloque IPv6 /64; una red es un /24 o un /48. Si se superan, el cliente ve el error `busy`. En el pedido se guarda un hash del visitante y otro de la red (`sw_client`, `sw_network`), nunca la IP: son datos seudónimos que deben figurar en la política de privacidad.
- Sin bloqueo general: con 40 pedidos sin pagar en la última hora (o una lectura de 100) no se cierra la tienda, porque cualquiera podría provocarlo. Se registra `woo: ALERT` en el log y bajan los límites a 1 por visitante y 3 por red.
- **Riesgo que queda:** quien controle muchas redes distintas (botnet, muchos proveedores) aún puede crear pedidos pendientes, unos 3 por red y hora. La lectura solo ve los 100 pedidos más recientes, así que con una inundación mayor el recuento duradero se queda corto y solo protege el límite en memoria, que no se comparte entre instancias. Bajo ataque, los clientes que compartan IP o red (móvil, oficinas) pueden recibir `busy`. El log solo avisa si alguien lo mira: conviene una alerta del hosting sobre `woo: ALERT`. Falta comprobar en una tienda real que los pendientes no reservan stock.
- Sin pedidos duplicados: WooCommerce no tiene clave de idempotencia ni filtro de pedidos por meta. Por eso el pedido lleva `sw_checkout_key` (navegador, visitante, líneas, precios, destino y envío) y se busca entre los pedidos pendientes de la última hora antes de crear otro y tras un resultado incierto (timeout, 5xx). Si no se pueden leer los pedidos, no se crea ninguno. **Queda un margen pequeño:** dos envíos simultáneos, o un reintento antes de que WooCommerce termine de guardar, aún pueden crear dos pedidos pendientes. Solo se cobra el que el cliente pague.
- Dos clientes nunca comparten pedido: el servidor pone al pagar una cookie técnica `sw_checkout` (HttpOnly, SameSite=Lax, Secure en producción, 24 horas) con un id aleatorio por navegador, que forma parte de la clave. Añádela a la política de cookies.
- Errores del carrito (WooCommerce): `?e=<código>&line=<id numérico del producto>`. `line` solo aparece si se conoce la línea que falló.

### IP del visitante: obligatorio configurarla en producción
Los límites solo sirven si la IP no se puede falsificar, y una cabecera solo es fiable si la escribe el proxy de tu hosting. Por eso `x-real-ip` y `x-forwarded-for` no se usan por defecto. **Sin una fuente de confianza, en producción no se ofrece el pago.**
- **Vercel:** nada que hacer. Se usa `x-vercel-forwarded-for`, que pone la propia plataforma ([documentación](https://vercel.com/docs/headers/request-headers)).
- **Cloudflare delante del servidor:** `WC_CLIENT_IP_HEADER=cf-connecting-ip`, solo si el servidor no acepta conexiones directas que no vengan de Cloudflare.
- **Hostinger u otro proxy propio:** `WC_CLIENT_IP_HEADER=x-forwarded-for` y `WC_TRUSTED_PROXY_HOPS=` número de proxies de confianza (por defecto 1). La IP se cuenta desde la derecha. **No está comprobado en Hostinger:** verifica cuántos proxies hay enviando una petición con un `X-Forwarded-For` inventado y confirmando que ese valor no se toma como IP.

En la lista de `/admin/tienda`, que aún habla de Supabase y Stripe, con WooCommerce: «Clave de servidor» = fuente de IP; «Clave de Stripe» = pasarela lista; «Secreto del webhook» = `WC_WEBHOOK_SECRET` puesto (no comprueba que WordPress lo llame); «Dirección pública» = `NEXT_PUBLIC_SITE_URL` con https. Las dos últimas no bloquean el pago. «Base de datos» sale siempre en verde porque WooCommerce no la necesita.

### Lo que el carrito no puede representar (se cierra, no se adivina)
El carrito solo conoce el **país**, así que:
- **Canarias, Baleares, Ceuta y Melilla:** si creas una zona por provincia o código postal (`ES:TF`, `35*`...), **todo el país deja de venderse** hasta tener un paso de dirección, porque el carrito no sabría qué tarifa aplicar. Para abrir la tienda usa una sola zona con el país España. Eso significa una única tarifa para toda España: decide si te sirve. Además, Canarias, Ceuta y Melilla quedan fuera del IVA de la UE: consúltalo con tu asesor.
- **«Resto del mundo» (zona 0):** no tiene lista de países, así que esos destinos no se venden.
- **Más de 6 zonas:** las que sobran no se ofrecen.

### Vuelta a la web tras pagar: requiere un fragmento en WordPress
**Sin este fragmento el cliente termina en WordPress**, no vuelve a `/tienda/gracias` y su carrito de la web no se vacía. WooCommerce no permite indicar la URL de vuelta al crear un pedido por la API. La web sí guarda el destino en el pedido (`sw_return_url`, necesita `NEXT_PUBLIC_SITE_URL` con https), y este fragmento lo usa. Añádelo con el plugin Code Snippets o en `wp-content/mu-plugins/` y cambia el dominio:

```php
<?php
const SW_SHOP_HOST = 'spherewars.es'; // el dominio de la web, sin https

function sw_shop_return_url($url, $order) {
    if (!$order instanceof WC_Order) return $url;
    $target = (string) $order->get_meta('sw_return_url');
    if (wp_parse_url($target, PHP_URL_SCHEME) !== 'https' || wp_parse_url($target, PHP_URL_HOST) !== SW_SHOP_HOST) return $url;
    return add_query_arg(['wc_order' => $order->get_id(), 'wc_key' => $order->get_order_key()], $target);
}
add_filter('woocommerce_get_return_url', 'sw_shop_return_url', 20, 2);
add_filter('woocommerce_get_checkout_order_received_url', 'sw_shop_return_url', 20, 2);

add_filter('allowed_redirect_hosts', function ($hosts) { $hosts[] = SW_SHOP_HOST; return $hosts; });

// WooCommerce only auto-cancels unpaid orders from its own checkout. Without this, abandoned orders from the web stay pending.
add_filter('woocommerce_cancel_unpaid_order', function ($cancel, $order) {
    return $cancel || $order->get_meta('sw_checkout_key') !== '';
}, 10, 2);
```

**En la web:** `/tienda/gracias` ya lee `?wc_order=&wc_key=` y llama a `wooOrderReturn(id, key)`, que lee el pedido en WooCommerce porque la URL no prueba nada. Muestra «pagado» solo si `paid` es verdadero y vacía el carrito si la clave es válida. Solo está probada la lectura del pedido contra el simulador, no la vuelta real. Algunas pasarelas pueden no usar estos filtros: compruébalo con la tuya.

### Datos del cliente: el bloqueo principal
**Hoy no se puede vender de verdad con este flujo.** El pedido solo lleva el país, y la página `order-pay` **no pide dirección**: su plantilla `checkout/form-pay.php` muestra el pedido, las pasarelas y los términos, y `pay_action()` solo lee del pedido los datos de facturación. Sin dirección no hay a dónde enviar, y sin email el cliente no recibe confirmación.

| | Enlace de checkout de WooCommerce (**recomendado**) | Formulario de dirección en la web, y luego `order-pay` |
|---|---|---|
| Cómo | La web redirige a `/checkout-link/?products=ID:cantidad,ID:cantidad` | La web pide los datos y los envía en `POST /orders` |
| Dirección, email, teléfono | Los recoge el checkout normal de WooCommerce | Hay que construir el formulario, validarlo y añadir el consentimiento |
| Canarias/Baleares e impuestos | WooCommerce decide con la dirección real | La web tendría que replicar provincias e impuestos |
| Clave de API | Puede bastar con solo lectura si se deja de crear pedidos | Lectura/escritura |
| En WordPress | Nada nuevo salvo el fragmento de vuelta (opcional) | Lo mismo, y además la verificación de email de abajo |
| Inconvenientes | Requiere WooCommerce 10.0 o superior; el pago se ve con el aspecto de WordPress | Más código propio; duplica lo que ya hace WooCommerce |

Con la segunda opción, un invitado que abra `order-pay` pasados 10 minutos debe verificar su email (`should_user_verify_order_email`; ajustable con el filtro `woocommerce_order_email_verification_grace_period`).

Con el enlace, el pedido lo crea el checkout de WooCommerce: dejan de hacer falta `sw_checkout_key`, la cookie y los límites sobre pedidos, y la vuelta tendría que usar una URL fija, no `sw_return_url`. **Aún no está implementado ni probado.** Falta comprobar en un WooCommerce real que funciona para invitados y qué ocurre si el cliente ya tenía un carrito allí.

Fuentes: [URLs de checkout](https://developer.woocommerce.com/docs/best-practices/urls-and-routing/checkout-urls/), [guía para comerciantes](https://woocommerce.com/document/creating-sharable-checkout-urls/), [PR 58140](https://github.com/woocommerce/woocommerce/pull/58140), [form-pay.php](https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/templates/checkout/form-pay.php), [class-wc-form-handler.php](https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/includes/class-wc-form-handler.php), [class-wc-webhook.php](https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/includes/class-wc-webhook.php). La versión 10.0 procede de fuentes de terceros ([Business Bloomer](https://www.businessbloomer.com/woocommerce-shareable-checkout-urls-explained/)): confírmala en las notas de la versión.

### Impuestos: el total mostrado puede no coincidir con el cobrado
El carrito suma `price` y el envío tal cual. WooCommerce recalcula el pedido: toma el precio de línea **sin impuestos** según su configuración y su ubicación fiscal, y el importe de `shipping_lines` se envía sin saber si lleva IVA. Por eso, con impuestos activados, el total de `order-pay` podría superar al del carrito. Hay que comprobar en una tienda real:
1. Ajustes > Impuestos: «Precios introducidos con impuestos» = sí, y las tasas de IVA de España y de cada país al que vendas.
2. Crear un pedido de prueba por cada zona, con y sin envío gratis, y comparar el total del carrito con el `total` y `total_tax` del pedido y con `order-pay`.
3. Si el envío tributa, comprobar si la tarifa plana ya incluye IVA, porque ahí es donde es más probable la diferencia.
4. Comprobar el umbral de «envío gratis desde X»: la web compara con el subtotal mostrado, y WooCommerce puede calcularlo de otro modo.

**Pasos para ponerlo en marcha (tú, en tu WordPress):** instalar WooCommerce; crear las 4 categorías con el slug de cada facción; importar o crear productos (nombre, precio, galería, stock, categoría, y `sw_wiki_slug`; en los packs, `packs/<facción>`); configurar zonas de envío y activar la pasarela de pago (Stripe/PayPal/Redsys); crear la clave API (lectura/escritura) de un usuario administrador o gestor de tienda y el webhook de productos; poner las 4 variables `WC_*` en el hosting y, fuera de Vercel, la fuente de IP; añadir el fragmento de vuelta. El panel de WooCommerce ya permite subir varias fotos, cambiar nombre/precio/facción, activar/desactivar (borrador), stock, ver pedidos y borrar con papelera.

**No verificado (solo se ha probado contra el simulador, que imita las respuestas pero no calcula impuestos ni muestra página de pago):** todo el comportamiento en un WooCommerce real: versiones, impuestos, plugins de envío, permisos de `/payment_gateways` y `/data/continents`, el filtro `after` de pedidos con su zona horaria, si la meta `sw_*` se guarda y se devuelve como se espera, el fragmento de vuelta con cada pasarela, y el acceso con tu cuenta de Google a WordPress (plugin pendiente). La acción `startCheckout` se ejecuta contra el simulador con `next/headers` y `next/navigation` sustituidos, no dentro de Next. Hay que probarlo en un WordPress de pruebas antes de publicar. No se ha publicado nada.

**Importar los productos en WooCommerce:** `wordpress/productos-woocommerce.csv` (24 miniaturas con precio «Propuesta», SKU del Excel, categoría = facción y campo `sw_wiki_slug`). En WordPress: Productos > Importar > elegir el CSV. Luego añade las fotos en cada producto.
