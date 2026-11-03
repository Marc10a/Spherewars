<?php
if (!defined('ABSPATH')) exit;

/*
 * Editable content: news (Noticias) and events (Eventos) as WordPress content types, with their own fields.
 * Status flow is WordPress': Borrador -> Pendiente -> Publicado (or Programado). Only published items appear on the site;
 * an editor can preview a draft with the "Vista previa" button.
 */

const SW_KINDS = ['demo', 'tournament', 'special', 'community', 'fair'];

add_action('init', function () {
    register_post_type('sw_news', [
        'labels' => ['name' => 'Noticias', 'singular_name' => 'Noticia', 'add_new' => 'Añadir noticia', 'add_new_item' => 'Añadir noticia', 'edit_item' => 'Editar noticia', 'all_items' => 'Todas las noticias', 'menu_name' => 'Noticias SphereWars'],
        'public' => false, 'show_ui' => true, 'show_in_menu' => true, 'show_in_rest' => true, 'exclude_from_search' => true,
        'menu_icon' => 'dashicons-megaphone', 'menu_position' => 21, 'rewrite' => false, 'has_archive' => false,
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'revisions'],
    ]);
    register_post_type('sw_event', [
        'labels' => ['name' => 'Eventos', 'singular_name' => 'Evento', 'add_new' => 'Añadir evento', 'add_new_item' => 'Añadir evento', 'edit_item' => 'Editar evento', 'all_items' => 'Todos los eventos', 'menu_name' => 'Eventos SphereWars'],
        'public' => false, 'show_ui' => true, 'show_in_menu' => true, 'show_in_rest' => true, 'exclude_from_search' => true,
        'menu_icon' => 'dashicons-calendar-alt', 'menu_position' => 22, 'rewrite' => false, 'has_archive' => false,
        'supports' => ['title', 'editor', 'thumbnail', 'revisions'],
    ]);
});

/** Links of the admin ("Ver", "Vista previa") point to the public page of the item. */
add_filter('post_type_link', 'sw_item_link', 10, 2);
add_filter('preview_post_link', function ($link, $post) { return in_array($post->post_type, ['sw_news', 'sw_event'], true) ? sw_item_link('', $post, true) : $link; }, 10, 2);
function sw_item_link($link, $post, bool $preview = false) {
    if (!$post || !in_array($post->post_type, ['sw_news', 'sw_event'], true)) return $link;
    $lang = get_post_meta($post->ID, 'sw_lang', true);
    $lang = in_array($lang, SW_LOCALES, true) ? $lang : 'es';
    $slug = $post->post_name !== '' ? $post->post_name : sanitize_title($post->post_title ?: (string) $post->ID);
    $url = home_url('/' . $lang . ($post->post_type === 'sw_news' ? '/novedades/' : '/eventos/') . $slug);
    return $preview || $post->post_status !== 'publish' ? add_query_arg('sw_preview', $post->ID, $url) : $url;
}

/* ---------- meta boxes ---------- */

const SW_NEWS_FIELDS = ['sw_lang', 'sw_category', 'sw_seo_title', 'sw_seo_desc'];
const SW_EVENT_FIELDS = ['sw_lang', 'sw_kind', 'sw_starts', 'sw_ends', 'sw_organizer', 'sw_city', 'sw_address', 'sw_format', 'sw_requirements', 'sw_prizes', 'sw_fee', 'sw_capacity', 'sw_reg_url', 'sw_seo_title', 'sw_seo_desc'];

add_action('add_meta_boxes', function () {
    add_meta_box('sw_news_box', 'Datos de la noticia', 'sw_box_news', 'sw_news', 'normal', 'high');
    add_meta_box('sw_event_box', 'Datos del evento', 'sw_box_event', 'sw_event', 'normal', 'high');
});

