<?php
if (!defined('ABSPATH')) exit;

/* Contact form (same rules as the original): honeypot, minimum fill time, validation, 3 messages per sender per hour. Sent with wp_mail. */

const SW_SUBJECTS = ['general', 'shop', 'events', 'press', 'other'];
const SW_MIN_FILL_MS = 2500;
const SW_MAX_FORM_AGE_MS = 6 * 3600 * 1000;
const SW_RATE_WINDOW = 3600;
const SW_RATE_MAX = 3;

function sw_clean($s, int $max): string {
    $s = preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', '', (string) $s) ?? '';
    $s = preg_replace('/\r\n?/', "\n", $s) ?? '';
    return mb_substr(trim($s), 0, $max);
}

/** @return array{ok:bool,error?:string,data?:array} */
function sw_validate_contact(array $raw, int $nowMs): array {
    if (strlen((string) ($raw['website'] ?? '')) > 0) return ['ok' => false, 'error' => 'spam'];
    $ts = (float) ($raw['ts'] ?? 0);
    if (!$ts || $nowMs - $ts < SW_MIN_FILL_MS || $nowMs - $ts > SW_MAX_FORM_AGE_MS) return ['ok' => false, 'error' => 'spam'];

    $name = trim(preg_replace('/\s+/', ' ', sw_clean($raw['name'] ?? '', 100)) ?? '');
    if (mb_strlen($name) < 2) return ['ok' => false, 'error' => 'name'];
    $email = strtolower(trim(preg_replace('/\s+/', ' ', sw_clean($raw['email'] ?? '', 200)) ?? ''));
    if (!preg_match('/^[^\s@<>()\[\]\\\\,;:"]+@[^\s@<>()\[\]\\\\,;:"]+\.[A-Za-z]{2,}$/', $email)) return ['ok' => false, 'error' => 'email'];
    $message = sw_clean($raw['message'] ?? '', 3000);
    if (mb_strlen($message) < 10) return ['ok' => false, 'error' => 'message'];
    if (($raw['consent'] ?? '') !== 'on') return ['ok' => false, 'error' => 'consent'];
    $subject = in_array($raw['subject'] ?? '', SW_SUBJECTS, true) ? $raw['subject'] : 'general';
    return ['ok' => true, 'data' => compact('name', 'email', 'subject', 'message')];
}

add_action('wp_ajax_nopriv_sw_contact', 'sw_contact_ajax');
add_action('wp_ajax_sw_contact', 'sw_contact_ajax');

function sw_contact_ajax(): void {
    $raw = wp_unslash($_POST);
    $loc = in_array($raw['locale'] ?? '', SW_LOCALES, true) ? $raw['locale'] : 'es';
    $now = (int) round(microtime(true) * 1000);
    $reply = static function (array $r) { wp_send_json($r); };

    $v = sw_validate_contact($raw, $now);
    if (!$v['ok']) $reply(['status' => 'error', 'error' => $v['error']]);

    $ip = sanitize_text_field(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown'))[0]);
    $key = 'sw_rl_' . substr(hash('sha256', $ip . '|' . wp_salt()), 0, 32); // only a salted hash of the IP is kept
    $recent = array_values(array_filter((array) get_transient($key), static fn($t) => $now - $t < SW_RATE_WINDOW * 1000));
    if (count($recent) >= SW_RATE_MAX) $reply(['status' => 'error', 'error' => 'rate']);

    $d = $v['data'];
    $to = get_option('sw_contact_to') ?: get_option('admin_email');
    $label = sw_data('data/i18n')['es']['contact']['subjects'][$d['subject']] ?? 'Consulta';
    $headers = ['Reply-To: ' . $d['name'] . ' <' . $d['email'] . '>'];
    $body = "Nombre: {$d['name']}\nCorreo: {$d['email']}\nAsunto: {$label}\nIdioma: {$loc}\n\n{$d['message']}\n";
    $subject = '[SphereWars] ' . $label . ' · ' . str_replace(["\r", "\n"], ' ', $d['name']);
    if (!wp_mail($to, $subject, $body, $headers)) $reply(['status' => 'error', 'error' => 'generic']);

    $recent[] = $now;
    set_transient($key, $recent, SW_RATE_WINDOW);
    $reply(['status' => 'ok']);
}
