<?php
if (!defined('ABSPATH')) exit;

/* Builds the dynamic parts of the pages (news, events) with the same markup the original site used. */

/** Replaces the inside of the element marked data-wp-slot="name" (a <div>) with $inner. Returns $html unchanged if there is no such slot. */
function sw_slot_replace(string $html, string $name, string $inner): string {
    if (!preg_match('#<div\b[^>]*data-wp-slot="' . preg_quote($name, '#') . '"[^>]*>#', $html, $m, PREG_OFFSET_CAPTURE)) return $html;
    $start = $m[0][1] + strlen($m[0][0]);
    $depth = 1;
    $pos = $start;
    while ($depth > 0 && preg_match('#<(/?)div\b#', $html, $t, PREG_OFFSET_CAPTURE, $pos)) {
        $depth += $t[1][0] === '/' ? -1 : 1;
        $pos = $t[0][1] + 4;
        if ($depth === 0) return substr($html, 0, $start) . $inner . substr($html, $t[0][1]);
    }
    return $html;
}

/* ---------- formatting (same look as the browser's toLocaleDateString of the original) ---------- */

function sw_icu_locale(string $l): string { return ['es' => 'es_ES', 'en' => 'en_US', 'ca' => 'ca_ES'][$l] ?? 'es_ES'; }

/** 20/10/2026 (es, ca) or 10/20/2026 (en) */
function sw_date_short(string $iso, string $locale): string {
    $d = new DateTimeImmutable($iso);
    $d = $d->setTimezone(wp_timezone());
    return $locale === 'en' ? $d->format('n/j/Y') : $d->format('j/n/Y');
}

function sw_icu(string $iso, string $locale, string $skeleton): string {
    $d = (new DateTimeImmutable($iso))->setTimezone(wp_timezone());
    if (class_exists('IntlDatePatternGenerator')) {
        $pattern = (new IntlDatePatternGenerator(sw_icu_locale($locale)))->getBestPattern($skeleton);
        $f = new IntlDateFormatter(sw_icu_locale($locale), IntlDateFormatter::NONE, IntlDateFormatter::NONE, wp_timezone(), null, $pattern);
        return (string) $f->format($d);
    }
    return $d->format('j/n/Y'); // without the intl extension: plain numeric date
}

function sw_date_long(string $iso, string $locale): string {
    $d = (new DateTimeImmutable($iso))->setTimezone(wp_timezone());
    if (class_exists('IntlDateFormatter')) {
        $f = new IntlDateFormatter(sw_icu_locale($locale), IntlDateFormatter::FULL, IntlDateFormatter::SHORT, wp_timezone());
        return (string) $f->format($d);
    }
    return $d->format('j/n/Y H:i');
}

function sw_money(int $cents, string $locale): string {
    if (class_exists('NumberFormatter')) return (string) (new NumberFormatter(sw_icu_locale($locale), NumberFormatter::CURRENCY))->formatCurrency($cents / 100, 'EUR');
    return number_format($cents / 100, 2, ',', '.') . ' €';
}

function sw_pending(string $label, string $text): string {
    return '<div role="note" class="border border-dashed border-gold/40 bg-coal/60 p-6 text-sm text-stone"><span class="mb-2 block text-xs uppercase tracking-widest text-gold">' . sw_h($label) . '</span>' . sw_h($text) . '</div>';
}

/* ---------- page hero (same as the original PageHero) ---------- */

function sw_rnd(int $i, int $salt): float { $x = sin($i * 12.9898 + $salt * 78.233) * 43758.5453; return $x - floor($x); }

