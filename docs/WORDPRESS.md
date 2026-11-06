# WordPress headless para SphereWars

Estado: **capa de la web (Next.js) terminada y probada con un WordPress simulado. Eventos y campaña del mes: plugin «SphereWars Contenido» hecho y probado de extremo a extremo con un WordPress local** (`woo-local/deploy/`, ver «Eventos»). Noticias, miniaturas destacadas, vista previa y migración NO están hechos. Nada de esto se ha publicado en producción.

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
| `events` | `when=upcoming\|past\|all`, `slug`, `limit` (≤200) | `{items:[{id,slug,kind,title,starts_at,ends_at,organizer,city,address,format,requirements,description,prizes,fee_cents,capacity,registration_url,image,logo,time_note,seo}]}`: un elemento por fecha |
| `campaign` | — | `{month:"2026-11",video:{url}\|null,poster:{url,alt}\|null}`; sin mes = sin campaña |
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
npm run test:cms         # 17 pruebas: contrato, cliente, agenda, sanitizado, secretos
```
Después compilar con `WP_API_URL=http://localhost:4020`, `WP_PREVIEW_TOKEN=secret-preview-token`, `PREVIEW_SECRET`, `REVALIDATE_SECRET`.

Resultado de la prueba de extremo a extremo hecha: noticias, eventos y miniaturas destacadas del WordPress simulado aparecen en la home; el detalle de noticia se sanitiza; la vista previa muestra el borrador solo con cookie; `/api/revalidate` responde 401 sin secreto y filtra rutas; con el WordPress parado la web compila y sirve el contenido de respaldo.

## Lo que NO está verificado / pendiente

- El plugin de contenido completo (noticias, miniaturas destacadas, vista previa, login de Google) no existe todavía; «SphereWars Contenido» solo sirve eventos y campaña. El plugin de la tienda es otro y está en `woo-local/deploy/`.
- El contenido real de WordPress no se ha importado.

## Eventos (plugin «SphereWars Contenido»)

`/[locale]/eventos` lee de WordPress la campaña del mes (`campaign`) y todas las fechas (`events?when=all`) cuando `WP_API_URL` está puesto y hay campaña guardada; si no, o si WordPress falla, usa `src/content/events-campaign.json` (y los eventos de Supabase, como antes). Mismo tipo de contenido `sw_event` que `wordpress/theme-src/inc/content.php`, reducido a lo que usa la agenda.
- Un evento de WordPress = una tienda con uno o varios días del mismo mes («7, 14 y 21»); el plugin devuelve un elemento por fecha (`slug` = `<tienda>-<AAAA-MM-DD>`).
- `time_note` igual a un texto de `events.slots` en español se muestra traducido (`slotKey` en `src/lib/cms/map.ts`); otro texto sale tal cual. Solo los eventos con descripción, dirección o inscripción enlazan a `/eventos/<slug>`.
- Vídeo, cartel, logos y carteles de evento: solo si están en el mismo dominio que `WP_API_URL`; lo demás se descarta.
- Caché de 5 minutos con la etiqueta `wp`. Al guardar o enviar a la papelera, el plugin llama a `POST /api/revalidate` con `x-revalidate-secret` (`REVALIDATE_SECRET`), que expira la etiqueta al momento.
- Instalación, importación de noviembre y uso mensual: `woo-local/deploy/README.md`.

## Tienda con WooCommerce (headless)

**Decisión:** WooCommerce para la tienda; el resto de la web sigue en Next.js. La web (Vercel) lleva el catálogo y el carrito. **El pago, la dirección, el email, el IVA, los gastos de envío y el pedido son del checkout normal de WooCommerce.**

```
Web (Vercel): catálogo y carrito ── /checkout-link/?products=ID:cant,...&sw_lang=es ──► WooCommerce: dirección, email, envío, IVA, pago, pedido
          /tienda/gracias?wc_order=&wc_key=  ◄── plugin SphereWars Tienda ─────────────┘
          (la web lee el pedido con clave de solo lectura; la URL no prueba nada)
```

### Qué se ha comprobado y dónde
**En un WooCommerce real** (11.2.1, WordPress 7.1.1 y 7.1.4, PHP 8.5.9, SQLite, HTTPS local, solo en este equipo; invitado, escritorio y tamaño iPhone 13 en Chromium; contra reembolso y transferencia como pasarelas de prueba). La segunda instalación se montó solo con el paquete, desde wp-admin::
- Catálogo: se leen los 36 productos del CSV, Starter Packs incluidos, y se venden.
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
- Funciona para invitados, y el mismo checkout decide envío e IVA con la dirección real. Por eso las zonas por provincia o país se resuelven en WooCommerce y la web ya no cierra países.
- Sobran la escritura de pedidos, la idempotencia, los límites por pedidos, la cookie `sw_checkout` y la fuente de IP: **ya no hace falta `WC_CLIENT_IP_HEADER` ni `WC_TRUSTED_PROXY_HOPS`**.
- Un formulario propio habría duplicado validación, consentimiento, provincias e impuestos. `order-pay` también exige verificar el email a los invitados pasados 10 minutos.
- El enlace vacía el carrito de WooCommerce de ese navegador antes de llenarlo, así que un carrito anterior no se mezcla.

