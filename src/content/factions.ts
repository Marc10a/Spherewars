// Only facts supplied in the project brief. No stats, costs or lore invented.
import type { Locale } from "@/lib/i18n";

export type Faction = {
  slug: string;
  name: string;
  theme: "malesur" | "alianza" | "urueh" | "kurgan";
  palette: Record<Locale, string[]>;
  gradient: string;
  /** Official art from the wiki (public/wiki/images). */
  image: string;
  style: Record<Locale, string>;
  blurb: Record<Locale, string>;
  subfactions?: { name: string; note: Record<Locale, string> }[];
};

export const factions: Faction[] = [
  {
    slug: "adeptos-de-malesur", name: "Adeptos de Malesur", theme: "malesur", image: "/wiki/images/portada_adeptos_bona.webp",
    palette: { es: ["Blanco", "Verde natural"], en: ["White", "Natural green"], ca: ["Blanc", "Verd natural"] },
    gradient: "linear-gradient(160deg,#0f1f18 0%,#3f6b52 55%,#e8e0cf 140%)",
    style: { es: "Control, movilidad, curación y adaptación.", en: "Control, mobility, healing and adaptation.", ca: "Control, mobilitat, curació i adaptació." },
    blurb: { es: "Viento, bosques y energía espiritual.", en: "Wind, forests and spiritual energy.", ca: "Vent, boscos i energia espiritual." },
  },
  {
    slug: "alianza", name: "Alianza", theme: "alianza", image: "/wiki/images/alianza_portada_baja2.webp",
    palette: { es: ["Piedra", "Metal", "Azul y dorado"], en: ["Stone", "Metal", "Blue and gold"], ca: ["Pedra", "Metall", "Blau i daurat"] },
    gradient: "linear-gradient(160deg,#101a26 0%,#426a89 55%,#c3a267 140%)",
    style: { es: "Movilidad, disparo y magia, o resistencia marcial.", en: "Mobility, shooting and magic, or martial resilience.", ca: "Mobilitat, tret i màgia, o resistència marcial." },
    blurb: { es: "Civilizaciones humanas de piedra y metal.", en: "Human civilisations of stone and metal.", ca: "Civilitzacions humanes de pedra i metall." },
    subfactions: [
      { name: "Mercenarias de Isha", note: { es: "Movilidad, disparo, magia y número.", en: "Mobility, shooting, magic and numbers.", ca: "Mobilitat, tret, màgia i nombre." } },
      { name: "Legión de los Cien Corazones", note: { es: "Combate cuerpo a cuerpo y resistencia marcial, sin magia.", en: "Melee combat and martial resilience, without magic.", ca: "Combat cos a cos i resistència marcial, sense màgia." } },
    ],
  },
  {
    slug: "manadas-de-urueh", name: "Manadas de Urueh", theme: "urueh", image: "/wiki/images/portada_manadas.webp",
    palette: { es: ["Fuego", "Ceniza", "Lava"], en: ["Fire", "Ash", "Lava"], ca: ["Foc", "Cendra", "Lava"] },
    gradient: "linear-gradient(160deg,#120807 0%,#a63827 55%,#e0642f 140%)",
    style: { es: "Superioridad numérica, presión y destrucción.", en: "Numerical superiority, pressure and destruction.", ca: "Superioritat numèrica, pressió i destrucció." },
    blurb: { es: "Fuego, cenizas y negro volcánico.", en: "Fire, ash and volcanic black.", ca: "Foc, cendres i negre volcànic." },
  },
  {
    slug: "vastagos-de-kurgan", name: "Vástagos de Kurgan", theme: "kurgan", image: "/wiki/images/hijos_de_kurgan.webp",
    palette: { es: ["Hielo", "Tormenta", "Azul profundo"], en: ["Ice", "Storm", "Deep blue"], ca: ["Gel", "Tempesta", "Blau profund"] },
    gradient: "linear-gradient(160deg,#05080d 0%,#1b3a5c 55%,#6fa8d6 140%)",
    style: { es: "Resistencia y criaturas poderosas.", en: "Resilience and powerful creatures.", ca: "Resistència i criatures poderoses." },
    blurb: { es: "Hielo, tormentas y frío extremo.", en: "Ice, storms and extreme cold.", ca: "Gel, tempestes i fred extrem." },
  },
];

export const getFaction = (slug: string) => factions.find((f) => f.slug === slug);
