<?php
if (!defined('ABSPATH')) exit;

/* The two searches of the original site, done on the server: the wiki list (?q= on /wikisphere) and the global search (/buscar). */

function sw_wiki_index(): array { return sw_data('data/wiki-index'); }
function sw_wiki_haystack(): array { return sw_data('data/wiki-search'); }

/** Pages matching an optional term and category, same rule as the original (accent-insensitive substring). */
function sw_search_wiki(?string $q, ?string $category = null): array {
    $term = $q !== null && trim($q) !== '' ? sw_norm(trim($q)) : '';
    $hay = sw_wiki_haystack();
    return array_values(array_filter(sw_wiki_index(), static function ($p) use ($term, $category, $hay) {
        return ($category === null || $category === '' || $p['category'] === $category)
            && ($term === '' || str_contains($hay[$p['slug']] ?? '', $term));
    }));
}

function sw_wiki_search_page(string $html, string $locale): string {
    $t = sw_data('data/i18n')[$locale];
    $q = isset($_GET['q']) ? trim((string) $_GET['q']) : '';
    $cat = isset($_GET['categoria']) ? (string) $_GET['categoria'] : '';
    $pages = sw_search_wiki($q, $cat);
    $total = count($pages);

    $items = '';
    foreach ($pages as $p) {
        $img = ($p['image'] && in_array($p['category'], ['personajes', 'lugares'], true))
            ? '<img alt="" loading="lazy" width="480" height="320" decoding="async" class="h-40 w-full object-cover object-top" style="color:transparent" src="{{A}}' . sw_h($p['image']) . '"/>' : '';
        $desc = $p['description'] ? '<p lang="es" class="mt-1 line-clamp-2 text-sm text-stone">' . sw_h($p['description']) . '</p>' : '';
        $cat_label = $t['wiki']['cat'][$p['category']] ?? $p['categoryName'];
        $items .= '<li><a class="tilt-card block h-full overflow-hidden border border-gold/20 bg-coal" href="/' . $locale . '/wikisphere/' . sw_h($p['slug']) . '">' . $img
            . '<div class="p-4"><p class="text-xs uppercase tracking-widest text-gold">' . sw_h($cat_label) . '</p><h2 lang="es" class="mt-1 font-display text-lg">' . sw_h($p['title']) . '</h2>' . $desc . '</div></a></li>';
    }
    $status = '<p role="status" class="mb-4 text-sm text-stone">' . $total . ' ' . sw_h($t['wiki']['articles'][$total === 1 ? 0 : 1]) . '</p>';
    $list = '<ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">' . $items . '</ul>';

    $html = preg_replace('#<p role="status" class="mb-4 text-sm text-stone">.*?</ul>#s', str_replace('\\', '\\\\', $status . $list), $html, 1) ?? $html;
    $html = preg_replace('#<figure class="mb-8 border border-gold/30 bg-coal">.*?</figure>#s', '', $html, 1) ?? $html;
    $html = preg_replace('#(<input id="q" name="q")#', '$1 value="' . sw_h($q) . '"', $html, 1) ?? $html;
    return $html;
}

/** Global search (/buscar?q=): the wiki, which is the content that exists in the site itself. */
function sw_site_search_page(string $html, string $locale): string {
    $t = sw_data('data/i18n')[$locale]['search'];
    $raw = isset($_GET['q']) ? (string) $_GET['q'] : '';
    $q = trim(preg_replace('/[%_,()\\\\]/u', ' ', $raw) ?? '');
    $q = mb_substr($q, 0, 80);
    $tipo = isset($_GET['tipo']) ? (string) $_GET['tipo'] : '';

    $html = preg_replace('#(<input id="q" name="q")#', '$1 value="' . sw_h($raw) . '"', $html, 1) ?? $html;
    if (mb_strlen(trim($raw)) < 2) return $html;

    $i18n = sw_data('data/i18n')[$locale];
    $hits = [];
    foreach (array_slice(sw_search_wiki($q), 0, 40) as $p) {
        $hits[] = ['type' => 'wiki', 'title' => $p['title'], 'href' => '/' . $locale . '/wikisphere/' . $p['slug'], 'detail' => $i18n['wiki']['cat'][$p['category']] ?? $p['categoryName']];
    }
    $groups = $t['groups'];
    $shown = ($tipo !== '' && isset($groups[$tipo])) ? array_values(array_filter($hits, static fn($h) => $h['type'] === $tipo)) : $hits;
    $chip = static fn(bool $a) => 'border px-3 py-1 text-xs uppercase tracking-widest ' . ($a ? 'border-gold bg-gold text-abyss' : 'border-gold/40 text-ivory/80 hover:border-gold');
    $url = static fn(string $ty = '') => '/' . $locale . '/buscar?q=' . rawurlencode($raw) . ($ty !== '' ? '&amp;tipo=' . $ty : '');

    $nav = '<nav aria-label="' . sw_h($t['filterAria']) . '" class="mt-6 flex flex-wrap gap-2"><a class="' . $chip($tipo === '') . '" href="' . $url() . '">' . sw_h($t['all']) . ' (' . count($hits) . ')</a>';
    foreach ($groups as $ty => $label) {
        $n = count(array_filter($hits, static fn($h) => $h['type'] === $ty));
        $nav .= '<a class="' . $chip($tipo === $ty) . '" href="' . $url($ty) . '">' . sw_h($label) . ' (' . $n . ')</a>';
    }
    $nav .= '</nav>';
    $count = count($shown);
    $out = $nav . '<p role="status" class="mt-4 text-sm text-stone">' . $count . ' ' . sw_h($t['results'][$count === 1 ? 0 : 1]) . '</p><ul class="mt-2 divide-y divide-gold/10 border border-gold/20 bg-coal">';
    foreach ($shown as $h) {
        $out .= '<li><a class="block p-4 hover:bg-gold/5" href="' . sw_h($h['href']) . '"><span class="text-xs uppercase tracking-widest text-gold">' . sw_h($groups[$h['type']]) . '</span><span' . ($h['type'] === 'wiki' ? ' lang="es"' : '') . ' class="block">' . sw_h($h['title']) . '</span>'
            . (!empty($h['detail']) ? '<span class="text-xs text-stone">' . sw_h($h['detail']) . '</span>' : '') . '</a></li>';
    }
    $out .= '</ul>';
    return preg_replace('#</form>#', '</form>' . str_replace('\\', '\\\\', $out), $html, 1) ?? $html;
}
