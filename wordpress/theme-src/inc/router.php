<?php
if (!defined('ABSPATH')) exit;

/**
 * Takes over every public URL of the site (/es, /en/juego, /ca/tienda/...) before WordPress looks for posts/pages.
 * WordPress itself (wp-admin, wp-login, wp-json, uploads, WooCommerce payment pages...) keeps working untouched.
 */
add_action('parse_request', 'sw_route', 1);

function sw_route(): void {
    if (is_admin() || (defined('REST_REQUEST') && REST_REQUEST) || wp_doing_ajax()) return;

    $uri = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $base = rtrim((string) parse_url(home_url(), PHP_URL_PATH), '/');
    $path = ($base !== '' && str_starts_with($uri, $base)) ? substr($uri, strlen($base)) : $uri;
    $path = rtrim($path === '' ? '/' : $path, '/') ?: '/';

    // WordPress / WooCommerce own paths
    if (preg_match('#^/(wp-|xmlrpc\.php|index\.php|checkout|cart|my-account|wc-api|\?)#', $path)) return;

    // SEO files and favicon (same files as the original site)
    $seo = ['/robots.txt' => ['robots.txt', 'text/plain; charset=utf-8'], '/sitemap.xml' => ['sitemap.xml', 'application/xml; charset=utf-8'],
            '/manifest.webmanifest' => ['manifest.webmanifest', 'application/manifest+json; charset=utf-8'], '/favicon.ico' => ['favicon.ico', 'image/x-icon']];
    if (isset($seo[$path])) {
        $f = SW_DIR . '/assets/seo/' . $seo[$path][0];
        if (!is_readable($f)) return;
        header('Content-Type: ' . $seo[$path][1]);
        header('Cache-Control: public, max-age=3600');
        $out = $path === '/favicon.ico' ? file_get_contents($f) : sw_tokens(file_get_contents($f));
        if ($path === '/sitemap.xml') $out = str_replace('</urlset>', sw_sitemap_extra() . '</urlset>', $out);
        echo $out;
        exit;
    }

    if ($path === '/') sw_redirect_to_locale('/');
    $locale = sw_locale_from_path($path);
    if ($locale === null) {
        // a path without language (e.g. /juego): send it to the visitor's language like the original site did
        if (preg_match('#^/[a-z0-9-]+(/|$)#i', $path) && !sw_is_wp_content($path)) sw_redirect_to_locale($path);
        return;
    }
    sw_render_page($path, $locale);
}

function sw_is_wp_content(string $path): bool {
    return (bool) preg_match('#^/(wp-content|wp-includes|wp-json)#', $path);
}

/** Saved choice (cookie) > browser language > Spanish. Temporary redirect: it depends on the visitor. */
function sw_redirect_to_locale(string $path): void {
    $saved = $_COOKIE['sw_locale'] ?? '';
    $chosen = in_array($saved, SW_LOCALES, true) ? $saved : null;
    if (!$chosen) {
        foreach (explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '') as $part) {
            $l = strtolower(substr(trim($part), 0, 2));
            if (in_array($l, SW_LOCALES, true)) { $chosen = $l; break; }
        }
    }
    $chosen = $chosen ?: 'es';
    $qs = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : '';
    header('Vary: Accept-Language, Cookie');
    wp_redirect(home_url('/' . $chosen . ($path === '/' ? '' : $path)) . $qs, 307);
    exit;
}

/** Finds the stored page for a URL (with the filter variants the site had, e.g. ?faccion=alianza) or null. */
function sw_find_route(string $path): ?array {
    $routes = sw_data('routes')['routes'] ?? [];
    $keep = ['faccion', 'categoria'];
    $q = array_intersect_key($_GET, array_flip($keep));
    ksort($q);
    if ($q) {
        $key = $path . '?' . http_build_query($q);
        if (isset($routes[$key])) return $routes[$key];
    }
    return $routes[$path] ?? null;
}

