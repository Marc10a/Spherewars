/**
 * The name SphereWars as the Abaddon wordmark. The font has no web licence, so the letters are an image (.wordmark in tailwind.css, painted with
 * the text colour or, with "ember-text", the ember gradient). The name itself follows as zero-size inline text: screen readers, search and
 * copy-paste read «SphereWars» with no extra space, as the font version did.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return <><span aria-hidden className={`wordmark ${className}`} /><span className="wordmark-name">SphereWars</span></>;
}
