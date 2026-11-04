# SphereWars en WordPress (tema «spherewars»)

La web entera, **igual que la actual** (mismo diseño, textos, fotos, 3 idiomas), servida por WordPress. No se ha rediseñado nada: cada página del tema es el HTML de la web original, con su CSS, tipografías e imágenes, y el comportamiento (menú, carruseles, galería, carrito, contacto, visor de fotos) reescrito en JavaScript normal.

## Qué contiene la carpeta del escritorio
- `spherewars-wordpress.zip` (78 MB): el tema completo en un solo archivo.
- `Por partes` (si la subida de 78 MB falla o se corta): `1-tema` (5 MB, el código) y tres de imágenes (`2`, `3`, `4`, de 22 a 26 MB). Se suben igual, **cada uno extraído dentro de `wp-content/themes/`**; las imágenes se unen solas a la carpeta `spherewars`.
- `spherewars-descargas.zip` (64 MB): guías PDF, carteles y mapas en calidad de impresión. Se extrae en la **raíz** de la web (`public_html/`) y crea la carpeta `descargas`. Sin esto, los botones de «Descargas» no encuentran los archivos.
- `productos-woocommerce.csv`: 34 productos (30 miniaturas y 4 Starter Packs) para importar en WooCommerce.

## Instalación
1. WordPress 6.4 o superior con PHP 8.0 o superior (en Hostinger: hPanel > WordPress). Dominio en la raíz (`https://tu-dominio.com`, no en una subcarpeta).
2. **Ajustes > Enlaces permanentes:** elige «Nombre de la entrada» y guarda.
3. **Apariencia > Temas > Añadir nuevo > Subir tema:** sube `spherewars-wordpress.zip` y pulsa **Activar**. (Si tu hosting limita el tamaño de subida, descomprime el zip y sube la carpeta `spherewars` por el Administrador de archivos a `wp-content/themes/`.)
4. Abre `https://tu-dominio.com`: te lleva a `/es` (o a tu idioma). Listo.
5. **Ajustes > SphereWars:** el correo que recibe el formulario de contacto (si lo dejas vacío usa el del administrador).

El panel de WordPress (`/wp-admin`) sigue funcionando como siempre.

## Material de tu carpeta SphereWars USB ya integrado
- **Fotos oficiales de 34 miniaturas y 4 Starter Packs:** en el catálogo sale la foto con el fondo de su facción; en la ficha, la galería en este orden: foto con fondo, foto limpia, foto con su tamaño y tarjeta SphereWars.
- **Descripciones oficiales** (los Word de «Descripciones Artículos»): texto de presentación, características (referencia, puntos de banda, peana, altura, material), contenido de los packs e historia desplegable.
- **Precios:** la columna «Propuesta» del Excel, unida a cada producto por su código (SW-XX-nn del Excel = SWOM-XXnn de las descripciones). Los 4 Starter Packs a 39,99 €. Sin precio: Oteadora, Nirlem y el resto de miniaturas sin «Propuesta».
- **Tipografías:** «SphereWars» en Abaddon (cabecera y pie) y el resto de títulos en Federo, como indica tu documento de fuentes.
- **Logos de facción** en cada página de facción, y el logo de las Mercenarias de Isha en su subfacción.
- **Descargas oficiales:** las 2 guías rápidas (A4 y A5), 7 carteles y flyers y 15 mapas de Saphir (con vista previa).
- **«El juego»:** tus dos imágenes resumen (características y progresión de puntos de banda), ampliables.
- No he usado el vídeo `SphereWars USB.mp4` (1,4 GB), porque pediste quitar los vídeos de la web.

## Qué hace el tema
- URLs idénticas a la web actual: `/es`, `/en/juego`, `/ca/wikisphere/...`, `/es/tienda/<facción>/<miniatura>`, etc. (834 páginas), con `robots.txt`, `sitemap.xml`, `manifest` y favicon.
- Redirección de `/` al idioma guardado o al del navegador (temporal, como la web actual).
- Buscador de la wiki y buscador global en el servidor (mismos resultados que la web original: comparado en 10 búsquedas).
- Formulario de contacto: antispam (campo trampa, tiempo mínimo), validación, máximo 3 mensajes por persona y hora, envío con `wp_mail`.
- Tienda: catálogo con foto y nombre, ficha con galería y zoom, cantidad, «Añadir al carrito» y «Comprar ahora», carrito. Precios de tu columna «Propuesta» (`prices.json`). **El pago sigue cerrado**, igual que en la web actual, hasta conectar una pasarela (siguiente fase).

