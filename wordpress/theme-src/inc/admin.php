<?php
if (!defined('ABSPATH')) exit;

/* Ajustes > SphereWars: where contact messages are sent. Nothing else needs configuring from the panel in this version. */

add_action('admin_menu', function () {
    add_options_page('SphereWars', 'SphereWars', 'manage_options', 'spherewars', 'sw_settings_page');
});

add_action('admin_init', function () {
    register_setting('spherewars', 'sw_contact_to', [
        'type' => 'string',
        'sanitize_callback' => static fn($v) => is_email((string) $v) ? sanitize_email((string) $v) : '',
        'default' => '',
    ]);
});

function sw_settings_page(): void {
    if (!current_user_can('manage_options')) return;
    ?>
    <div class="wrap">
        <h1>SphereWars</h1>
        <form method="post" action="options.php">
            <?php settings_fields('spherewars'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="sw_contact_to">Correo que recibe el formulario de contacto</label></th>
                    <td>
                        <input name="sw_contact_to" id="sw_contact_to" type="email" class="regular-text" value="<?php echo esc_attr((string) get_option('sw_contact_to', '')); ?>" />
                        <p class="description">Si lo dejas vacío se usa el correo del administrador (<?php echo esc_html((string) get_option('admin_email')); ?>). No se muestra en la web.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
