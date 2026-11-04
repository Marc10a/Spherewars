import Link from "next/link";
import { dict, localeNames, locales, type Locale } from "@/lib/i18n";
import { links } from "@/content/site";

export function Footer({ locale }: { locale: Locale }) {
  const t = dict[locale];
  return (
    <footer className="mt-24 border-t border-gold/20 bg-coal">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-wordmark text-3xl tracking-[0.04em] text-gold">SphereWars</p>
          <p className="mt-2 text-sm text-stone">{t.footer.tagline}</p>
          <p className="mt-4 flex gap-3 text-xs text-stone">
            {locales.map((l) => (
              <Link key={l} href={`/${l}`} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined} className={l === locale ? "text-gold" : "hover:text-ivory"}>{localeNames[l]}</Link>
            ))}
          </p>
        </div>
        <ul className="grid gap-2 text-sm">
          <li><a href={links.instagram} rel="noopener" className="hover:text-gold">Instagram</a></li>
          <li><a href={links.youtube} rel="noopener" className="hover:text-gold">YouTube</a></li>
          <li><a href={links.discord} rel="noopener" className="hover:text-gold">Discord</a></li>
          <li><a href={links.wiki} rel="noopener" className="hover:text-gold">WikiSphere</a></li>
          <li><Link href={`/${locale}/descargas`} className="hover:text-gold">{t.footer.downloads}</Link></li>
        </ul>
        <ul className="grid gap-2 text-sm text-stone">
          <li><Link href={`/${locale}/legal/aviso-legal`}>{t.footer.legal}</Link></li>
          <li><Link href={`/${locale}/legal/privacidad`}>{t.footer.privacy}</Link></li>
          <li><Link href={`/${locale}/legal/cookies`}>{t.footer.cookies}</Link></li>
          <li><Link href={`/${locale}/legal/condiciones`}>{t.legal.titles.condiciones}</Link></li>
          <li><Link href={`/${locale}/legal/devoluciones`}>{t.legal.titles.devoluciones}</Link></li>
        </ul>
      </div>
      <p className="border-t border-gold/10 py-4 text-center text-xs text-stone">© SphereWars. {t.common.rights}</p>
    </footer>
  );
}
