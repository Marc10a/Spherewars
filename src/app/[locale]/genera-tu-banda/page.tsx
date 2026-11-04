import { SimplePage } from "@/components/SimplePage";
import { staticMeta } from "@/lib/seo";
import { links } from "@/content/site";

export const generateMetadata = staticMeta({ title: (t) => t.builder.title, description: (t) => t.builder.lead, path: "/genera-tu-banda" });

export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  return (
    <SimplePage
      params={params}
      build={(t) => ({
        title: t.builder.title, lead: t.builder.lead, image: "/wiki/images/legi_n_portada_concept.webp",
        blocks: [
          { title: t.builder.block, lead: t.builder.blockLead, cta: [{ label: t.home.builderCta, href: links.builder, external: true }, { label: t.home.builderPlay, href: links.builder, external: true }] },
        ],
      })}
    />
  );
}
