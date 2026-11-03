<?php
if (!defined('ABSPATH')) exit;

/*
 * Shop. With WooCommerce active, WooCommerce is the catalogue: price, stock, photos, shipping zones, orders and payment.
 * Without it the shop stays as in the original site (prices from prices.json, checkout closed).
 *
 * A WooCommerce product is linked to a miniature of the wiki by its "Miniatura de la wiki" field (or, if empty, because its
 * slug equals the end of the wiki page, e.g. "satanor"). The catalogue pages (photo + name) do not change; the product page
 * gets its price, stock, buttons and photos from WooCommerce.
 */

const SW_FACTION_FOLDERS = [
    'adeptos-de-malesur' => 'personajes/adeptos-de-malesur/', 'manadas-de-urueh' => 'personajes/mandas-de-urueh/',
    'vastagos-de-kurgan' => 'personajes/vastagos-de-kurgan/', 'alianza' => 'personajes/alianza/',
];

function sw_woo_on(): bool { return class_exists('WooCommerce') && function_exists('wc_get_products'); }

/** The shop key of a product page: the wiki page of the miniature, or packs/<faction> for the Starter Pack. */
function sw_wiki_slug_for(string $faction, string $mini): ?string {
    $folder = SW_FACTION_FOLDERS[$faction] ?? null;
    if (!$folder) return null;
    if ($mini === 'starter-pack') {
        $key = 'packs/' . $faction;
        foreach (sw_data('data/shop-index')['products'] ?? [] as $p) if ($p['slug'] === $key) return $key;
        return null;
    }
    $slug = $folder . $mini;
    foreach (sw_wiki_index() as $p) if ($p['slug'] === $slug) return $slug;
    return null;
}

/** Published WooCommerce products indexed by the wiki page they sell. */
function sw_woo_index(): array {
    static $idx = null;
    if ($idx !== null) return $idx;
    $idx = ['wiki' => [], 'last' => []];
    foreach (wc_get_products(['status' => 'publish', 'limit' => -1]) as $p) {
        $w = (string) $p->get_meta('sw_wiki_slug');
        if ($w !== '') $idx['wiki'][$w] = $p; else $idx['last'][$p->get_slug()] = $p;
    }
    return $idx;
}

function sw_woo_product(string $wikiSlug): ?WC_Product {
    $wikiSlug = (sw_data('data/shop-index')['aliases'] ?? [])[$wikiSlug] ?? $wikiSlug; // the Cohort of Postulants is one product for two pages
    $i = sw_woo_index();
    return $i['wiki'][$wikiSlug] ?? $i['last'][basename($wikiSlug)] ?? null;
}

function sw_woo_price_cents(WC_Product $p): ?int {
    $v = wc_get_price_to_display($p);
    return is_numeric($v) && (float) $v > 0 ? (int) round((float) $v * 100) : null;
}

/** null = unlimited. */
function sw_woo_stock(WC_Product $p): ?int {
    if ($p->managing_stock()) return max(0, (int) $p->get_stock_quantity());
    return $p->is_in_stock() ? null : 0;
}

/* ---------- shipping zones (same model the cart already uses) ---------- */

function sw_woo_zones(): array {
    static $z = null;
    if ($z !== null) return $z;
    $z = [];
    if (!sw_woo_on()) return $z;
    foreach (WC_Shipping_Zones::get_zones() as $row) {
        $zone = new WC_Shipping_Zone($row['id']);
        $countries = [];
        foreach ($zone->get_zone_locations() as $loc) if ($loc->type === 'country') $countries[] = strtoupper($loc->code);
        $flat = null; $free = null;
        foreach ($zone->get_shipping_methods(true) as $m) {
            if ($m->id === 'flat_rate' && $flat === null) {
                $cost = trim((string) $m->get_option('cost'));
                if (preg_match('/^\d+([.,]\d{1,4})?$/', $cost)) $flat = ['m' => $m, 'cents' => (int) round((float) str_replace(',', '.', $cost) * 100)];
            }
            if ($m->id === 'free_shipping' && $free === null) {
                $req = (string) $m->get_option('requires');
                if ($req === '') $free = ['m' => $m, 'over' => 0];
                elseif (in_array($req, ['min_amount', 'either'], true) && is_numeric($m->get_option('min_amount'))) $free = ['m' => $m, 'over' => (int) round((float) $m->get_option('min_amount') * 100)];
            }
        }
        $price = $free && $free['over'] === 0 ? 0 : ($flat['cents'] ?? null);
        if ($price === null || !$countries) continue; // a rate Woo has that we cannot reproduce exactly is left out, not guessed
        $z[] = ['id' => (string) $row['id'], 'label' => mb_substr((string) $zone->get_zone_name(), 0, 80), 'countries' => array_values(array_unique($countries)),
            'price_cents' => $price, 'free_over_cents' => $free && $free['over'] > 0 ? $free['over'] : null, '_flat' => $flat['m'] ?? null, '_free' => $free['m'] ?? null];
    }
    return $z;
}

