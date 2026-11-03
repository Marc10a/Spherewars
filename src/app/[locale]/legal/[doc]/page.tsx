import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { SimplePage } from "@/components/SimplePage";
import { dict, isLocale, locales } from "@/lib/i18n";

const DOCS = ["aviso-legal", "privacidad", "cookies", "condiciones", "devoluciones"];

export const generateStaticParams = () => locales.flatMap((locale) => DOCS.map((doc) => ({ locale, doc })));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  return pageMeta({ title: isLocale(locale) ? dict[locale].legal.titles[doc] : undefined, path: `/legal/${doc}`, noindex: true }, locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { doc } = await params;
  if (!DOCS.includes(doc)) notFound();
  return <SimplePage params={params} build={(t) => ({ title: t.legal.titles[doc], blocks: [{ title: t.legal.pendingTitle, pending: t.legal.pending }] })} />;
}