## Lo que está probado y lo que no (versión con WooCommerce)
**Probado en un WordPress 7.1.3 real** (instalación local con SQLite, PHP 8.4, enlaces permanentes «Nombre de la entrada»): activación del tema, las 831 páginas (todas 200, ninguna con avisos de PHP), 1.214 enlaces e imágenes sin ninguno roto, redirección de `/`, `robots.txt`/`sitemap.xml`, buscadores (mismos resultados que la web original), formulario de contacto (válido, errores, antispam, límite de 3 por hora, destinatario del ajuste), página Ajustes > SphereWars (guarda el correo), y en el navegador menú, carruseles, galería con zoom, carrito y «Comprar ahora».

**Probado también con WooCommerce 11.2.1 real (local):** importación del CSV con el importador de WooCommerce (24 productos), ficha con precio/stock/fotos de WooCommerce, producto agotado, borrador y sin precio, carrito con las zonas de envío de WooCommerce, pedido creado con sus líneas, envío y totales (17,99 € = 12,99 + 5,00), página de pago de WooCommerce con el diseño de SphereWars, pago por transferencia hasta «Pedido recibido» (el carrito se vacía y el stock baja), rechazo de stock excedido, producto inexistente o en borrador, país sin zona, JSON roto y cantidades negativas; noticias y eventos (idioma, borrador oculto, vista previa de editor, filtros, sitemap).

**No probado:** el envío real de correo (en la prueba se capturó la llamada a `wp_mail`; la entrega depende del hosting: conviene un plugin SMTP), pasarelas reales (Stripe/PayPal/Redsys: solo se probó la transferencia bancaria), impuestos/IVA por país, varias zonas de envío, MySQL (la prueba usó SQLite; el tema no usa base de datos propia), plugins de caché/SEO y el hosting final. Pruébalo primero en un WordPress de pruebas, no directamente en producción.

## Editar contenido desde WordPress (noticias, eventos y tienda)

### Noticias y eventos
En el panel aparecen **Noticias SphereWars** y **Eventos SphereWars**. Cada uno tiene su editor normal de WordPress (título, texto, imagen destacada), más una caja con sus datos:
- **Noticia:** idioma (todos / es / en / ca), categoría, SEO.
- **Evento:** tipo, idioma, fecha de inicio (obligatoria) y fin, organiza, ciudad, dirección, formato, requisitos, premios, precio, plazas, enlace de inscripción (https), SEO.
- Flujo: **Borrador → Pendiente → Publicado** (o **Programado** para una fecha futura). Solo lo publicado sale en la web. El botón **Vista previa** muestra el borrador solo a quien ha iniciado sesión como editor.
- Aparecen solos en la portada, en `/novedades`, `/eventos` (con filtros de ciudad y tipo, próximos/pasados) y en el `sitemap.xml`.

### Tienda con WooCommerce
1. Instala y activa **WooCommerce**. En **WooCommerce > Ajustes > Visibilidad del sitio** elige **Activo** (con «Próximamente» la tienda no se ve).
2. Configura moneda (EUR), los **envíos** (zona con tarifa plana y/o envío gratis desde X; las tarifas con fórmula o clases no se admiten y no se muestran) y una **pasarela de pago** real (Stripe, PayPal, Redsys…).
3. **Productos > Importar** y elige `productos-woocommerce.csv` (24 miniaturas con tu precio «Propuesta», SKU y facción). Después añade las fotos en cada producto (imagen + galería) y el stock.
4. En cada producto, campo **Miniatura de la wiki** (pestaña General): a qué ficha de la web corresponde. Si lo dejas vacío se enlaza por el nombre (el final de la dirección de la ficha).
5. Listo: la ficha de la miniatura muestra el precio, el stock y las fotos de WooCommerce (primero) y las oficiales; «Añadir al carrito» y «Comprar ahora» funcionan; al «Finalizar compra» se crea el pedido en WooCommerce con los precios y el envío que tú configuraste y el cliente paga en la página de pago de WooCommerce. Pedidos, clientes, reembolsos y facturas se gestionan en WooCommerce. Un producto sin precio, en borrador o agotado aparece como «No disponible» / «Agotado» y no se puede comprar.

El navegador solo envía qué productos, cuántos y el país; precio, stock y envío se vuelven a leer de WooCommerce al crear el pedido.

## Regenerar el tema tras cambios en la web
```bash
npm run build && npx next start -p 3200      # con RESEND_API_KEY, CONTACT_TO_EMAIL y CONTACT_FROM_EMAIL de relleno para que salga el formulario
node scripts/export-wp-theme.mjs http://localhost:3200
```
El resultado queda en `wordpress/theme/spherewars` (código propio del tema en `wordpress/theme-src`).

