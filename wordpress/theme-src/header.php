<?php
/** Shell for WordPress/WooCommerce screens that are not SphereWars pages (payment, order received...). */
if (!defined('ABSPATH')) exit;
$meta = sw_data('routes');
?><!DOCTYPE html>
<html <?php language_attributes(); ?> class="<?php echo esc_attr($meta['htmlClass'] ?? ''); ?>">
<head>
<meta charset="<?php bloginfo('charset'); ?>"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="<?php echo esc_url(SW_URI . '/assets/app.css?v=' . SW_VERSION); ?>"/>
<link rel="stylesheet" href="<?php echo esc_url(SW_URI . '/assets/woo.css?v=' . SW_VERSION); ?>"/>
<?php wp_head(); ?>
</head>
<body class="<?php echo esc_attr($meta['bodyClass'] ?? ''); ?>">
<header class="border-b border-gold/20 bg-abyss/90"><nav class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
  <a class="font-display text-xl tracking-[0.2em] text-gold" href="<?php echo esc_url(home_url('/')); ?>">SPHEREWARS</a>
</nav></header>
