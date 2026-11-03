<?php
/**
 * SphereWars theme. Serves the public website (pages exported from the original site, same markup/CSS/texts) and adds the
 * server-side parts the original ran on Node: language redirect, contact form, wiki search and (phase 2) WooCommerce checkout.
 */
if (!defined('ABSPATH')) exit;

define('SW_VERSION', '1.0.0');
define('SW_DIR', get_template_directory());
define('SW_URI', get_template_directory_uri());
const SW_LOCALES = ['es', 'en', 'ca'];

require_once SW_DIR . '/inc/helpers.php';
require_once SW_DIR . '/inc/router.php';
require_once SW_DIR . '/inc/content.php';
require_once SW_DIR . '/inc/render.php';
require_once SW_DIR . '/inc/search.php';
require_once SW_DIR . '/inc/contact.php';
require_once SW_DIR . '/inc/shop.php';
require_once SW_DIR . '/inc/admin.php';

add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('woocommerce');
});
