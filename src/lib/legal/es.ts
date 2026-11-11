import { OWNER as O } from "./owner";

// BORRADOR pendiente de revisión jurídica. Texto principal: las versiones EN y CA son traducciones de este.

const avisoLegal = `## 1. Titular del sitio web

En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), se informa de los datos del titular de este sitio web:

- Titular: ${O.name}
- NIF: ${O.nif}
- Domicilio: ${O.address}, España
- Correo electrónico: ${O.email}
- Teléfono: 687 927 981
- Datos registrales: Registro Mercantil de Barcelona, tomo 32416, folio 76, hoja B-210485, inscripción 1.ª

Este aviso se aplica al sitio web ${O.web} y a la tienda online ${O.shop} (en adelante, «el sitio web»).

## 2. Objeto

El sitio web informa sobre SphereWars: Otro Mundo, un juego de miniaturas, su universo, sus reglas descargables, sus eventos y su comunidad, y permite comprar miniaturas y productos del juego.

## 3. Condiciones de uso

El acceso al sitio web es gratuito, salvo el coste de la conexión. Quien lo usa se compromete a hacerlo de forma lícita, sin dañar el sitio web ni a terceros, y sin intentar acceder a zonas restringidas, como el panel de administración.

Las compras se rigen por las [Condiciones de venta](/legal/condiciones) y por la información sobre [Desistimiento y devoluciones](/legal/devoluciones). El tratamiento de datos personales se explica en la [Política de privacidad](/legal/privacidad) y el uso de cookies en la [Política de cookies](/legal/cookies).

## 4. Propiedad intelectual e industrial

Los textos, reglas, ilustraciones, fotografías, vídeos, logotipos, nombres de facciones y personajes, y el diseño del sitio web pertenecen a ${O.name} o a sus autores y licenciantes, y están protegidos por la normativa de propiedad intelectual e industrial. SphereWars es una marca registrada en la Oficina Española de Patentes y Marcas (OEPM), cuyo titular es Jordi Cañellas Pérez [[confirmar con el asesor cómo consta la autorización de uso de la marca a la empresa]].

Se permite descargar e imprimir el reglamento y las tarjetas que el sitio web ofrece gratis para uso personal y para jugar. Cualquier otro uso, en particular la reproducción, distribución o transformación con fines comerciales, requiere autorización previa por escrito.

## 5. Enlaces

El sitio web enlaza con servicios de terceros, como Instagram, YouTube o Discord. Al seguir esos enlaces se sale del sitio web y se aplican las condiciones y políticas de privacidad de cada servicio. ${O.name} no controla su contenido ni responde de él.

## 6. Responsabilidad

${O.name} procura que la información del sitio web sea correcta y esté actualizada, pero puede contener errores, que se corregirán en cuanto se detecten. No se responde de interrupciones del servicio por causas técnicas ajenas o de fuerza mayor. Esta limitación no afecta a los derechos que la ley reconoce a los consumidores.

## 7. Legislación aplicable

Este aviso se rige por la legislación española. Si quien usa el sitio web es consumidor, son competentes los juzgados y tribunales que correspondan según la ley, incluidos los de su domicilio.
`;