function sw_hero(string $title, ?string $lead = null, ?string $image = null): string {
    $spans = '';
    for ($i = 0; $i < 18; $i++) {
        $w = 2 + sw_rnd($i, 2) * 4;
        $spans .= sprintf('<span style="left:%s%%;width:%spx;height:%spx;animation-duration:%ss;animation-delay:%ss;opacity:%s"></span>',
            sw_rnd($i, 1) * 100, $w, $w, 9 + sw_rnd($i, 3) * 14, -sw_rnd($i, 4) * 20, 0.25 + sw_rnd($i, 5) * 0.6);
    }
    $img = $image ? '<img alt="" sizes="100vw" decoding="async" class="object-cover object-center opacity-60" style="position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent" src="' . sw_h($image) . '"/>'
        . '<div class="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/60 to-abyss/30" aria-hidden="true"></div>' : '';
    return '<div class="relative overflow-hidden border-b border-gold/20 bg-coal">' . $img . '<div class="mist absolute inset-0" aria-hidden="true"></div>'
        . '<div aria-hidden="true" class="particles particles-dust pointer-events-none absolute inset-0 overflow-hidden">' . $spans . '</div>'
        . '<div class="relative mx-auto max-w-7xl px-4 py-20 md:py-28"><h1 class="fade-up font-display text-4xl tracking-wide text-ivory md:text-6xl">' . sw_h($title) . '</h1>'
        . ($lead ? '<p class="fade-up mt-4 max-w-2xl text-lg text-stone">' . sw_h($lead) . '</p>' : '') . '</div></div>';
}

/** <head> tags for a page built here (same fields as the original's metadata). */
function sw_head(string $title, string $description, string $path, string $locale, ?string $image = null, bool $noindex = false): string {
    $t = sw_h($title . ' · SphereWars'); $d = sw_h($description);
    $img = $image ? sw_h($image) : '{{S}}/og.jpg';
    $og = ['es' => 'es_ES', 'en' => 'en_US', 'ca' => 'ca_ES'][$locale];
    $h = '<title>' . $t . '</title><meta name="description" content="' . $d . '"/>' . ($noindex ? '<meta name="robots" content="noindex, nofollow"/>' : '')
        . '<link rel="canonical" href="{{S}}/' . $locale . $path . '"/>';
    foreach (SW_LOCALES as $l) $h .= '<link rel="alternate" hreflang="' . $l . '" href="{{S}}/' . $l . $path . '"/>';
    $h .= '<link rel="alternate" hreflang="x-default" href="{{S}}/es' . $path . '"/>'
        . '<meta property="og:title" content="' . $t . '"/><meta property="og:description" content="' . $d . '"/><meta property="og:site_name" content="SphereWars"/><meta property="og:locale" content="' . $og . '"/>'
        . '<meta property="og:image" content="' . $img . '"/><meta property="og:type" content="website"/><meta name="twitter:card" content="summary_large_image"/>'
        . '<meta name="twitter:title" content="' . sw_h($title) . '"/><meta name="twitter:description" content="' . $d . '"/><meta name="twitter:image" content="' . $img . '"/>';
    return $h;
}

/** Replaces the content of <main> of a stored page. */
function sw_replace_main(string $html, string $main): string {
    return preg_replace_callback('#<main id="main">.*</main>#s', static fn() => '<main id="main">' . $main . '</main>', $html, 1) ?? $html;
}

/* ---------- news ---------- */

function sw_news_meta_line(array $n, string $locale): string {
    return sw_h($n['category']) . ($n['publish_at'] ? ' · ' . sw_date_short($n['publish_at'], $locale) : '');
}

function sw_news_list_inner(string $locale): string {
    $t = sw_data('data/i18n')[$locale];
    $items = sw_news_list($locale, 50);
    if (!$items) return sw_pending($t['common']['pendingLabel'], $t['news']['empty']);
    $out = '<ul class="divide-y divide-gold/10 border border-gold/20 bg-coal">';
    foreach ($items as $n) {
        $ex = mb_substr(preg_replace('/[#>*_-]/u', '', $n['excerpt']) ?? '', 0, 220);
        $out .= '<li><a class="block p-5 hover:bg-gold/5" href="/' . $locale . '/novedades/' . sw_h($n['slug']) . '"><p class="text-xs uppercase tracking-widest text-gold">' . sw_news_meta_line($n, $locale) . '</p>'
            . '<h2 class="mt-1 font-display text-xl">' . sw_h($n['title']) . '</h2>' . ($ex !== '' ? '<p class="mt-2 line-clamp-2 text-sm text-stone">' . sw_h($ex) . '</p>' : '') . '</a></li>';
    }
    return $out . '</ul>';
}

