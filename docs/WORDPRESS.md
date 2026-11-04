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
- La tienda se vende con WooCommerce (decisión tomada; ver la sección «Tienda con WooCommerce»). El camino Stripe + Supabase solo sigue compilando y no se amplía.

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

1. Copia completa del WordPress de la tienda (archivos + base de datos) y del Supabase si ya existe. Descargarla fuera del servidor.
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

- El plugin de contenido (`sphere/v1`, login de Google) no existe todavía. El plugin de la tienda es otro y está en `woo-local/deploy/`.
- El contenido real de WordPress no se ha importado.

## Tienda con WooCommerce (headless)

**Decisión:** WooCommerce para la tienda; el resto de la web sigue en Next.js. La web (Vercel) lleva el catálogo y el carrito. **El pago, la dirección, el email, el IVA, los gastos de envío y el pedido son del checkout normal de WooCommerce.**

```
Web (Vercel): catálogo y carrito ── /checkout-link/?products=ID:cant,...&sw_lang=es ──► WooCommerce: dirección, email, envío, IVA, pago, pedido
          /tienda/gracias?wc_order=&wc_key=  ◄── plugin SphereWars Tienda ─────────────┘
          (la web lee el pedido con clave de solo lectura; la URL no prueba nada)
```

### Qué se ha comprobado y dónde
**En un WooCommerce real** (11.2.1, WordPress 7.1.1 y 7.1.4, PHP 8.5.9, SQLite, HTTPS local, solo en este equipo; invitado, escritorio y tamaño iPhone 13 en Chromium; contra reembolso y transferencia como pasarelas de prueba). La segunda instalación se montó solo con el paquete, desde wp-admin::
- Catálogo: se leen los 34 productos del CSV, Starter Packs incluidos, y se venden.
- Compra completa con datos ficticios: el pedido contiene email, dirección de envío y facturación, líneas, IVA y envío. Queda en `processing` (contra reembolso) u `on-hold` (transferencia). El comprador vuelve a `/tienda/gracias` en su idioma y el carrito se vacía. Baja el stock gestionado.
- Hasta entrar a pagar no se crea ningún pedido. Un checkout abandonado no deja pedidos.
- Compatibilidad: sin errores fatales ni avisos «Deprecated» de WooCommerce en PHP 8.5.9 con `WP_DEBUG`, en los recorridos anteriores. Solo se ha ejercitado lo que se ha usado. WooCommerce declara «Tested up to 7.1» y no declara PHP 8.5.
- Agotado: si se agota antes de pulsar, el carrito señala la línea (`?e=out_of_stock&line=`). Si se agota con el formulario ya rellenado, WooCommerce rechaza el pedido.
- Cambio de precio: se cobra siempre el precio de WooCommerce. Tras el webhook, el carrito avisa.
- Cerrado: sin pasarela, o con WooCommerce caído, la web muestra «aún no a la venta» y no deja pagar. Al apagar una pasarela, el botón ya no redirige, aunque la página siga en caché.
- Webhook firmado real: entregado con firma válida (200); alterado o sin firma, 401. WooCommerce lo envía en segundo plano, con WP-Cron.
- La clave de **solo lectura** basta para todo lo que hace la web: `POST /orders` con ella da 401.

**Solo contra el simulador** (`npm run test:woo`): lectura de productos inválidos, formas de error y claves sin permiso. No sustituye a lo anterior.

**No se puede probar en local:** una pasarela real y su vuelta (Redsys, Stripe, PayPal), MySQL en cdmon, los correos reales (aquí se escriben a un archivo), el acceso desde Vercel a cdmon, `next/image` con el dominio real (en local Next rechaza las IP privadas: la galería se comprobó con esa opción activada solo en la copia local) y las traducciones.

### Decisión sobre los datos del cliente
Comprobado: `order-pay` no pide dirección ni email, y un pedido creado por API se pagaba con ambos vacíos. Había dos caminos, y se eligió el enlace de checkout:
- Funciona para invitados, y el mismo checkout decide envío e IVA con la dirección real. Por eso Canarias o Baleares se resuelven en WooCommerce y la web ya no cierra países.
- Sobran la escritura de pedidos, la idempotencia, los límites por pedidos, la cookie `sw_checkout` y la fuente de IP: **ya no hace falta `WC_CLIENT_IP_HEADER` ni `WC_TRUSTED_PROXY_HOPS`**.
- Un formulario propio habría duplicado validación, consentimiento, provincias e impuestos. `order-pay` también exige verificar el email a los invitados pasados 10 minutos.
- El enlace vacía el carrito de WooCommerce de ese navegador antes de llenarlo, así que un carrito anterior no se mezcla.

**Inconvenientes:**
- El pago tiene el aspecto de WordPress. El plugin pone los colores de la marca, pero la cabecera, el tipo de letra y la maquetación son del tema activo. No coincide del todo con la web.
- El envío no se ve en el carrito de la web, solo en el paso siguiente («Envío calculado en el siguiente paso»). El importe está a la vista antes de confirmar.
- El checkout sale en el idioma de WordPress (español) aunque el comprador venga de `/en` o `/ca`. La vuelta sí respeta su idioma.