const privacidad = `## 1. Responsable del tratamiento

- Responsable: ${O.name}
- NIF: ${O.nif}
- Domicilio: ${O.address}, España
- Correo electrónico para cuestiones de privacidad: ${O.email}
- Delegado de protección de datos: [[confirmar si se ha designado; previsiblemente no es obligatorio]]

Esta política explica cómo se tratan los datos personales en ${O.web} y en la tienda ${O.shop}, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 de protección de datos personales y garantía de los derechos digitales (LOPDGDD).

## 2. Qué datos tratamos, para qué y con qué base legal

### Compras en la tienda

- Datos: nombre y apellidos, correo electrónico, dirección de facturación y de envío, teléfono (opcional), productos comprados, importes, notas del pedido y, como hace WooCommerce por defecto, la dirección IP y el navegador desde los que se hizo el pedido. Los datos de la tarjeta o de Bizum no los recibimos: los trata la entidad de pago.
- Finalidad: gestionar el pedido, el cobro, el envío, las facturas, la atención al cliente, el desistimiento, las devoluciones y la garantía. Los avisos de cada pedido llegan al correo del vendedor.
- Base legal: la ejecución del contrato de compraventa (artículo 6.1.b RGPD) y el cumplimiento de obligaciones legales, como las fiscales y contables (artículo 6.1.c RGPD). La IP y el navegador del pedido se tratan por interés legítimo en prevenir el fraude (artículo 6.1.f RGPD) [[confirmar con el asesor o desactivar su registro]].
- Conservación: mientras dure la relación y, después, bloqueados durante los plazos legales: seis años para la documentación mercantil (artículo 30 del Código de Comercio), los plazos de prescripción tributaria y tres años de garantía desde la entrega [[confirmar plazos]].

### Formulario de contacto

Solo se aplica si el formulario de contacto está activo en el sitio web.

- Datos: nombre, correo electrónico, asunto, mensaje e idioma. De la dirección IP solo se guarda un código cifrado (hash), que sirve para limitar el envío masivo de mensajes.
- Finalidad: responder a la consulta.
- Base legal: el consentimiento que se da al marcar la casilla del formulario (artículo 6.1.a RGPD). Se puede retirar en cualquier momento, sin que afecte a lo tratado antes.
- Conservación: el tiempo necesario para responder y, como máximo, [[plazo de conservación de los mensajes, por ejemplo un año]].

### Mensajes por correo electrónico

Si nos escribes a ${O.email}, usamos tus datos para responderte, con base en tu solicitud y en nuestro interés legítimo en atenderla (artículo 6.1.f RGPD), y los conservamos mientras sea necesario para atenderla.

### Navegación y seguridad

- Datos: dirección IP, navegador, páginas solicitadas, fecha y hora, en los registros técnicos de los servidores.
- Finalidad: servir el sitio web, mantener su seguridad y detectar abusos.
- Base legal: interés legítimo en el funcionamiento seguro del sitio web (artículo 6.1.f RGPD).
- Conservación: la que fije cada proveedor de alojamiento para sus registros [[confirmar plazos de Vercel y cdmon]].

No enviamos boletines ni comunicaciones comerciales, no usamos cookies de analítica ni de publicidad, no elaboramos perfiles y no tomamos decisiones automatizadas con efectos jurídicos.

## 3. Destinatarios y encargados del tratamiento

No vendemos ni cedemos datos personales. Solo los conocen los proveedores que necesitamos para prestar el servicio, como encargados del tratamiento o como responsables independientes en su ámbito, y las autoridades cuando lo exija la ley:

- Vercel Inc. (Estados Unidos): alojamiento del sitio web ${O.web}.
- 10dencehispahard SL (cdmon, España): alojamiento de la tienda ${O.shop}, que funciona con WordPress y WooCommerce, y donde se guardan los pedidos.
- Redsys Servicios de Procesamiento SL y CaixaBank SA: cobro con tarjeta y Bizum. Actúan como responsables independientes del tratamiento de los datos de pago [[confirmar rol]].
- SEUR, principalmente: entrega de los pedidos (nombre, dirección y teléfono de envío).
- Microsoft (servicio de correo Outlook/Hotmail): correo electrónico del vendedor, al que llegan los pedidos y los mensajes [[confirmar proveedor y condiciones]].
- Solo si el formulario de contacto está activo: Resend Inc. (Estados Unidos), envío de los mensajes por correo; Supabase Inc., base de datos donde se guardan los mensajes [[región de los servidores]]; y Cloudflare Inc. (Estados Unidos), si está activa la verificación antispam Turnstile.
- [[Asesoría fiscal o contable, si la hay]].
- Administración tributaria, juzgados y fuerzas de seguridad, cuando la ley lo exija.

## 4. Transferencias internacionales

Algunos proveedores (Vercel, Microsoft y, si se usan, Resend, Supabase y Cloudflare) son empresas de Estados Unidos o pueden tratar datos allí. Esas transferencias se amparan en la decisión de adecuación del Marco de Privacidad de Datos UE-EE. UU. para las empresas adheridas o, en su defecto, en las cláusulas contractuales tipo de la Comisión Europea [[verificar la adhesión y la garantía de cada proveedor]].

## 5. Tus derechos

Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, y retirar tu consentimiento en cualquier momento, escribiendo a ${O.email} o por correo postal a ${O.address}. Indica qué derecho ejerces. Si tenemos dudas razonables sobre tu identidad, podremos pedirte información adicional para confirmarla. Responderemos en el plazo de un mes, ampliable en los casos previstos en el RGPD.

Si consideras que no hemos atendido bien tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (AEPD), C/ Jorge Juan 6, 28001 Madrid, https://www.aepd.es

## 6. Menores

La tienda está dirigida a mayores de edad. Los menores de 14 años no pueden facilitar sus datos sin el consentimiento de sus padres o tutores (artículo 7 LOPDGDD).

## 7. Seguridad

Aplicamos medidas técnicas y organizativas adecuadas al riesgo: conexión cifrada (https), acceso restringido a los paneles de gestión y proveedores que ofrecen garantías de seguridad.

## 8. Cambios

Si cambia esta política, publicaremos la nueva versión en esta página con su fecha.
`;

