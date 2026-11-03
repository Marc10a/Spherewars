<?php
/**
 * Fallback template. Every SphereWars page is served by inc/router.php before WordPress reaches this file; it only runs for
 * WordPress' own screens that have no SphereWars page (for example a WooCommerce payment page), which get the site's look.
 */
if (!defined('ABSPATH')) exit;
get_header();
?>
<main id="main" class="sw-woo mx-auto max-w-4xl px-4 py-12 text-ivory/90">
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
  <h1 class="font-display text-3xl text-ivory md:text-5xl"><?php the_title(); ?></h1>
  <hr class="rune-divider my-8"/>
  <div><?php the_content(); ?></div>
<?php endwhile; else : ?>
  <h1 class="font-display text-3xl text-ivory md:text-5xl">404</h1>
<?php endif; ?>
</main>
<?php get_footer(); ?>