function sw_field(string $name, string $label, int $post_id, string $type = 'text', string $help = ''): void {
    $v = (string) get_post_meta($post_id, $name, true);
    echo '<p><label for="' . esc_attr($name) . '"><strong>' . esc_html($label) . '</strong></label><br>';
    echo '<input class="widefat" type="' . esc_attr($type) . '" id="' . esc_attr($name) . '" name="' . esc_attr($name) . '" value="' . esc_attr($v) . '"' . ($type === 'number' ? ' min="0" step="any"' : '') . '>';
    if ($help) echo '<span class="description">' . esc_html($help) . '</span>';
    echo '</p>';
}
function sw_lang_select(int $post_id): void {
    $cur = (string) get_post_meta($post_id, 'sw_lang', true) ?: 'all';
    echo '<p><label for="sw_lang"><strong>Idioma en el que se muestra</strong></label><br><select name="sw_lang" id="sw_lang">';
    foreach (['all' => 'Todos los idiomas', 'es' => 'Solo español', 'en' => 'Solo inglés', 'ca' => 'Solo catalán'] as $k => $l) {
        echo '<option value="' . esc_attr($k) . '"' . selected($cur, $k, false) . '>' . esc_html($l) . '</option>';
    }
    echo '</select></p>';
}
function sw_seo_fields(int $id): void {
    echo '<hr><p><em>SEO (opcional, no se muestra en pantalla): lo que aparece en Google y al compartir.</em></p>';
    sw_field('sw_seo_title', 'Título SEO', $id, 'text', 'Si lo dejas vacío se usa el título.');
    sw_field('sw_seo_desc', 'Descripción SEO', $id, 'text', 'Máximo 160 caracteres recomendados.');
}

function sw_box_news(WP_Post $post): void {
    wp_nonce_field('sw_save_' . $post->post_type, 'sw_nonce');
    sw_lang_select($post->ID);
    sw_field('sw_category', 'Categoría (se ve sobre el título, p. ej. «Novedades»)', $post->ID);
    sw_seo_fields($post->ID);
}

function sw_box_event(WP_Post $post): void {
    wp_nonce_field('sw_save_' . $post->post_type, 'sw_nonce');
    $kind = (string) get_post_meta($post->ID, 'sw_kind', true) ?: 'demo';
    $names = sw_data('data/i18n')['es']['events']['kinds'] ?? [];
    echo '<p><label for="sw_kind"><strong>Tipo</strong></label><br><select name="sw_kind" id="sw_kind">';
    foreach (SW_KINDS as $k) echo '<option value="' . esc_attr($k) . '"' . selected($kind, $k, false) . '>' . esc_html($names[$k] ?? $k) . '</option>';
    echo '</select></p>';
    sw_lang_select($post->ID);
    sw_field('sw_starts', 'Empieza (obligatorio)', $post->ID, 'datetime-local');
    sw_field('sw_ends', 'Termina', $post->ID, 'datetime-local');
    sw_field('sw_organizer', 'Organiza', $post->ID);
    sw_field('sw_city', 'Ciudad', $post->ID);
    sw_field('sw_address', 'Dirección', $post->ID);
    sw_field('sw_format', 'Formato', $post->ID);
    sw_field('sw_requirements', 'Requisitos', $post->ID);
    sw_field('sw_prizes', 'Premios', $post->ID);
    sw_field('sw_fee', 'Precio de inscripción en € (vacío = no se muestra)', $post->ID, 'number');
    sw_field('sw_capacity', 'Plazas (vacío = no se muestra)', $post->ID, 'number');
    sw_field('sw_reg_url', 'Enlace de inscripción (https)', $post->ID, 'url');
    echo '<p class="description">La descripción larga del evento es el texto del editor de arriba.</p>';
    sw_seo_fields($post->ID);
}

