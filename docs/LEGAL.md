# Textos legales: BORRADOR pendiente de revisión jurídica

Estado: **borrador del 6-11-2026, no revisado por ningún asesor.** No es definitivo. Las páginas lo dicen arriba («Borrador pendiente de revisión jurídica») y siguen con `noindex`.

- Páginas: `/es|en|ca/legal/aviso-legal`, `privacidad`, `cookies`, `condiciones`, `devoluciones`.
- Textos: `src/lib/legal/es.ts` (principal), `en.ts` y `ca.ts` (traducciones marcadas como tales), datos del titular en `owner.ts`, fecha del borrador en `index.ts` (`LEGAL_DRAFT_DATE`).
- Un dato que falta se escribe `[[...]]` y se ve en la página como «Pendiente: …». Al tenerlo, cámbialo en los tres idiomas.
- Cuando el asesor lo apruebe: quitar el aviso de borrador y el `noindex` en `src/app/[locale]/legal/[doc]/page.tsx`, y actualizar la fecha.

## Datos que faltan (el titular)
1. Datos del Registro Mercantil de Barcelona (tomo, folio, hoja, inscripción).
2. Teléfono de contacto (o confirmar que no se publica: el asesor dirá si basta el correo).
3. Banco que da el TPV Redsys.
4. Transportista y plazos de preparación y entrega por destino.
5. Dirección de devoluciones, si no es la del domicilio.
6. Plazo de respuesta a reclamaciones y de conservación de los mensajes de contacto.
7. Si hay gestoría o asesoría fiscal que vea los pedidos o facturas.
8. Si la marca SphereWars está registrada (OEPM/EUIPO) y a nombre de quién.

## Decisiones abiertas
1. **Quién paga el envío de vuelta en un desistimiento** (habitual: el comprador, si se le informa antes).
2. **Botón o función de desistimiento** (Directiva (UE) 2023/2673, aplicable desde el 19-6-2026; España no la había transpuesto del todo según fuentes de junio de 2026). Hoy solo hay correo y formulario.
3. **IVA de Canarias, Ceuta y Melilla, ventas UE (OSS) y fuera de la UE** (ver `WORDPRESS.md`). El texto dice que fuera de la UE el precio va sin IVA y los aranceles los paga el comprador: confirmar.
4. **Venta a empresas y tiendas**: hoy las condiciones son solo para consumidores.
5. **Arbitraje de consumo**: adherirse o no. La plataforma ODR de la UE cerró el 20-7-2025 y ya no se enlaza.
6. **Correo del vendedor en Hotmail** (cuenta personal de Microsoft) para pedidos y datos de clientes: valorar un correo del dominio con contrato de encargado.
7. **IP y navegador en los pedidos** (WooCommerce los guarda por defecto): mantener con base en interés legítimo o desactivar.
8. **Advertencia de edad y seguridad** en las miniaturas (piezas pequeñas).
9. **Confirmación del pedido en soporte duradero**: el correo de WooCommerce no incluye las condiciones ni el formulario de desistimiento; el asesor dirá si hay que añadirlos (art. 98.7 LGDCU).

## Puntos para el asesor
- Aviso legal art. 10 LSSI-CE completo; datos registrales.
- Privacidad: bases legales, roles de Redsys y banco (responsables independientes o encargados), plazos de conservación, transferencias a EE. UU. (Vercel, Microsoft, y Resend, Supabase y Cloudflare solo si se activan): adhesión al Marco de Privacidad de Datos o cláusulas tipo.
- Cookies: todas declaradas como técnicas y exentas de consentimiento, sin banner. Revisar en la tienda real (tema, plugins, Google Fonts) antes de publicar: la tienda tenía contraseña al redactar y no se pudo inspeccionar.
- Condiciones: requisitos de la normativa catalana de consumo (Codi de consum, idioma, hojas de reclamación), plazo de entrega por defecto de 30 días, garantía de 3 años, ley y fuero.
- Desistimiento: coste de devolución, depreciación por manipular las piezas, excepciones del art. 103 (en principio ninguna aplica) y la función de desistimiento.

