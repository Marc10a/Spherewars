<?php if (!defined('ABSPATH')) exit; ?>
<?php if (function_exists('is_wc_endpoint_url') && is_wc_endpoint_url('order-received')) : ?><script>try{localStorage.removeItem("sw_cart_v1")}catch(e){}</script><?php endif; ?>
<?php wp_footer(); ?>
</body>
</html>
