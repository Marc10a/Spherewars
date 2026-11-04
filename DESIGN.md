---
name: SphereWars
description: Fantasía oscura clásica de wargame, con el arte oficial y las miniaturas reales como protagonistas.
colors:
  abyss: "#0b0b0d"
  coal: "#17161a"
  gold: "#d8a84e"
  ivory: "#f2e7cf"
  stone: "#b8b0a0"
  ember: "#c8481f"
  ice: "#8fbbe0"
  faction-malesur: "#8fd0a0"
  faction-alianza: "#cfc8ba"
  faction-urueh: "#f07a55"
  faction-kurgan: "#8fbbe0"
typography:
  wordmark:
    fontFamily: "Abaddon, Federo, serif"
    letterSpacing: "0.04em"
  display:
    fontFamily: "Federo, Trebuchet MS, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 400
    lineHeight: 1.1
  heading:
    fontFamily: "Federo, Trebuchet MS, sans-serif"
    fontSize: "3rem"
    fontWeight: 400
    letterSpacing: "0.01em"
  label:
    fontFamily: "Federo, Trebuchet MS, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
rounded:
  none: "0"
spacing:
  gutter: "16px"
  section: "96px"
  section-compact: "56px"
components:
  button-solid:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.abyss}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 24px"
    height: "48px"
  button-solid-hover:
    backgroundColor: "{colors.ivory}"
  button-ghost:
    textColor: "{colors.ivory}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 24px"
    height: "48px"
  chip-active:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.abyss}"
    typography: "{typography.label}"
    height: "44px"
---

# SphereWars

## Overview

La web parece una portada de wargame: negro profundo, oro y arte oficial a gran tamaño. El contenido se apoya en imágenes reales del juego, y cada facción aporta su color de acento.

## Colors

- **Negro (`abyss`) y carbón (`coal`):** fondo de la página y superficies.
- **Oro (`gold`):** acción principal, títulos secundarios y acentos. Es el único color de acción.
- **Marfil (`ivory`) y piedra (`stone`):** texto principal y secundario.
- **Facciones:** `data-faction` redefine `--accent`. Solo identifica la facción; no se usa como color de acción general.

## Typography

- **Abaddon:** solo para el nombre SphereWars. En títulos y entradillas se aplica con `BrandText`. No sirve para otros textos, porque no tiene letras acentuadas.
- **Federo:** títulos, subtítulos, botones y etiquetas. Solo tiene un grosor: la jerarquía se marca con el tamaño y el color, nunca con negrita falsa.
- **Inter:** texto de lectura e información de interfaz.

## Layout

El contenido se limita a `max-w-7xl` con un margen lateral de 16 px. Las páginas interiores abren con `PageHero`: ilustración oficial, un velo oscuro a la izquierda y el título. En móvil, los catálogos usan dos columnas.

## Elevation & Depth

La profundidad viene de la ilustración, los velos y el fondo `.spot` detrás de las miniaturas recortadas. Las tarjetas solo se elevan al pasar el cursor, en dispositivos que lo permiten.

## Shapes

Esquinas rectas y bordes finos en oro o en el acento de facción.

## Components

- **`Button`:** variantes `solid` y `ghost`. Al pulsar se reduce a `scale(.97)`.
- **`chipCls`:** filtros, con 44 px de alto como mínimo.
- **`ShopTile`:** foto de la miniatura, solo en la tienda.
- **`MiniCard`:** ilustración del personaje, nunca la foto de la miniatura.
- **`StarterBlock`:** bloque destacado del producto de entrada de cada facción.
- **`ElementCanvas`:** fuego, hielo, viento o chispas de forja según la facción, sobre sus cabeceras y al pasar por sus tarjetas.
- **`EssenceThreads`:** escena de las hebras de la Quinta Esencia, ligada al scroll, que cambia de color al elegir un dios.
- **`HeroVideo`:** vídeo de cabecera, en la portada solo en pantallas anchas, sin movimiento reducido ni ahorro de datos, con botón de pausa, y se detiene fuera de pantalla.
- **`EventsAgenda`:** cabecera con el vídeo del mes, calendario completo con los días de evento marcados (también filtran), Próximos/Pasados, desplegables de ciudad y tipo, y tarjetas por día con logo de la tienda y cartel. Cada campaña se edita en `src/content/events-campaign.json`.
- **`LoreOverview`:** entrada de WikiSphere con mapa, dioses, leyes, historias y leyendas.

## Do's and Don'ts

- Usa ilustraciones y fotos oficiales de `../material/`, nunca imágenes genéricas.
- Muestra el nombre SphereWars en Abaddon y los títulos en Federo.
- Escribe etiquetas en Federo a 14 px como mínimo, sin versales pequeñas con mucho espaciado.
- Las animaciones de interfaz (botones, menús, tarjetas) duran menos de 0,5 s. Las escenas ligadas al lore pueden durar más, nunca bloquean la lectura y todas respetan `prefers-reduced-motion`.
- La portada solo explica qué es SphereWars y su mundo. El resto vive en su sección: empezar a jugar en `/juego`, el mundo en WikiSphere, el contacto en Comunidad.
- No inventes datos: si falta información, oculta el bloque o indícalo con una nota breve.
- No añadas etiquetas pequeñas encima de los títulos.