add_action('save_post', function (int $post_id, WP_Post $post) {
    if (!in_array($post->post_type, ['sw_news', 'sw_event'], true)) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!isset($_POST['sw_nonce']) || !wp_verify_nonce(wp_unslash($_POST['sw_nonce']), 'sw_save_' . $post->post_type)) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $fields = $post->post_type === 'sw_news' ? SW_NEWS_FIELDS : SW_EVENT_FIELDS;
    foreach ($fields as $f) {
        $raw = isset($_POST[$f]) ? trim((string) wp_unslash($_POST[$f])) : '';
        switch ($f) {
            case 'sw_lang': $v = in_array($raw, ['all', 'es', 'en', 'ca'], true) ? $raw : 'all'; break;
            case 'sw_kind': $v = in_array($raw, SW_KINDS, true) ? $raw : 'demo'; break;
            case 'sw_starts': case 'sw_ends': $v = preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/', $raw) ? $raw : ''; break;
            case 'sw_fee': $v = is_numeric($raw) && $raw >= 0 ? (string) round((float) $raw, 2) : ''; break;
            case 'sw_capacity': $v = ctype_digit($raw) && (int) $raw > 0 ? $raw : ''; break;
            case 'sw_reg_url': $v = (string) esc_url_raw($raw, ['https']); break;
            default: $v = sanitize_text_field($raw);
        }
        if ($v === '') delete_post_meta($post_id, $f); else update_post_meta($post_id, $f, $v);
    }
}, 10, 2);

/* ---------- queries ---------- */

function sw_lang_meta_query(string $locale): array {
    return ['relation' => 'OR',
        ['key' => 'sw_lang', 'value' => [$locale, 'all'], 'compare' => 'IN'],
        ['key' => 'sw_lang', 'compare' => 'NOT EXISTS']];
}

/** True when the visitor may see unpublished items of the preview link (an editor logged in). */
function sw_can_preview(): ?int {
    $id = isset($_GET['sw_preview']) ? (int) $_GET['sw_preview'] : 0;
    return $id > 0 && current_user_can('edit_post', $id) ? $id : null;
}

function sw_norm_image(int $post_id): ?array {
    $url = get_the_post_thumbnail_url($post_id, 'full');
    if (!$url || !str_starts_with($url, 'http')) return null;
    return ['url' => $url, 'alt' => (string) get_post_meta(get_post_thumbnail_id($post_id), '_wp_attachment_image_alt', true)];
}

function sw_norm_news(WP_Post $p): array {
    $excerpt = trim(wp_strip_all_tags($p->post_excerpt !== '' ? $p->post_excerpt : $p->post_content));
    return [
        'id' => $p->ID, 'slug' => $p->post_name ?: sanitize_title($p->post_title), 'title' => get_the_title($p),
        'category' => (string) get_post_meta($p->ID, 'sw_category', true), 'publish_at' => get_post_time('c', true, $p),
        'excerpt' => $excerpt, 'html' => wp_kses_post(apply_filters('the_content', $p->post_content)),
        'image' => sw_norm_image($p->ID), 'status' => $p->post_status,
        'seo' => ['title' => (string) get_post_meta($p->ID, 'sw_seo_title', true), 'description' => (string) get_post_meta($p->ID, 'sw_seo_desc', true)],
    ];
}

function sw_news_list(string $locale, int $limit = 50): array {
    $q = new WP_Query(['post_type' => 'sw_news', 'post_status' => 'publish', 'posts_per_page' => $limit, 'orderby' => 'date', 'order' => 'DESC', 'meta_query' => sw_lang_meta_query($locale), 'no_found_rows' => true]);
    return array_map('sw_norm_news', $q->posts);
}

function sw_news_get(string $locale, string $slug): ?array {
    $preview = sw_can_preview();
    $q = new WP_Query(['post_type' => 'sw_news', 'name' => $slug, 'post_status' => $preview ? 'any' : 'publish', 'posts_per_page' => 1, 'meta_query' => sw_lang_meta_query($locale), 'no_found_rows' => true]);
    if (!$q->posts) return null;
    $p = $q->posts[0];
    if ($p->post_status !== 'publish' && $preview !== $p->ID) return null;
    return sw_norm_news($p);
}

