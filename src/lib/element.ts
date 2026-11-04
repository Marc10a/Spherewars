export type Element = "fire" | "ice" | "wind" | "forge";

/** The element of each faction's god, shown by ElementCanvas. */
export const elementFor = (theme?: string): Element | null =>
  theme === "urueh" ? "fire" : theme === "kurgan" ? "ice" : theme === "malesur" ? "wind" : theme === "alianza" ? "forge" : null;
