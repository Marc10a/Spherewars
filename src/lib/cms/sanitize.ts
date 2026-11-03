import sanitizeHtml from "sanitize-html";

/**
 * Second line of defence for HTML coming from WordPress (the plugin already runs wp_kses_post). Allow-list only: no scripts,
 * no inline styles/event handlers, links and images over https (links may also be mailto:), external links get rel/target.
 * Attributes are rebuilt from scratch in transformTags, so nothing the source supplies (target, rel, onclick...) survives.
 */
export function cleanCmsHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "strong", "em", "a", "img", "figure", "figcaption", "br", "hr", "table", "thead", "tbody", "tr", "th", "td", "span"],
    allowedAttributes: { a: ["href", "rel", "target"], img: ["src", "alt", "width", "height", "loading"], th: ["colspan"], td: ["colspan"] },
    allowedSchemes: ["https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attribs) => ({
        tagName: "a",
        attribs: { ...(attribs.href ? { href: attribs.href } : {}), rel: "noopener nofollow", ...(attribs.href?.startsWith("https") ? { target: "_blank" } : {}) },
      }),
      img: (_tag, attribs) => ({
        tagName: "img",
        attribs: { ...(attribs.src ? { src: attribs.src } : {}), alt: attribs.alt ?? "", ...(attribs.width ? { width: attribs.width } : {}), ...(attribs.height ? { height: attribs.height } : {}), loading: "lazy" },
      }),
    },
  });
}