function sw_home_news_inner(string $locale): string {
    $t = sw_data('data/i18n')[$locale];
    $h = $t['home'];
    $items = sw_news_list($locale, 3);
    $out = '<h2 class="font-display text-2xl tracking-wide text-ivory md:text-3xl">' . sw_h($h['newsTitle']) . '</h2><hr class="rune-divider my-4"/>';
    if (!$items) {
        $out .= sw_pending($t['common']['pendingLabel'], $h['newsEmpty']);
    } else {
        $out .= '<ul class="divide-y divide-gold/10 border border-gold/20 bg-coal">';
        foreach ($items as $n) {
            $out .= '<li><a class="block p-4 hover:bg-gold/5" href="/' . $locale . '/novedades/' . sw_h($n['slug']) . '"><span class="text-xs uppercase tracking-widest text-gold">' . sw_news_meta_line($n, $locale) . '</span>'
                . '<span class="mt-1 block font-display text-lg">' . sw_h($n['title']) . '</span></a></li>';
        }
        $out .= '</ul>';
    }
    return $out . '<div class="mt-5"><a class="inline-block px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition border border-gold/60 text-gold hover:bg-gold/10" href="/' . $locale . '/novedades">' . sw_h($h['allNews']) . '</a></div>';
}

function sw_news_detail(string $base, string $locale, string $slug): ?array {
    $n = sw_news_get($locale, $slug);
    if (!$n) return null;
    $t = sw_data('data/i18n')[$locale]['news'];
    $main = sw_hero($n['title'], $n['category'] ?: null, $n['image']['url'] ?? null)
        . '<article class="mx-auto max-w-3xl px-4 py-12">'
        . ($n['status'] !== 'publish' ? '<p role="note" class="mb-6 border border-ember bg-ember/20 p-3 text-sm">Vista previa: esta noticia aún no está publicada.</p>' : '')
        . ($n['publish_at'] && $n['status'] === 'publish' ? '<p class="mb-6 text-xs uppercase tracking-widest text-stone">' . sw_h($t['published']) . ' ' . sw_date_short($n['publish_at'], $locale) . '</p>' : '')
        . '<div class="wiki-prose">' . $n['html'] . '</div>'
        . '<a class="mt-10 inline-block text-xs uppercase tracking-widest text-gold hover:text-ivory" href="/' . $locale . '/novedades">' . sw_h($t['back']) . '</a></article>';
    $title = $n['seo']['title'] ?: $n['title'];
    $desc = $n['seo']['description'] ?: ($n['excerpt'] !== '' ? mb_substr($n['excerpt'], 0, 200) : sw_data('data/i18n')[$locale]['news']['lead']);
    return ['body' => sw_replace_main($base, $main), 'head' => sw_head($title, $desc, '/novedades/' . $n['slug'], $locale, $n['image']['url'] ?? null, $n['status'] !== 'publish')];
}

/* ---------- events ---------- */

function sw_event_day(array $e, string $locale): string { return sw_icu($e['starts_at'], $locale, 'dMMM'); }

function sw_home_events_inner(string $locale): string {
    $t = sw_data('data/i18n')[$locale];
    $h = $t['home'];
    $items = array_slice(sw_events_list($locale, false), 0, 3);
    $out = '<h2 class="font-display text-2xl tracking-wide text-ivory md:text-3xl">' . sw_h($h['eventsTitle']) . '</h2><hr class="rune-divider my-4"/>';
    if (!$items) {
        $out .= sw_pending($t['common']['pendingLabel'], $h['eventsEmpty']);
    } else {
        $out .= '<ul class="divide-y divide-gold/10 border border-gold/20 bg-coal">';
        foreach ($items as $e) {
            $sub = implode(' · ', array_filter([$t['events']['kinds'][$e['kind']] ?? $e['kind'], $e['city']]));
            $out .= '<li><a class="grid grid-cols-[4.5rem_1fr] items-center gap-3 p-4 hover:bg-gold/5" href="/' . $locale . '/eventos/' . sw_h($e['slug']) . '"><time datetime="' . sw_h($e['starts_at']) . '" class="font-display text-gold">' . sw_h(sw_event_day($e, $locale)) . '</time>'
                . '<span>' . sw_h($e['title']) . '<span class="block text-xs text-stone">' . sw_h($sub) . '</span></span></a></li>';
        }
        $out .= '</ul>';
    }
    return $out . '<div class="mt-5"><a class="inline-block px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition border border-gold/60 text-gold hover:bg-gold/10" href="/' . $locale . '/eventos">' . sw_h($h['allEvents']) . '</a></div>';
}

