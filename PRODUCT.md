# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Dos públicos con el mismo peso:

- **Nuevos:** aficionados a los wargames y a pintar miniaturas que aún no conocen el juego. Llegan desde un flyer, un QR, una jornada o las redes y quieren entender rápido qué es y cómo empezar.
- **Jugadores actuales:** vuelven a por reglas, perfiles, wiki, eventos y miniaturas.

## Product Purpose

Web oficial de SphereWars: Otro Mundo, un juego de escaramuzas con miniaturas para 2 jugadores. Su objetivo principal es que la gente empiece a jugar: descubrir el juego, elegir facción, descargar las reglas gratis y comprar un starter. El éxito se mide por las personas que dan ese paso y por los jugadores que vuelven.

## Positioning

- **Rápido y pequeño:** partidas de 45–55 minutos, 5–12 miniaturas, mesa de 90×90 cm.
- **Entrada barata:** reglamento y tarjetas de facción gratis en PDF; con unos 50 € ya se puede jugar.
- **Universo propio:** el mundo de Saphir, sus dioses y la búsqueda de la Quinta Esencia, con wiki propia.
- **Local:** juego creado en España, en español, con comunidad y jornadas en tiendas.

## Operating Context

- Se juega con miniaturas de 28 mm de resina termoplástica (sin montar y sin pintar), dados de seis caras, cinta métrica en pulgadas, escenografía y contadores de Vida, Poder y Órdenes.
- Parte del tráfico llega desde material impreso con QR: flyer, pósters y guía rápida.
- Ruta de entrada: reglas gratis, starter pack y después un combatiente distintivo. La guía la organiza por misión introductoria, misiones principales y torneos, y misiones secundarias y torneos nacionales.

## Capabilities and Constraints

- Web en Next.js 16 con español, inglés y catalán. La wiki solo existe en español y las traducciones están pendientes de validar.
- Secciones existentes: juego, facciones, miniaturas, tienda con carrito, wikisphere, eventos, descargas, novedades, comunidad, búsqueda y panel `/admin`.
- Rigen los límites de `docs/`: CSS de Tailwind precompilado (`npm run css`) y compilación apta para Hostinger o Vercel.
- Terminología que no se traduce: Saphir, WikiSphere, SphereEvents y nombres de facciones, personajes y dioses.
- **Sin decidir:** pasarela de pago (Stripe o WooCommerce), alojamiento (Vercel o Hostinger), dominio principal (`spherewars.es` o `spherewarsgames.com`), precio del starter (39 € en el material impreso; 39,99 € según `docs/WORDPRESS-TEMA.md`) y licencia web de la fuente Abaddon.

## Brand Commitments

- El nombre SphereWars se compone siempre en **Abaddon**.
- Títulos y subtítulos en **Federo**.
- Facciones y su identidad de color: Adeptos de Malesur (verde), Vástagos de Kurgan (azul hielo), Manadas de Urueh (rojo fuego), La Alianza (gris).
- Dioses: Kurgan (hielo), Kazag (incineración, de quien nacen las Manadas), Malesur (viento, creador de la Alianza y los Adeptos), Mohed (arena y piedras), Salssa'el (vida).
- Lemas: «¡¡Alza tu voz, dados y pinceles!!» y «Escaramuzas frenéticas en Otro Mundo».

## Evidence on Hand

- Archivo de marca en `../material/`: fotos de miniaturas, ilustraciones, logos, pósters, guía rápida y descripciones de tienda.
- Ya integrado en el repositorio: wiki oficial (`src/content/wiki.json`), productos (`src/content/shop-products.json`), fotos y descargas.
- Canales: Instagram `@spherewarsgames`, YouTube `@spherewars` y Discord.
- **No hay:** testimonios, cifras de jugadores, premios ni prensa. Tampoco un calendario de eventos real ni una lista de tiendas. No deben inventarse.

## Product Principles

1. **Primero la mesa:** cada página debe acercar al visitante a su primera partida.
2. **Dos públicos, sin obstáculos:** el recién llegado entiende el juego rápido y el veterano llega a lo que busca sin pasar por el discurso de venta.
3. **Gratis se dice claro:** las reglas gratuitas y el coste real de empezar se muestran de forma visible y honesta.
4. **El universo es el gancho:** el trasfondo de Saphir acompaña al juego y da motivos para elegir bando.
5. **Solo contenido real:** lo que falte se marca como pendiente y nunca se simula.