const cookies = `## 1. Qué son

Las cookies son pequeños archivos que un sitio web guarda en tu navegador. El almacenamiento local (localStorage) es un mecanismo parecido. Esta política explica cuáles usan ${O.web} y ${O.shop}, conforme al artículo 22.2 de la LSSI-CE.

## 2. Resumen

Solo usamos cookies y almacenamiento técnicos, estrictamente necesarios para el servicio que pides: recordar el idioma, el carrito y el pedido, y el acceso de las personas que gestionan el sitio. No usamos cookies de analítica, publicidad ni redes sociales. Por eso no te pedimos consentimiento, pero te informamos de ellas [[confirmar con el asesor que todas están exentas]].

Las fuentes tipográficas y los vídeos se sirven desde nuestro propio dominio y no hay vídeos ni contenidos de terceros insertados. Los enlaces a Instagram, YouTube y Discord son enlaces normales: esos servicios solo instalan sus cookies si los visitas.

## 3. Sitio web (${O.web})

| Nombre | Tipo | Finalidad | Duración | Necesaria |
| sw_locale | Cookie propia | Recordar el idioma de la web (es, en o ca) | 1 año | Sí |
| sw_cart_v1 | Almacenamiento local | Guardar los productos del carrito y sus cantidades, sin datos personales | Hasta que vacíes el carrito o borres los datos del navegador | Sí |
| sw_cleared_orders_v1 | Almacenamiento local | Recordar los últimos pedidos terminados para no vaciar el carrito dos veces | Hasta que borres los datos del navegador | Sí |
| sb-…-auth-token | Cookie propia | Mantener la sesión en el panel de administración. Solo para el personal autorizado | Sesión del panel | Sí |
| __prerender_bypass, __next_preview_data | Cookies propias | Vista previa de borradores. Solo para el personal autorizado | Sesión | Sí |

Si el formulario de contacto usa la verificación antispam Cloudflare Turnstile, al abrir la página de contacto se carga un servicio de Cloudflare Inc. que protege el formulario frente a envíos automáticos [[verificar qué almacena Turnstile en el navegador]].

## 4. Tienda (${O.shop})

La tienda funciona con WordPress y WooCommerce. El pago se hace en ella.

| Nombre | Tipo | Finalidad | Duración | Necesaria |
| wp_woocommerce_session_… | Cookie propia | Identificar tu carrito y tu sesión de compra | 2 días | Sí |
| woocommerce_cart_hash | Cookie propia | Detectar cambios en el carrito | Sesión | Sí |
| woocommerce_items_in_cart | Cookie propia | Saber si el carrito tiene productos | Sesión | Sí |
| wordpress_*, wordpress_logged_in_*, wp-settings-* | Cookies propias | Sesión del personal que gestiona la tienda | Sesión o hasta 1 año | Sí |

Las cookies de atribución de pedidos de WooCommerce (sbjs_*) están desactivadas. [[Revisar en la tienda real si el tema o algún plugin añade otras cookies, almacenamiento local o recursos de terceros, como Google Fonts, y completar esta tabla]].

Al pagar, la pasarela de Redsys se abre en su propio dominio y aplica sus propias cookies técnicas, bajo su responsabilidad.

## 5. Cómo gestionarlas

Puedes ver y borrar las cookies y el almacenamiento local desde la configuración de tu navegador. Si los bloqueas, la web no recordará tu idioma ni tu carrito, y no podrás completar una compra.

## 6. Cambios

Si en el futuro añadimos cookies que no sean necesarias, como las de analítica, te pediremos antes tu consentimiento y actualizaremos esta política.
`;

