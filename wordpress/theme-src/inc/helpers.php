<?php
if (!defined('ABSPATH')) exit;

/** JSON data file shipped with the theme (decoded once per request). */
function sw_data(string $name): array {
    static $cache = [];
    if (!isset($cache[$name])) {
        $f = SW_DIR . '/' . $name . '.json';
        $cache[$name] = is_readable($f) ? (json_decode(file_get_contents($f), true) ?: []) : [];
    }
    return $cache[$name];
}

/** Replaces the export tokens: {{A}} = public asset folder of the theme, {{S}} = this site's address. */
function sw_tokens(string $html): string {
    return str_replace(['{{A}}', '{{S}}'], [SW_URI . '/assets/public', rtrim(home_url(), '/')], $html);
}

function sw_h(string $s): string { return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

/** Lower-case and without accents, like the original site's search (so "dragon" finds "dragón"). */
function sw_norm(string $s): string {
    $s = mb_strtolower($s, 'UTF-8');
    if (class_exists('Normalizer')) {
        return preg_replace('/\p{Mn}/u', '', Normalizer::normalize($s, Normalizer::FORM_D)) ?? $s;
    }
    return strtr($s, [
        'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a', 'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e', 'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i',
        'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o', 'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u', 'ñ' => 'n', 'ç' => 'c',
    ]);
}

function sw_locale_from_path(string $path): ?string {
    return preg_match('#^/(es|en|ca)(?:/|$)#', $path, $m) ? $m[1] : null;
}

/** Client-side data block (menu labels, cart and form messages, endpoints). */
function sw_client_data(string $locale): array {
    $i18n = sw_data('data/i18n')[$locale] ?? [];
    return [
        'locale' => $locale,
        'assets' => SW_URI . '/assets/public',
        't' => $i18n,
        'ajax' => admin_url('admin-ajax.php'),
        'checkout' => admin_url('admin-post.php'),
        'cart' => sw_cart_config(),
    ];
}