**Inconvenientes:**
- El pago tiene el aspecto de WordPress. El plugin pone los colores de la marca, pero la cabecera, el tipo de letra y la maquetación son del tema activo. No coincide del todo con la web.
- El carrito de la web informa de las tarifas, pero el importe exacto se ve en el paso siguiente, antes de confirmar.
- El checkout sale en el idioma de WordPress (español) aunque el comprador venga de `/en` o `/ca`. La vuelta sí respeta su idioma.

### Envío e IVA (decidido por Jordi; comprobado en un WooCommerce real)
**Envío:** España 5 €, gratis desde 50 €. Resto del mundo 15 €, gratis desde 100 €. Se vende a todos los países. La web lo enseña desde `src/lib/shop/shipping-info.ts`; lo que se cobra lo decide WooCommerce. Si cambia, cámbialo en los dos sitios.
- El plugin crea tres zonas: España, Unión Europea y Resto del mundo (zona 0). La UE va aparte porque **WooCommerce guarda la tarifa plana SIN IVA y suma el impuesto**: 4,1322 → 5 €; 12,3967 → 15 € en la UE; 15 sin impuesto fuera de ella. Con una sola zona «extranjero», un país pagaría 15 € y el otro 12,40 € o 18,15 €.
- Con envío gratis disponible, la tarifa plana no se ofrece.
- El umbral compara el subtotal que ve el cliente: 49 € y 49,99 € pagan envío, 50 € no.

**IVA:** 21 % para España y los 26 países de la UE, también sobre el envío. Sin tasa para un país, WooCommerce quita el IVA del precio. Lo que paga cada comprador por un Starter Pack de 39 €:

| Destino | Productos | Envío | Total | IVA en el pedido |
|---|---|---|---|---|
| España peninsular | 39,00 | 5,00 | 44,00 | 7,64 |
| Francia (UE) | 39,00 | 15,00 | 54,00 | 9,37 |
| Reino Unido / EE. UU. | 32,23 | 15,00 | 47,23 | 0 |
| Canarias, Ceuta, Melilla | 39,00 | 5,00 | 44,00 | 7,64 |

**A decidir con el asesor (no se ha concluido nada legal):**
1. **Canarias, Ceuta y Melilla** pagan hoy IVA ordinario, y es probable que no deba ser así. Para cambiarlo: WooCommerce > Ajustes > Impuestos > Tarifa estándar, una fila por provincia con país `ES`, estado `TF`, `GC`, `CE` o `ML` y tasa `0`. Probado con `TF`: 32,23 € + 4,13 € = 36,36 €, y el resto de España no cambia. Ojo: el envío baja a 4,13 €, y no resuelve aduanas ni IGIC.
2. **UE:** se aplica 21 % a todos, lo que solo vale bajo el umbral de ventas a distancia (OSS).
3. **Fuera de la UE:** paga el precio sin IVA, sin gestión de aranceles. La web sigue diciendo «IVA incluido» y muestra 39 € hasta llegar al checkout.
4. **Umbral fuera de la UE:** el subtotal ya no lleva IVA, así que «gratis desde 100 €» exige unos 121 € de catálogo (101 € de catálogo pagan envío; 135 € no).

Si en la tienda ya existe una zona o una tasa con otro valor, «Aplicar ajustes» no la cambia: la muestra como «Pendiente».

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
3. Herramientas > SphereWars tienda: dirección de la web > Aplicar ajustes (IVA, zonas y tarifas) > Crear productos > Copiar fotos. En una tienda que ya tiene productos con precios antiguos: revisa la lista en «Estado» y pulsa **Actualizar precios**, que solo cambia el precio normal. No toca páginas ni el resto de los productos.
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

**Productos:** `wordpress/productos-woocommerce.csv` (36 productos con el precio de la Guía Rápida 2026, sin céntimos según confirmó Jordi; SKU de las descripciones, categoría = facción y `sw_wiki_slug`; 4 son Starter Packs). También se puede importar en Productos > Importar: la asignación de columnas sale sola. Sin datos de stock: no existen todavía. **Regoretes** sale con el nombre de la wiki, sin descripción ni SKU, porque no tiene documento de producto. El reglamento (39,90), dados (9), tarjetas (9) y marcadores (6-9) están en la guía pero no tienen documento ni fotos: no se han creado.

### Vendedor
El vendedor es Estudi Llefià SL (CIF que figura en el panel del hosting: B62184890; confírmalo). Figura en los textos legales de la web, en borrador pendiente de revisión jurídica (ver `LEGAL.md`), y en WooCommerce: dirección de la tienda (Ajustes > General), remitente y pie de los correos (Ajustes > Correos electrónicos) y facturas.