## Inventario de cookies (comprobado en el código, 6-11-2026)
Web: `sw_locale` (cookie, 1 año), `sw_cart_v1` y `sw_cleared_orders_v1` (localStorage), Supabase `sb-…-auth-token` y cookies de vista previa de Next solo en `/admin` y para editores. Sin analítica, sin Vercel Analytics, sin vídeos de terceros, fuentes propias. Turnstile de Cloudflare solo si se configura. La contraseña temporal de la web usa autenticación HTTP, sin cookie.
Tienda: cookies de WooCommerce (`wp_woocommerce_session_*`, `woocommerce_cart_hash`, `woocommerce_items_in_cart`), las de WordPress para el personal, `sw_gate` (30 días, solo mientras la tienda tenga contraseña; no se cita en la política porque desaparece al abrir) y `sbjs_*` desactivadas por el plugin.

## WooCommerce: qué poner en la tienda
El plugin solo redirige a la web el carrito, la tienda y las fichas de producto. **Las páginas normales de WordPress sí se ven**, así que recomendamos **enlazar a la web** en vez de copiar los textos: una sola versión que mantener.

1. Crea dos páginas en WordPress, «Condiciones de venta» y «Política de privacidad», con el texto de abajo.
2. WooCommerce > Ajustes > Avanzado > Configuración de páginas > Términos y condiciones: «Condiciones de venta».
3. Ajustes > Privacidad: «Política de privacidad». WooCommerce > Ajustes > Cuentas y privacidad > Política de privacidad de la página de pago: pega el texto del bloque C.
4. Ajustes > General y Correos electrónicos: Estudi Llefià SL, NIF y dirección en el pie.

**A. Página «Condiciones de venta»**
```
Borrador pendiente de revisión jurídica.

Vendedor: Estudi Llefià SL, NIF B62184890, Ronda Sant Antoni de Llefià 86-94, Local 1, 08913 Badalona (Barcelona). Correo: yordiket@hotmail.com.

Las condiciones de venta de esta tienda son las publicadas en la web de SphereWars:
- Condiciones de venta: https://spherewars.com/es/legal/condiciones
- Desistimiento y devoluciones (14 días y formulario): https://spherewars.com/es/legal/devoluciones

Resumen: precios en euros con IVA del 21 % incluido. Envío a España 5 € (gratis desde 50 €); Unión Europea y resto del mundo 15 € (gratis desde 100 €). Pago con tarjeta o Bizum mediante Redsys. Garantía legal de 3 años. Tienes 14 días naturales para desistir desde que recibes el pedido.
```

**B. Página «Política de privacidad»**
```
Borrador pendiente de revisión jurídica.

Responsable: Estudi Llefià SL, NIF B62184890, Ronda Sant Antoni de Llefià 86-94, Local 1, 08913 Badalona (Barcelona). Correo: yordiket@hotmail.com.

Esta tienda guarda los datos de tu pedido (nombre, correo, direcciones, teléfono opcional, productos e importes) para gestionar la compra, el envío, las facturas y la garantía. Base legal: el contrato y las obligaciones fiscales. Alojamiento: 10dencehispahard SL (cdmon), España. El pago lo tratan Redsys y nuestro banco; no vemos los datos de la tarjeta. Solo usamos cookies técnicas necesarias para el carrito y el pago.

Política completa, derechos y reclamación ante la AEPD: https://spherewars.com/es/legal/privacidad
Política de cookies: https://spherewars.com/es/legal/cookies
```

**C. Texto de privacidad en la página de pago**
```
Usaremos tus datos para gestionar tu pedido, según nuestra [privacy_policy]. Responsable: Estudi Llefià SL. Puedes ejercer tus derechos en yordiket@hotmail.com.
```