const condiciones = `## 1. Vendedor y ámbito

Estas condiciones regulan las compras en la tienda online de SphereWars. El vendedor es ${O.name}, NIF ${O.nif}, con domicilio en ${O.address}, España, y correo electrónico ${O.email}. Teléfono: 687 927 981.

Se aplican a las compras de personas consumidoras, según el Real Decreto Legislativo 1/2007, texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios (LGDCU). También vendemos a tiendas y empresas; a esas compras no se aplican los derechos propios de las personas consumidoras, como el desistimiento [[confirmar con el asesor las condiciones para empresas]].

La versión vigente es la publicada en la web en el momento del pedido. Antes de pagar debes aceptarlas.

## 2. Productos

Vendemos miniaturas de resina de 28 mm para el juego SphereWars, que se entregan sin montar y sin pintar, y otros productos del juego. Las fotografías pueden mostrar miniaturas montadas y pintadas solo como ejemplo. Montarlas puede requerir herramientas y pegamento, que no se incluyen [[confirmar]].

Edad recomendada: a partir de 12 años. [[Confirmar con el asesor la advertencia de seguridad, por ejemplo por piezas pequeñas]].

## 3. Precios e impuestos

Los precios están en euros e incluyen el IVA del 21 %. Los gastos de envío se indican aparte y se suman antes de confirmar el pedido.

Para los envíos fuera de la Unión Europea, la tienda muestra en el pago el precio sin IVA español. Los aranceles, impuestos de importación y gestiones aduaneras del país de destino corren a cargo del comprador [[confirmar]]. [[Tratamiento fiscal de los envíos a Canarias, Ceuta y Melilla: pendiente de decidir con el asesor]].

El importe total, con impuestos y envío, se muestra siempre antes de pagar.

## 4. Gastos de envío

| Destino | Gastos de envío | Envío gratis |
| España | 5 € | Pedidos desde 50 € |
| Unión Europea y resto del mundo | 15 € | Pedidos desde 100 € |

Los gastos llevan el IVA incluido cuando corresponde. Se vende a todos los países.

## 5. Cómo se hace el pedido

- Eliges los productos y los añades al carrito en ${O.web}.
- Pulsas pagar y pasas al proceso de pago de la tienda ${O.shop}, donde indicas tu nombre, correo electrónico y direcciones. El teléfono es opcional.
- Antes de pagar ves el resumen con productos, impuestos, envío y total, y puedes volver atrás para corregir cualquier dato.
- Aceptas estas condiciones y pagas. El pedido supone una obligación de pago.
- Recibes por correo electrónico la confirmación del pedido.

El contrato se celebra en castellano. El pedido queda archivado en la tienda y puedes pedirnos una copia en cualquier momento.

## 6. Pago

Se puede pagar con tarjeta o con Bizum mediante la pasarela segura Redsys de nuestra entidad bancaria. El cargo se hace al confirmar el pedido. No vemos ni guardamos los datos de tu tarjeta.

## 7. Entrega

- Transportista: principalmente SEUR.
- Plazo de preparación y de entrega: en España, 72 horas desde la confirmación del pago. Para envíos fuera de España el plazo depende del destino [[confirmar plazo orientativo para el extranjero]]. Si no se indica otro plazo, entregaremos el pedido en un máximo de 30 días naturales desde la compra (artículo 66 bis LGDCU).
- Si un producto no está disponible después de pagar, te avisaremos y te devolveremos lo pagado por él sin demora indebida.
- El riesgo de pérdida o daño pasa a ti cuando recibes el pedido.

Si el paquete llega dañado, consulta el procedimiento en [Desistimiento y devoluciones](/legal/devoluciones).

## 8. Derecho de desistimiento

Tienes 14 días naturales para desistir de la compra sin dar explicaciones. Las condiciones, el procedimiento y el formulario están en [Desistimiento y devoluciones](/legal/devoluciones).

## 9. Garantía

Respondemos de cualquier falta de conformidad de los productos que exista en el momento de la entrega y se manifieste en un plazo de tres años desde ella (artículos 114 y siguientes LGDCU). Puedes elegir entre la reparación o la sustitución, salvo que sea imposible o desproporcionado y, en su caso, pedir una rebaja del precio o la resolución del contrato. Estas soluciones son gratuitas para ti, incluidos los envíos.

No son faltas de conformidad los daños producidos al montar, cortar, lijar, pegar o pintar las piezas, ni los causados por un uso indebido.

## 10. Atención al cliente y reclamaciones

Puedes escribirnos a ${O.email} para cualquier consulta, incidencia o reclamación. Te responderemos lo antes posible [[plazo de respuesta]]. [[Hojas oficiales de reclamación y requisitos de la normativa catalana de consumo: confirmar con el asesor]].

## 11. Resolución de conflictos

Si no llegamos a un acuerdo, puedes acudir a los servicios públicos de consumo, como la Agència Catalana del Consum o la oficina municipal de información al consumidor de tu localidad, y a las juntas arbitrales de consumo. [[Indicar si ${O.name} está adherida al Sistema Arbitral de Consumo o a otra entidad de resolución alternativa de litigios]].

La plataforma europea de resolución de litigios en línea (ODR) dejó de funcionar el 20 de julio de 2025, por lo que no se enlaza.

## 12. Ley aplicable

Estas condiciones se rigen por la legislación española, sin perjuicio de los derechos que te reconozca la ley de tu país de residencia si eres consumidor en otro Estado. Para cualquier litigio son competentes los juzgados y tribunales que correspondan según la ley, incluidos los de tu domicilio.
`;