### IVA y envío: lo que se ha corregido con la prueba
- **WooCommerce guarda la tarifa plana SIN IVA, aunque los precios incluyan IVA.** Con 5,00 € de tarifa, el carrito antiguo decía 57,98 € y el pedido cobraba 59,03 € (envío 6,05 €). El asistente pide el precio **con** IVA y guarda la cifra sin él (5,00 € → 4,1322 €; se cobra 5,00 €). Si cambias la tarifa a mano, recuerda dividirla entre 1,21.
- Los productos sí incluyen el IVA: 52,98 € de productos + 5,00 € de envío = 57,98 €, de los que 10,06 € son IVA.
- Canarias, Ceuta y Melilla quedan fuera del IVA: con la zona única se les cobraría IVA y la misma tarifa. Consúltalo con tu asesor y añade zonas y tasas en WooCommerce; la web no necesita cambios.

### Otros hallazgos de la prueba
- **El modo «Próximamente» de WooCommerce (activo al instalar) bloquea el pago a los invitados** con una página de aviso. Quítalo al final. La web no puede detectarlo.
- El CSV llevaba un BOM que impedía reconocer la columna «Type» al importar. Corregido en `scripts/make-woo-csv.mjs`.
- El webhook usaba `revalidateTag("woo", "max")`: el primer visitante tras un cambio seguía viendo el precio o stock anterior. Ahora caduca al momento.
- Con WooCommerce la galería repetía cada foto. Ahora, si el producto tiene fotos en WooCommerce, de la wiki solo se añaden las ilustraciones.
- Una pasarela de transferencia no enseña los datos bancarios al volver a la web: solo llegan por email. Y «Hemos recibido tu pago» se muestra con `processing`, que en contra reembolso no es cierto: esas dos pasarelas solo sirven de prueba si no se ajustan los textos.
- El checkout menciona términos y privacidad sin enlace hasta que asignes esas páginas en WooCommerce > Ajustes > Avanzado y en Ajustes > Privacidad.
- Sin la página de agradecimiento de WooCommerce, comprueba con tu pasarela que usa la URL de vuelta normal. Las estándar lo hacen, pero no se ha probado con una real.

### Puesta en producción (cdmon + Vercel)
Todo se hace desde wp-admin, sin FTP, SSH ni WP-CLI. La lista completa y el plugin están fuera del repositorio, en `woo-local/deploy/` (`README.md`, `spherewars-tienda.zip`). Resumen:
1. **Copia de seguridad** si el sitio tiene contenido. Mejor una instalación nueva en un subdominio, con certificado https y WordPress en español.
2. Enlaces permanentes «Nombre de la entrada». Instala y activa WooCommerce. Sube y activa `spherewars-tienda.zip`.
3. Herramientas > SphereWars tienda: dirección de la web y envío con IVA > Aplicar ajustes > Crear productos > Copiar fotos. No toca páginas ni productos existentes.
4. Existencias reales en cada producto. Pasarela real en modo prueba.
5. WooCommerce > Ajustes > Avanzado > API REST: clave de **lectura**. Webhooks: `product.created`, `product.updated`, `product.deleted`, a `https://<web>/api/woo/webhook`, con un secreto.
6. En Vercel: `WC_API_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, `WC_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`, y vuelve a desplegar (el dominio de las fotos se fija al compilar).
7. Botón **Abrir tienda**. Compra de prueba completa y borra ese pedido.

Añade a la política de cookies y privacidad las cookies de WooCommerce en su dominio (`woocommerce_*`, `wp_woocommerce_session_*`) y que los pedidos se guardan allí. El plugin desactiva las cookies de atribución (`sbjs_*`).

### Lo que la web sigue haciendo
- Catálogo: productos publicados de `/wc/v3/products`, validados con zod, solo en el servidor. Un producto inválido se omite y se registra (id y campos). Galería solo https del dominio de WooCommerce. Enlace con la wiki por `sw_wiki_slug` (`packs/<facción>` en los Starter Packs), o por el mismo *slug*.
- Caché de 5 minutos, que el webhook vacía al momento. Abrir el pago relee productos, envío y pasarela sin caché.
- Lista de `/admin/tienda`, que aún habla de Supabase y Stripe: con WooCommerce, «Clave de Stripe» = pasarela lista; «Secreto del webhook» = `WC_WEBHOOK_SECRET` puesto; «Dirección pública» = `NEXT_PUBLIC_SITE_URL` con https. «Clave de servidor» y «Base de datos» salen en verde porque no hacen falta.
- Errores del carrito: `?e=<código>&line=<id>`.

**Productos:** `wordpress/productos-woocommerce.csv` (34 productos con el precio «Propuesta», SKU del Excel, categoría = facción y `sw_wiki_slug`; 4 son Starter Packs). También se puede importar en Productos > Importar: la asignación de columnas sale sola. Sin datos de stock: no existen todavía.
