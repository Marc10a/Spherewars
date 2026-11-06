import type { Locale } from "@/lib/i18n";
import { es } from "./es";
import { en } from "./en";
import { ca } from "./ca";

/**
 * Legal texts. DRAFT pending review by a Spanish legal adviser: nothing here is final.
 * Spanish is the primary text; EN and CA are translations of it. Unknown data is written as [[...]] and shown as a visible
 * "Pending" mark, never invented. Format (rendered by LegalText): "## " / "### " headings, "- " lists, "| " table rows,
 * blank-line paragraphs, [label](url) links (internal paths without locale), bare https URLs and emails become links.
 */
export const LEGAL_DOCS = ["aviso-legal", "privacidad", "cookies", "condiciones", "devoluciones"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];
export const isLegalDoc = (v: string): v is LegalDoc => (LEGAL_DOCS as readonly string[]).includes(v);

/** Date of the current draft (ISO). Change it whenever the texts change. */
export const LEGAL_DRAFT_DATE = "2026-11-06";

export const legalTexts: Record<Locale, Record<LegalDoc, string>> = { es, en, ca };