function sw_events_list_inner(string $locale): string {
    $t = sw_data('data/i18n')[$locale];
    $ev = $t['events'];
    $city = isset($_GET['ciudad']) ? sanitize_text_field(wp_unslash($_GET['ciudad'])) : '';
    $tipo = isset($_GET['tipo']) && in_array($_GET['tipo'], SW_KINDS, true) ? (string) $_GET['tipo'] : '';
    $past = ($_GET['pasados'] ?? '') === '1';
    $events = sw_events_list($locale, $past, $city ?: null, $tipo ?: null);
    $cities = array_values(array_unique(array_filter(array_map(static fn($e) => $e['city'], sw_events_list($locale, $past)))));
    $href = static function (array $o) use ($locale) {
        $qs = [];
        if (!empty($o['ciudad'])) $qs['ciudad'] = $o['ciudad'];
        if (!empty($o['tipo'])) $qs['tipo'] = $o['tipo'];
        if (!empty($o['pasados'])) $qs['pasados'] = '1';
        return '/' . $locale . '/eventos' . ($qs ? '?' . sw_h(http_build_query($qs, '', '&', PHP_QUERY_RFC3986)) : '');
    };
    $chip = static fn(bool $a) => 'border px-3 py-1 text-xs uppercase tracking-widest ' . ($a ? 'border-gold bg-gold text-abyss' : 'border-gold/40 text-ivory/80 hover:border-gold');

    $out = '<nav aria-label="' . sw_h($ev['filters']) . '" class="mb-8 grid gap-3"><div class="flex flex-wrap gap-2">'
        . '<a class="' . $chip(!$past) . '" href="' . $href(['ciudad' => $city, 'tipo' => $tipo]) . '">' . sw_h($ev['upcoming']) . '</a>'
        . '<a class="' . $chip($past) . '" href="' . $href(['ciudad' => $city, 'tipo' => $tipo, 'pasados' => true]) . '">' . sw_h($ev['past']) . '</a></div>'
        . '<div class="flex flex-wrap gap-2"><a class="' . $chip($city === '') . '" href="' . $href(['pasados' => $past, 'tipo' => $tipo]) . '">' . sw_h($ev['allCities']) . '</a>';
    foreach ($cities as $c) $out .= '<a class="' . $chip($city === $c) . '" href="' . $href(['ciudad' => $c, 'tipo' => $tipo, 'pasados' => $past]) . '">' . sw_h($c) . '</a>';
    $out .= '</div><div class="flex flex-wrap gap-2"><a class="' . $chip($tipo === '') . '" href="' . $href(['ciudad' => $city, 'pasados' => $past]) . '">' . sw_h($ev['allTypes']) . '</a>';
    foreach ($ev['kinds'] as $k => $l) $out .= '<a class="' . $chip($tipo === $k) . '" href="' . $href(['ciudad' => $city, 'tipo' => $k, 'pasados' => $past]) . '">' . sw_h($l) . '</a>';
    $out .= '</div></nav>';

    if (!$events) {
        $msg = str_replace(['{when}', '{filters}'], [$past ? $ev['whenPast'] : $ev['whenUpcoming'], ($city || $tipo) ? $ev['withFilters'] : ''], $ev['none']);
        return $out . sw_pending($t['common']['pendingLabel'], $msg);
    }
    $byMonth = [];
    foreach ($events as $e) $byMonth[sw_icu($e['starts_at'], $locale, 'yMMMM')][] = $e;
    foreach ($byMonth as $month => $list) {
        $out .= '<section class="mb-10"><h2 class="font-display text-2xl capitalize text-gold">' . sw_h($month) . '</h2><ul class="mt-4 divide-y divide-gold/10 border border-gold/20 bg-coal">';
        foreach ($list as $e) {
            $out .= '<li><a class="grid gap-1 p-4 hover:bg-gold/5 sm:grid-cols-[8rem_1fr_auto] sm:items-center" href="/' . $locale . '/eventos/' . sw_h($e['slug']) . '"><time datetime="' . sw_h($e['starts_at']) . '" class="font-display text-gold">' . sw_h(sw_event_day($e, $locale)) . '</time>'
                . '<span>' . sw_h($e['title']) . '<span class="block text-xs text-stone">' . sw_h(implode(' · ', array_filter([$e['organizer'], $e['city']]))) . '</span></span>'
                . '<span class="text-xs uppercase tracking-widest text-ice">' . sw_h($ev['kinds'][$e['kind']] ?? $e['kind']) . '</span></a></li>';
        }
        $out .= '</ul></section>';
    }
    return $out;
}