const devoluciones = `## 1. Derecho de desistimiento

Puedes desistir de tu compra en un plazo de 14 días naturales sin indicar el motivo (artículos 102 y siguientes LGDCU). El plazo empieza el día en que tú, o la persona que indiques que no sea el transportista, recibe los productos. Si un pedido llega en varias entregas, cuenta desde la última.

## 2. Cómo ejercerlo

Antes de que termine el plazo, comunícanos tu decisión de forma clara:

- por correo electrónico a ${O.email}, o
- por correo postal a ${O.name}, ${O.address}.

Puedes usar el [formulario de desistimiento](#formulario-de-desistimiento) de esta página, aunque no es obligatorio. Te confirmaremos la recepción por correo electrónico. [[Función de desistimiento en la web exigida por la Directiva (UE) 2023/2673: confirmar con el asesor su transposición en España y cómo implantarla]].

## 3. Devolución de los productos

Envía los productos a ${O.name}, ${O.address}, España, sin demora indebida y, como máximo, en 14 días naturales desde que nos comuniques el desistimiento.

Coste del envío de vuelta: si devuelves el pedido por decisión propia, lo pagas tú. Si el producto llega defectuoso, dañado o no es el que pediste, lo pagamos nosotros.

Puedes comprobar el estado de los productos como lo harías en una tienda. Si los manipulas más allá de eso, por ejemplo al separar las piezas de sus coladas, cortarlas, lijarlas, pegarlas o pintarlas, responderás de la disminución de su valor (artículo 108 LGDCU).

## 4. Reembolso

Te devolveremos todo lo pagado, incluidos los gastos de envío iniciales (salvo el sobrecoste si elegiste un envío distinto del más barato que ofrecemos), sin demora indebida y como máximo en 14 días naturales desde que nos comuniques el desistimiento. Podemos esperar a recibir los productos, o a que nos demuestres que los has enviado, antes de reembolsar.

Usaremos el mismo medio de pago que usaste, salvo que acordemos otro. No tendrás que pagar ninguna comisión por el reembolso.

## 5. Productos dañados, erróneos o incompletos

- Si el paquete llega visiblemente dañado, indícalo al transportista al recibirlo si es posible.
- Escríbenos a ${O.email} lo antes posible, con el número de pedido y fotografías del paquete y de los productos.
- Te diremos cómo devolverlos, si hace falta, y te enviaremos un producto sustituto o te devolveremos el dinero, a tu elección, según la garantía legal.
- En estos casos, los envíos corren de nuestra cuenta.

Avisarnos pronto nos ayuda a reclamar al transportista, pero no reduce tus derechos: la garantía legal de conformidad es de tres años desde la entrega. Consulta las [Condiciones de venta](/legal/condiciones).

## Formulario de desistimiento {#formulario-de-desistimiento}

Modelo de formulario (anexo B de la LGDCU). Rellénalo y envíalo solo si quieres desistir del contrato.

- A la atención de: ${O.name}, ${O.address}, ${O.email}
- Por la presente le comunico que desisto de mi contrato de venta del siguiente bien: [indica los productos]
- Pedido el: [fecha] / recibido el: [fecha]
- Número de pedido: [número]
- Nombre del consumidor: [nombre]
- Dirección del consumidor: [dirección]
- Firma del consumidor (solo si el formulario se presenta en papel)
- Fecha: [fecha]
`;

export const es = { "aviso-legal": avisoLegal, privacidad, cookies, condiciones, devoluciones };
