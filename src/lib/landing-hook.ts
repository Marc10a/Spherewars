import landings from "@/content/faction-landings.json";

type Hook = { hook: string; hookI18n?: Partial<Record<string, string>> };

/** A faction's one-line hook: the Spanish source, or its machine-assisted en/ca version (pending validation, see docs). */
export function landingHook(slug: string, locale: string): { hook: string; hookLang: string } {
  const l = (landings as Record<string, Hook>)[slug];
  const tr = l.hookI18n?.[locale];
  return tr ? { hook: tr, hookLang: locale } : { hook: l.hook, hookLang: "es" };
}