function sw_render_page(string $path, string $locale): void {
    $meta = sw_data('routes');
    $rest = substr($path, 3) ?: '/';
    $route = sw_find_route($path);
    $status = 200;
    $dynamic = false;

    // Items edited in WordPress: /novedades/<slug> and /eventos/<slug>
    $detail = null;
    if (preg_match('#^/(novedades|eventos)/([a-z0-9-]+)$#', $rest, $m)) {
        $baseRoute = $meta['routes']['/' . $locale . '/' . $m[1]] ?? null;
        if ($baseRoute && is_readable(SW_DIR . '/pages/' . $baseRoute['f'])) {
            $base = file_get_contents(SW_DIR . '/pages/' . $baseRoute['f']);
            $detail = $m[1] === 'novedades' ? sw_news_detail($base, $locale, $m[2]) : sw_event_detail($base, $locale, $m[2]);
            $dynamic = true;
        }
    }

    if ($detail !== null) {
        $body = $detail['body'];
        $head = $detail['head'];
    } else {
        if ($route === null) {
            $route = $meta['routes']['404:' . $locale] ?? null;
            $status = 404;
            if ($route === null) return;
        }
        $file = SW_DIR . '/pages/' . $route['f'];
        if (!is_readable($file)) return;
        $body = file_get_contents($file);
        $head = $route['h'];

        if ($status === 200) {
            if ($rest === '/wikisphere' && isset($_GET['q'])) $body = sw_wiki_search_page($body, $locale);
            if ($rest === '/buscar') $body = sw_site_search_page($body, $locale);
            if ($rest === '/') { // home: news and events columns
                $body = sw_slot_replace($body, 'home-news', sw_home_news_inner($locale));
                $body = sw_slot_replace($body, 'home-events', sw_home_events_inner($locale));
                $dynamic = true;
            }
            if ($rest === '/novedades') { $body = sw_slot_replace($body, 'news-list', sw_news_list_inner($locale)); $dynamic = true; }
            if ($rest === '/eventos') { $body = sw_slot_replace($body, 'events-list', sw_events_list_inner($locale)); $dynamic = true; }
        }
        $body = sw_shop_decorate($body, $path, $locale);
    }

    status_header($status);
    nocache_headers();
    if ($status === 200 && !$dynamic) { header_remove('Cache-Control'); header('Cache-Control: public, max-age=0, must-revalidate'); }
    if (isset($_GET['sw_preview'])) header('X-Robots-Tag: noindex');
    header('Content-Type: text/html; charset=UTF-8');
    header('Vary: Accept-Language, Cookie');
    if (($_COOKIE['sw_locale'] ?? '') !== $locale) setcookie('sw_locale', $locale, ['expires' => time() + 31536000, 'path' => '/', 'samesite' => 'Lax']);
    if (str_contains($path, '/buscar') || str_contains($path, '/tienda/carrito') || str_contains($path, '/tienda/gracias')) $head .= "\n" . '<meta name="robots" content="noindex, follow"/>';

    $css = SW_URI . '/assets/app.css?v=' . SW_VERSION;
    $js = SW_URI . '/assets/sphere.js?v=' . SW_VERSION;
    $data = wp_json_encode(sw_client_data($locale), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP);

    echo sw_tokens('<!DOCTYPE html><html lang="' . $locale . '" class="' . $meta['htmlClass'] . '"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>'
        . '<link rel="stylesheet" href="' . $css . '"/>' . $head
        . '<link rel="manifest" href="/manifest.webmanifest"/><link rel="icon" href="/favicon.ico" sizes="48x48"/><link rel="icon" href="{{A}}/brand/logo.jpeg"/><link rel="apple-touch-icon" href="{{A}}/brand/logo.jpeg"/>'
        . '</head><body class="' . $meta['bodyClass'] . '">' . $body
        . '<script type="application/json" id="sw-data">' . $data . '</script><script src="' . $js . '" defer></script></body></html>');
    exit;
}
