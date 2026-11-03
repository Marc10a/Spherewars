import type { Faction } from "@/content/factions";
import { characterInfo, type WikiPage } from "@/lib/wiki";

export type MiniGroup = { name: string | null; pages: WikiPage[] };

/**
 * Factions with subfactions (Alianza) split their miniatures by the affiliation in the official info table;
 * anything that matches no subfaction goes in a final group named `otherLabel`.
 */
export function groupBySubfaction(f: Faction, characters: WikiPage[], otherLabel: string): MiniGroup[] {
  if (!f.subfactions) return [{ name: null, pages: characters }];
  const used = new Set<string>();
  const groups = f.subfactions.map((s) => {
    const key = s.name.split(" ")[0].toLowerCase(); // "mercenarias" | "legión"
    const pages = characters.filter((c) => (characterInfo(c).affiliation ?? "").toLowerCase().includes(key));
    pages.forEach((c) => used.add(c.slug));
    return { name: s.name, pages };
  });
  const rest = characters.filter((c) => !used.has(c.slug));
  return [...groups.filter((g) => g.pages.length), ...(rest.length ? [{ name: otherLabel, pages: rest }] : [])];
}
