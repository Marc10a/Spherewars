# Tienda online (Stripe)

La tienda propia está en `/tienda`. El cliente elige miniaturas, las añade al carrito y paga con tarjeta, Apple Pay o Google Pay en una
página segura de **Stripe**. SphereWars nunca ve ni guarda los datos de la tarjeta.

**Nada se inventa:** no hay productos ni precios por defecto. Un producto solo se puede vender si tú le pones precio, lo marcas
«a la venta» y lo publicas. Los países y los gastos de envío también los defines tú en `/admin/tienda`. Mientras falte algo, la tienda
muestra el catálogo pero **no ofrece pagar**.

## Cómo está organizada la tienda
`/tienda` muestra las **4 facciones**. Dentro de cada una (`/tienda/manadas-de-urueh`…) salen **todas sus miniaturas** con foto y descripción oficial de la wiki (Alianza, además, dividida en Mercenarias de Isha y Legión de los Cien Corazones).

- Una miniatura muestra **precio y botón «Añadir al carrito»** solo si hay un producto **publicado, «a la venta» y con precio** asociado a ella. Si no, pone «Próximamente · Precio pendiente de confirmar». No se inventan precios.
- **Cómo asociar un producto a su miniatura:** en `/admin/productos`, campo «Miniatura de la wiki a la que corresponde» (empieza a escribir el nombre y elige de la lista). Si lo dejas vacío, el producto sale en «Packs, accesorios y otros».
- Atajo: si el *slug* del producto es igual que el final de la ficha de la wiki (por ejemplo `satanor`) y no has indicado la miniatura, se asocia solo.
- El filtro «Solo a la venta» de cada facción oculta las que aún no se pueden comprar.

## Cómo funciona un pedido
1. El cliente paga en Stripe → 2. Stripe avisa a `/api/stripe/webhook` (firmado) → 3. el pedido pasa a **Pagado** (una sola vez, aunque Stripe repita el aviso). El stock se reserva al iniciar el pago y se devuelve si el pago caduca o falla → 4. tú lo ves en `/admin/pedidos`, lo preparas y lo marcas **Enviado** con el número de seguimiento.

Seguridad: el navegador solo envía qué productos y cuántos. Precios, stock, disponibilidad y envío se leen de la base de datos en el servidor. Un pedido solo se da por pagado si llega un aviso con la firma correcta de Stripe.

## Puesta en marcha (en este orden)
1. **Base de datos** lista (ver `BASE-DE-DATOS.md`); `supabase/setup.sql` ya incluye las tablas de la tienda (migraciones 0004 a 0008).
   - Si ya habías ejecutado el SQL anterior, ejecuta en orden las migraciones que te falten de `supabase/migrations/`, **antes** de desplegar el código nuevo. Esa migración también **cierra permisos que faltaban** en 5 tablas; no te la saltes.
   - **Desactiva los registros públicos** en Supabase → Authentication → Sign In / Providers («Allow new users to sign up»). Un registro nuevo ya no recibe permisos, pero el panel no los necesita.
2. **Cuenta de Stripe** (stripe.com, gratis). Empieza en **modo de prueba** (interruptor «Test mode»).
3. **Claves.** Stripe → Developers → API keys → copia la *Secret key* (`sk_test_…`).
4. **Webhook.** Stripe → Developers → Webhooks → Add endpoint:
   - URL: `https://TU-DOMINIO/api/stripe/webhook`
   - Eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
   - Copia el *Signing secret* (`whsec_…`).
5. **Variables de entorno** en Vercel/Hostinger (ver `.env.example`) y **volver a desplegar**:
   `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (+ las de Supabase y `NEXT_PUBLIC_SITE_URL`).
   Las tres son **secretas**: nunca con prefijo `NEXT_PUBLIC_`, nunca en un chat ni en el código.
6. **Envíos.** `/admin/tienda`: crea al menos una zona (nombre, países con código de 2 letras, gastos de envío, «gratis desde» opcional) y marca **Tienda abierta**. La lista de comprobación de esa página te dice qué falta.
7. **Productos.** `/admin/productos`: precio (IVA incluido), casilla «A la venta», stock (vacío = sin límite), estado **Publicado**.
8. **Prueba completa en modo de prueba** con la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y CVC. Comprueba que el pedido aparece como *Pagado* y que baja el stock.
9. **Pasar a real:** activa tu cuenta de Stripe (datos de empresa/autónomo y banco), cambia a las claves `sk_live_…`, crea de nuevo el webhook en modo real con su propio `whsec_…`, actualiza las variables y vuelve a desplegar.

## Antes de vender de verdad (revisión de tu asesor)
- **Textos legales:** `/legal/condiciones` (condiciones de venta) y `/legal/devoluciones` (desistimiento de 14 días en venta a distancia en la UE) están **pendientes de redacción**. Además hacen falta aviso legal y política de privacidad con tus datos reales. El enlace a las condiciones aparece en el carrito y en la página de pago.
- **IVA:** los precios se muestran con IVA incluido. Si vendes a otros países de la UE, el IVA puede depender del destino: valora activar Stripe Tax (`STRIPE_AUTOMATIC_TAX=1`) con tu asesor.
- **Facturas:** Stripe envía recibo de pago; la factura fiscal la emites tú.
- **Reembolsos:** se hacen en el panel de Stripe. Un reembolso **total** marca el pedido como *Reembolsado*; los parciales no cambian el estado. El stock no se repone solo.

## Límites actuales
Solo euros. Sin códigos de descuento. Sin cuentas de cliente ni historial de pedidos para el cliente. Los correos propios (aviso de envío) no están: Stripe envía el recibo; el aviso de envío es manual por ahora. Otras pasarelas (Redsys, PayPal) no están integradas; el cobro está aislado en `src/app/[locale]/tienda/actions.ts` y `src/app/api/stripe/webhook/route.ts`.

## WooCommerce
Es la vía elegida. Con las variables `WC_*`, WooCommerce sustituye a este flujo: productos, stock, envíos, dirección, pedidos y pago, en su propio checkout. El carrito de la web muestra el subtotal con IVA y las tarifas (España 5 €, gratis desde 50 €; resto del mundo 15 €, gratis desde 100 €); el importe exacto se confirma en el paso siguiente. Esta guía de Stripe no aplica entonces. Pasos y resultados de la prueba real: `WORDPRESS.md`.

## Pruebas
`npm run test:shop` (precios, envío, stock, webhook y firma de Stripe; sin red ni base de datos).
`npm run test:woo` (capa de WooCommerce contra el simulador, que arranca solo). La compra completa se probó aparte en un WooCommerce real local: ver `WORDPRESS.md`.

## Precios actuales (sin base de datos ni WooCommerce)
Mientras no haya base de datos ni WooCommerce, los precios salen de `src/content/prices.json` (Guía Rápida 2026, IVA incluido, sin céntimos). Las miniaturas que no están en ese archivo no tienen precio y muestran «No disponible». Con WooCommerce o la base de datos conectados, sus productos sustituyen a esta lista. El pago real sigue cerrado hasta configurar la pasarela.