function sw_event_detail(string $base, string $locale, string $slug): ?array {
    $e = sw_event_get($locale, $slug);
    if (!$e || !$e['starts_at']) return null;
    $t = sw_data('data/i18n')[$locale]['events'];
    $upcoming = new DateTimeImmutable($e['starts_at']) >= new DateTimeImmutable('now');
    $addr = implode(', ', array_filter([$e['address'], $e['city']]));
    $rows = [
        [$t['f']['type'], $t['kinds'][$e['kind']] ?? $e['kind']], [$t['f']['date'], sw_date_long($e['starts_at'], $locale)], [$t['f']['organizer'], $e['organizer']],
        [$t['f']['address'], $addr ?: null], [$t['f']['format'], $e['format']], [$t['f']['requirements'], $e['requirements']],
        [$t['f']['fee'], $e['fee_cents'] !== null ? sw_money($e['fee_cents'], $locale) : null], [$t['f']['prizes'], $e['prizes']],
        [$t['f']['spots'], $e['capacity'] !== null ? (string) $e['capacity'] : null],
    ];
    $dl = '';
    foreach ($rows as [$k, $v]) if ($v) $dl .= '<div class="grid grid-cols-[7rem_1fr] gap-2 border-b border-gold/10 pb-2"><dt class="text-xs uppercase tracking-widest text-gold">' . sw_h($k) . '</dt><dd>' . sw_h((string) $v) . '</dd></div>';
    $reg = !$upcoming ? '<p class="mt-3 text-sm text-stone">' . sw_h($t['happened']) . '</p>'
        : ($e['registration_url'] ? '<div class="mt-4"><a class="inline-block px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition bg-gold text-abyss hover:bg-ivory" href="' . sw_h($e['registration_url']) . '" rel="noopener">' . sw_h($t['externalReg']) . '</a></div>'
            : '<p class="mt-3 text-sm text-stone">' . sw_h($t['noOnline']) . '</p>');
    $map = $addr ? '<a class="text-sm text-ice underline" rel="noopener" href="https://www.openstreetmap.org/search?query=' . rawurlencode($addr) . '">' . sw_h($t['map']) . '</a>' : '';
    $main = sw_hero($e['title'], $t['kinds'][$e['kind']] ?? null, $e['image']['url'] ?? null)
        . '<div class="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_20rem]"><div class="space-y-6">'
        . ($e['status'] !== 'publish' ? '<p role="note" class="border border-ember bg-ember/20 p-3 text-sm">Vista previa: este evento aún no está publicado.</p>' : '')
        . '<div class="wiki-prose">' . $e['html'] . '</div><dl class="grid gap-3 text-sm">' . $dl . '</dl>' . $map . '</div>'
        . '<aside aria-label="' . sw_h($t['registration']) . '" class="h-fit border border-gold/30 bg-coal p-5"><h2 class="font-display text-lg">' . sw_h($t['registration']) . '</h2>' . $reg . '</aside></div>';
    $title = $e['seo']['title'] ?: $e['title'];
    $desc = $e['seo']['description'] ?: ($t['kinds'][$e['kind']] ?? '') . ' · ' . sw_date_long($e['starts_at'], $locale);
    $ld = '<script type="application/ld+json">' . wp_json_encode(array_filter([
        '@context' => 'https://schema.org', '@type' => 'Event', 'name' => $e['title'], 'startDate' => $e['starts_at'], 'endDate' => $e['ends_at'],
        'eventStatus' => 'https://schema.org/EventScheduled', 'location' => $addr ? ['@type' => 'Place', 'name' => $e['city'] ?: $addr, 'address' => $addr] : null,
        'organizer' => $e['organizer'] ? ['@type' => 'Organization', 'name' => $e['organizer']] : null,
    ]), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) . '</script>';
    return ['body' => sw_replace_main($base, $main) . $ld, 'head' => sw_head($title, $desc, '/eventos/' . $e['slug'], $locale, $e['image']['url'] ?? null, $e['status'] !== 'publish')];
}
