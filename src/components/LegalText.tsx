import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Renders the legal texts of src/lib/legal (plain text, no HTML is interpreted).
 * Blocks: "## " / "### " headings (optional "{#id}"), "- " lists, "| " table rows (first row = header), paragraphs.
 * Inline: [[pending data]] as a visible mark, [label](/path or #anchor or https://…), bare https URLs and emails as links.
 */
const INLINE = /\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)\s]+)\)|(https:\/\/[^\s)]*[^\s.,;:)])|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inline(text: string, locale: string, pendingLabel: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = m.index;
    if (m[1]) {
      out.push(
        <mark key={k} className="border border-dashed border-gold/70 bg-gold/15 px-1 text-ivory">
          <span className="font-display text-gold">{pendingLabel}:</span> {m[1]}
        </mark>,
      );
    } else if (m[2]) {
      const href = m[3];
      if (href.startsWith("/")) out.push(<Link key={k} href={`/${locale}${href}`}>{m[2]}</Link>);
      else out.push(<a key={k} href={href} {...(href.startsWith("http") ? { rel: "noopener" } : {})}>{m[2]}</a>);
    } else if (m[4]) {
      out.push(<a key={k} href={m[4]} rel="noopener">{m[4].replace(/^https:\/\//, "")}</a>);
    } else if (m[5]) {
      out.push(<a key={k} href={`mailto:${m[5]}`}>{m[5]}</a>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function heading(raw: string) {
  const m = raw.match(/^(.*?)\s*\{#([\w-]+)\}$/);
  return m ? { text: m[1], id: m[2] } : { text: raw, id: slug(raw) };
}

export function LegalText({ text, locale, pendingLabel }: { text: string; locale: string; pendingLabel: string }) {
  const blocks = text.replace(/\r/g, "").trim().split(/\n{2,}/);
  const md = (s: string) => inline(s, locale, pendingLabel);
  return (
    <div className="wiki-prose">
      {blocks.map((b, i) => {
        if (b.startsWith("### ")) { const h = heading(b.slice(4)); return <h3 key={i} id={h.id} className="scroll-mt-24">{h.text}</h3>; }
        if (b.startsWith("## ")) { const h = heading(b.slice(3)); return <h2 key={i} id={h.id} className="scroll-mt-24">{h.text}</h2>; }
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{md(l.slice(2))}</li>)}</ul>;
        if (lines.every((l) => l.startsWith("| "))) {
          const rows = lines.map((l) => l.replace(/^\|\s*|\s*\|\s*$/g, "").split(/\s*\|\s*/));
          return (
            // Phones stack each row as a card (see .legal-table in tailwind.css); the roles keep the table semantics once cells are display: block.
            <div key={i} className="table-container">
              <table className="legal-table" role="table">
                <thead role="rowgroup"><tr role="row">{rows[0].map((c, j) => <th key={j} scope="col" role="columnheader">{c}</th>)}</tr></thead>
                <tbody role="rowgroup">{rows.slice(1).map((r, j) => <tr key={j} role="row">{r.map((c, n) => (n
                  ? <td key={n} role="cell" data-label={rows[0][n]}>{md(c)}</td>
                  : <th key={n} scope="row" role="rowheader" data-label={rows[0][n]} className="font-normal">{md(c)}</th>))}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={i}>{md(b)}</p>;
      })}
    </div>
  );
}