function sw_norm_event(WP_Post $p): array {
    $m = static fn(string $k) => (string) get_post_meta($p->ID, $k, true);
    $tz = wp_timezone();
    $iso = static function (string $local) use ($tz) { return $local === '' ? null : (new DateTimeImmutable($local, $tz))->format('c'); };
    $fee = $m('sw_fee');
    return [
        'id' => $p->ID, 'slug' => $p->post_name ?: sanitize_title($p->post_title), 'title' => get_the_title($p), 'kind' => in_array($m('sw_kind'), SW_KINDS, true) ? $m('sw_kind') : 'demo',
        'starts_at' => $iso($m('sw_starts')), 'ends_at' => $iso($m('sw_ends')),
        'organizer' => $m('sw_organizer') ?: null, 'city' => $m('sw_city') ?: null, 'address' => $m('sw_address') ?: null, 'format' => $m('sw_format') ?: null,
        'requirements' => $m('sw_requirements') ?: null, 'prizes' => $m('sw_prizes') ?: null,
        'fee_cents' => $fee !== '' ? (int) round((float) $fee * 100) : null, 'capacity' => $m('sw_capacity') !== '' ? (int) $m('sw_capacity') : null,
        'registration_url' => $m('sw_reg_url') ?: null,
        'html' => wp_kses_post(apply_filters('the_content', $p->post_content)), 'image' => sw_norm_image($p->ID), 'status' => $p->post_status,
        'seo' => ['title' => $m('sw_seo_title'), 'description' => $m('sw_seo_desc')],
    ];
}

/** @return array[] events of a language, soonest first (upcoming) or latest first (past), optionally by city and type. */
function sw_events_list(string $locale, bool $past = false, ?string $city = null, ?string $kind = null): array {
    $now = (new DateTimeImmutable('now', wp_timezone()))->format('Y-m-d\TH:i');
    $meta = [sw_lang_meta_query($locale), ['key' => 'sw_starts', 'value' => $now, 'compare' => $past ? '<' : '>=', 'type' => 'CHAR']];
    if ($city) $meta[] = ['key' => 'sw_city', 'value' => $city];
    if ($kind && in_array($kind, SW_KINDS, true)) $meta[] = ['key' => 'sw_kind', 'value' => $kind];
    $q = new WP_Query(['post_type' => 'sw_event', 'post_status' => 'publish', 'posts_per_page' => 100, 'meta_key' => 'sw_starts', 'orderby' => 'meta_value', 'order' => $past ? 'DESC' : 'ASC', 'meta_query' => array_merge(['relation' => 'AND'], $meta), 'no_found_rows' => true]);
    return array_map('sw_norm_event', $q->posts);
}

function sw_event_get(string $locale, string $slug): ?array {
    $preview = sw_can_preview();
    $q = new WP_Query(['post_type' => 'sw_event', 'name' => $slug, 'post_status' => $preview ? 'any' : 'publish', 'posts_per_page' => 1, 'meta_query' => sw_lang_meta_query($locale), 'no_found_rows' => true]);
    if (!$q->posts) return null;
    $p = $q->posts[0];
    if ($p->post_status !== 'publish' && $preview !== $p->ID) return null;
    return sw_norm_event($p);
}

/** Published news and events for the sitemap (the stored sitemap only knows the fixed pages). */
function sw_sitemap_extra(): string {
    $xml = '';
    $home = rtrim(home_url(), '/');
    foreach (['sw_news' => 'novedades', 'sw_event' => 'eventos'] as $type => $seg) {
        foreach (get_posts(['post_type' => $type, 'post_status' => 'publish', 'numberposts' => 500, 'no_found_rows' => true]) as $p) {
            $lang = (string) get_post_meta($p->ID, 'sw_lang', true);
            $langs = in_array($lang, SW_LOCALES, true) ? [$lang] : SW_LOCALES;
            foreach ($langs as $l) {
                $xml .= '<url><loc>' . esc_url($home . '/' . $l . '/' . $seg . '/' . $p->post_name) . '</loc><lastmod>' . esc_html(get_post_modified_time('c', true, $p)) . '</lastmod></url>';
            }
        }
    }
    return $xml;
}
