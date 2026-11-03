import { SimplePage } from "@/components/SimplePage";
import { staticMeta } from "@/lib/seo";
import { links } from "@/content/site";

export const generateMetadata = staticMeta({ title: (t) => t.free.title, description: (t) => t.free.lead, path: "/juega-gratis" });

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <SimplePage
      params={params}
      build={(t) => ({
        title: t.free.title, lead: t.free.lead,
        blocks: [
          { title: t.free.block, cta: [{ label: t.free.rules, href: links.rules, external: true }, { label: t.free.build, href: links.builder, external: true }] },
          { title: t.free.centerTitle, pending: t.free.centerPending },
        ],
      })}
    />
  );
}