/** Cart settings for the browser: shipping zones and whether checkout is open. */
function sw_cart_config(): array {
    if (!sw_woo_on()) return ['canCheckout' => false, 'settings' => ['enabled' => false, 'currency' => 'EUR', 'zones' => []]];
    $zones = array_map(static fn($z) => array_diff_key($z, ['_flat' => 1, '_free' => 1]), sw_woo_zones());
    $gateways = array_filter(WC()->payment_gateways()->payment_gateways(), static fn($g) => $g->enabled === 'yes');
    return ['canCheckout' => $zones !== [] && $gateways !== [], 'settings' => ['enabled' => $zones !== [], 'currency' => 'EUR', 'zones' => $zones]];
}

/* ---------- product page ---------- */

/** Adapts a stored shop page at request time. Only product pages change (price, stock, buttons and photos from WooCommerce). */
function sw_shop_decorate(string $html, string $path, string $locale): string {
    if (!sw_woo_on() || !preg_match('#^/(?:es|en|ca)/tienda/([a-z-]+)/([a-z0-9-]+)$#', $path, $m)) return $html;
    $wiki = sw_wiki_slug_for($m[1], $m[2]);
    if (!$wiki) return $html;
    $t = sw_data('data/i18n')[$locale]['shop'];
    $product = sw_woo_product($wiki);
    $url = '/' . $locale . '/tienda/' . $m[1] . '/' . $m[2];

    // photos: WooCommerce gallery first, then the official wiki ones already on the page
    $wiki_photos = sw_gallery_slides($html);
    $woo_photos = [];
    if ($product) {
        $ids = array_filter(array_merge([$product->get_image_id()], $product->get_gallery_image_ids()));
        foreach ($ids as $id) {
            $src = wp_get_attachment_image_url((int) $id, 'full');
            if ($src) $woo_photos[] = ['src' => $src, 'alt' => $product->get_name(), 'cls' => 'object-contain '];
        }
    }
    if ($woo_photos) $html = sw_slot_replace($html, 'gallery', sw_gallery_html(array_merge($woo_photos, $wiki_photos), $locale));

    $cents = $product ? sw_woo_price_cents($product) : null;
    $buy = '';
    if ($product && $cents) {
        $stock = sw_woo_stock($product);
        $first = ($woo_photos[0]['src'] ?? ($wiki_photos[0]['src'] ?? null));
        $item = ['id' => (string) $product->get_id(), 'slug' => $product->get_slug(), 'name' => $product->get_name(), 'price_cents' => $cents, 'image' => $first, 'stock' => $stock, 'url' => $url];
        $box = $stock === 0
            ? '<p class="inline-block border border-stone/40 px-5 py-3 text-xs uppercase tracking-[0.2em] text-stone">' . sw_h($t['soldOut']) . '</p>'
            : str_replace('{{ITEM}}', sw_h(wp_json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)), (string) @file_get_contents(SW_DIR . '/data/buybox-' . $locale . '.html'));
        $buy = '<p class="font-display text-4xl text-gold">' . sw_h(sw_money($cents, $locale)) . '</p><p class="mt-1 text-xs text-stone">' . sw_h($t['taxIncluded']) . '</p><div class="mt-6">' . $box . '</div>';
        if (!sw_cart_config()['canCheckout']) $buy .= '<p role="note" class="mt-4 border border-dashed border-gold/40 p-3 text-sm text-stone">' . sw_h($t['closed']) . '</p>';
        $html .= '<script type="application/ld+json">' . wp_json_encode([
            '@context' => 'https://schema.org', '@type' => 'Product', 'name' => $product->get_name(), 'url' => home_url($url), 'brand' => ['@type' => 'Brand', 'name' => 'SphereWars'],
            'image' => array_map(static fn($p) => str_starts_with($p['src'], 'http') ? $p['src'] : '{{A}}' . $p['src'], array_merge($woo_photos, $wiki_photos)),
            'offers' => ['@type' => 'Offer', 'url' => home_url($url), 'priceCurrency' => 'EUR', 'price' => number_format($cents / 100, 2, '.', ''),
                'availability' => $stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . '</script>';
    } else {
        $buy = '<div role="status"><p class="inline-block border border-dashed border-stone/50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-stone">' . sw_h($t['unavailable']) . '</p>'
            . '<p class="mt-3 text-sm text-stone">' . sw_h($t['unavailableNote']) . ' ' . sw_h($t['pricePending']) . '.</p>'
            . '<button type="button" disabled class="mt-6 w-full cursor-not-allowed bg-gold/30 px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-abyss/70">' . sw_h($t['buyNow']) . '</button></div>';
    }
    return sw_slot_replace($html, 'buy', $buy);
}

/** The photos already in the stored gallery: [src, alt, img class]. */
function sw_gallery_slides(string $html): array {
    $out = [];
    if (preg_match_all('#<li class="relative aspect-\[4/5\][^>]*>.*?<img alt="([^"]*)"[^>]*? class="([^"]*)"[^>]*? src="([^"]+)"#s', $html, $mm, PREG_SET_ORDER)) {
        foreach ($mm as $x) $out[] = ['src' => $x[3], 'alt' => html_entity_decode($x[1]), 'cls' => $x[2]];
    }
    return $out;
}

const SW_ICONS = [
    'left' => '<path d="m15 18-6-6 6-6"></path>', 'right' => '<path d="m9 18 6-6-6-6"></path>',
    'max' => '<polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" x2="14" y1="3" y2="10"></line><line x1="3" x2="10" y1="21" y2="14"></line>',
];
function sw_icon(string $n, int $size): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . SW_ICONS[$n] . '</svg>';
}

/** Product gallery (same markup as the original) from a list of photos. One photo = no controls. */
function sw_gallery_html(array $photos, string $locale): string {
    $t = sw_data('data/i18n')[$locale]['shop'];
    $n = count($photos);
    $say = static fn(int $i) => str_replace(['{n}', '{total}'], [(string) ($i + 1), (string) $n], $t['photoOf']);
    $img = 'position:absolute;height:100%;width:100%;left:0;top:0;right:0;bottom:0;color:transparent';
    $slides = ''; $thumbs = '';
    foreach ($photos as $i => $p) {
        $lazy = $i === 0 ? '' : ' loading="lazy"';
        $slides .= '<li class="relative aspect-[4/5] w-full shrink-0 snap-center" aria-label="' . sw_h($say($i)) . '"><button type="button" aria-label="' . sw_h($t['zoomIn'] . ': ' . $p['alt']) . '" class="absolute inset-0 cursor-zoom-in">'
            . '<img alt="' . sw_h($p['alt']) . '"' . $lazy . ' decoding="async" class="' . sw_h($p['cls']) . '" style="' . $img . '" sizes="(min-width:1024px) 50vw, 100vw" src="' . sw_h($p['src']) . '"/></button></li>';
        $thumbs .= '<li class="shrink-0"><button type="button" aria-label="' . sw_h($say($i)) . '" aria-current="' . ($i === 0 ? 'true' : 'false') . '" class="relative block h-16 w-14 border bg-abyss transition sm:h-20 sm:w-16 ' . ($i === 0 ? 'border-gold' : 'border-gold/20 opacity-70 hover:opacity-100') . '">'
            . '<img alt="" loading="lazy" decoding="async" class="object-contain" style="' . $img . '" sizes="64px" src="' . sw_h($p['src']) . '"/></button></li>';
    }
    $arrows = $n > 1
        ? '<button type="button" aria-label="' . sw_h($t['prevPhoto']) . '" class="absolute left-2 top-1/2 -translate-y-1/2 bg-abyss/70 p-2 text-gold hover:bg-gold hover:text-abyss">' . sw_icon('left', 22) . '</button>'
        . '<button type="button" aria-label="' . sw_h($t['nextPhoto']) . '" class="absolute right-2 top-1/2 -translate-y-1/2 bg-abyss/70 p-2 text-gold hover:bg-gold hover:text-abyss">' . sw_icon('right', 22) . '</button>'
        . '<p class="absolute bottom-2 left-1/2 -translate-x-1/2 bg-abyss/70 px-3 py-1 text-xs tracking-widest text-ivory" aria-live="polite">1 / ' . $n . '</p>' : '';
    return '<div><div class="relative border border-accent/30 bg-abyss" role="group" aria-roledescription="carousel" aria-label="' . sw_h($t['gallery']) . '">'
        . '<ul class="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&amp;::-webkit-scrollbar]:hidden">' . $slides . '</ul>'
        . '<span class="pointer-events-none absolute right-3 top-3 bg-abyss/70 p-2 text-gold">' . sw_icon('max', 16) . '</span>' . $arrows . '</div>'
        . ($n > 1 ? '<ul class="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">' . $thumbs . '</ul>' : '') . '</div>';
}

/* ---------- admin: link a product with its wiki miniature ---------- */

add_action('woocommerce_product_options_general_product_data', function () {
    $opts = ['' => '— ninguna (se enlaza por el nombre del producto) —'];
    foreach (sw_wiki_index() as $p) if ($p['category'] === 'personajes') $opts[$p['slug']] = $p['title'] . '  (' . explode('/', $p['slug'])[1] . ')';
    foreach (sw_data('data/shop-index')['products'] ?? [] as $p) if (str_starts_with($p['slug'], 'packs/')) $opts[$p['slug']] = $p['title'];
    woocommerce_wp_select(['id' => 'sw_wiki_slug', 'label' => 'Miniatura de la wiki', 'options' => $opts, 'desc_tip' => true,
        'description' => 'Elige a qué miniatura de la web corresponde este producto: su ficha mostrará el precio, el stock y las fotos de aquí.']);
});
add_action('woocommerce_process_product_meta', function ($post_id) {
    $v = isset($_POST['sw_wiki_slug']) ? sanitize_text_field(wp_unslash($_POST['sw_wiki_slug'])) : '';
    $known = array_merge(array_column(sw_wiki_index(), 'slug'), array_column(sw_data('data/shop-index')['products'] ?? [], 'slug'));
    $ok = $v !== '' && preg_match('#^(personajes|packs)/[a-z0-9-]+(/[a-z0-9-]+)?$#', $v) && in_array($v, $known, true);
    if ($ok) update_post_meta($post_id, 'sw_wiki_slug', $v); else delete_post_meta($post_id, 'sw_wiki_slug');
});

/* ---------- checkout ---------- */

add_action('admin_post_nopriv_sw_checkout', 'sw_checkout');
add_action('admin_post_sw_checkout', 'sw_checkout');

/**
 * Cart form -> WooCommerce order -> WooCommerce payment page. The browser only sends product ids, quantities and a country:
 * prices, stock, shipping and totals are read again from WooCommerce here.
 */
function sw_checkout(): void {
    $loc = in_array($_POST['locale'] ?? '', SW_LOCALES, true) ? $_POST['locale'] : 'es';
    $back = static function (string $code) use ($loc): void { wp_safe_redirect(home_url('/' . $loc . '/tienda/carrito?e=' . $code)); exit; };

    if (!sw_woo_on() || !sw_cart_config()['canCheckout']) $back('disabled');
    $country = strtoupper((string) ($_POST['country'] ?? ''));
    if (!preg_match('/^[A-Z]{2}$/', $country)) $back('bad_country');
    $cart = json_decode((string) wp_unslash($_POST['cart'] ?? ''), true);
    if (!is_array($cart) || !$cart) $back('empty');
    if (count($cart) > 30) $back('too_many');

    $ipKey = 'sw_co_' . substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . wp_salt()), 0, 24); // 20 attempts per hour per visitor
    $tries = (int) get_transient($ipKey);
    if ($tries >= 20) $back('generic');
    set_transient($ipKey, $tries + 1, HOUR_IN_SECONDS);

    $lines = []; $subtotal = 0;
    foreach ($cart as $row) {
        $id = (string) ($row['id'] ?? ''); $qty = (int) ($row['qty'] ?? 0);
        if (!ctype_digit($id)) $back('generic');
        if ($qty < 1 || $qty > 20) $back('bad_qty');
        $p = wc_get_product((int) $id);
        $cents = $p ? sw_woo_price_cents($p) : null;
        if (!$p || $p->get_status() !== 'publish' || !$cents) $back('unavailable');
        $stock = sw_woo_stock($p);
        if ($stock !== null && $qty > $stock) $back('out_of_stock');
        $lines[$p->get_id()] = ['p' => $p, 'qty' => ($lines[$p->get_id()]['qty'] ?? 0) + $qty, 'cents' => $cents];
    }
    foreach ($lines as $l) { $stock = sw_woo_stock($l['p']); if ($stock !== null && $l['qty'] > $stock) $back('out_of_stock'); $subtotal += $l['cents'] * $l['qty']; }

    $zone = null;
    foreach (sw_woo_zones() as $z) if (in_array($country, $z['countries'], true)) { $zone = $z; break; }
    if (!$zone) $back('no_zone');
    $free = $zone['free_over_cents'] !== null ? $subtotal >= $zone['free_over_cents'] : $zone['price_cents'] === 0;
    $shipping = $free ? 0 : $zone['price_cents'];
    $method = $shipping === 0 && $zone['_free'] ? $zone['_free'] : ($zone['_flat'] ?? $zone['_free']);

    $order = wc_create_order(['status' => 'pending']);
    if (is_wp_error($order)) $back('generic');
    foreach ($lines as $l) $order->add_product($l['p'], $l['qty']);
    $order->set_address(['country' => $country], 'billing');
    $order->set_address(['country' => $country], 'shipping');
    $item = new WC_Order_Item_Shipping();
    $item->set_method_title($method->get_title()); $item->set_method_id($method->id); $item->set_instance_id($method->get_instance_id());
    $item->set_total(number_format($shipping / 100, 2, '.', ''));
    $order->add_item($item);
    $order->calculate_totals();
    $order->update_meta_data('sw_locale', $loc);
    $order->save();

    wp_safe_redirect($order->get_checkout_payment_url());
    exit;
}
