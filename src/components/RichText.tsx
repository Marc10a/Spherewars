/**
 * Renders editor text safely: plain text only, no HTML is ever interpreted (no XSS surface).
 * Supported: "## " / "### " headings, "> " quotes, "- " lists, blank-line paragraphs, https image lines "![alt](url)" are NOT supported on purpose.
 */
export function RichText({ md }: { md?: string }) {
  if (!md?.trim()) return null;
  const blocks = md.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="space-y-5 leading-relaxed text-ivory/90">
      {blocks.map((b, i) => {
        if (b.startsWith("### ")) return <h3 key={i} className="font-display text-xl text-gold">{b.slice(4)}</h3>;
        if (b.startsWith("## ")) return <h2 key={i} className="font-display text-2xl text-ivory">{b.slice(3)}</h2>;
        if (b.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-gold pl-4 italic text-stone">{b.slice(2)}</blockquote>;
        if (b.split("\n").every((l) => l.startsWith("- "))) {
          return <ul key={i} className="list-disc pl-6">{b.split("\n").map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        }
        return <p key={i}>{b}</p>;
      })}
    </div>
  );
}
