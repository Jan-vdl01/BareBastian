<?php
/**
 * BAREBASTIAN – Einrichtung (einmalig). Legt das Admin-Konto an und speichert die Grundeinstellungen.
 * Sobald ein Admin-Konto existiert, ist diese Seite gesperrt.
 */
define('BB_API', true);
require __DIR__ . '/api/lib.php';
header('X-Robots-Tag: noindex');
header('Cache-Control: no-store');

$e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$problems = [];
$done = false;
$errors = [];
$host = preg_replace('/^www\./', '', explode(':', $_SERVER['HTTP_HOST'] ?? 'localhost')[0]);
$form = ['email' => '', 'mail_from' => valid_email("noreply@$host") ? "noreply@$host" : '', 'notify' => ''];

if (version_compare(PHP_VERSION, '8.0.0', '<')) $problems[] = 'PHP ' . PHP_VERSION . ' ist zu alt. Bitte in hPanel unter „Erweitert → PHP-Konfiguration“ PHP 8.1 oder neuer wählen.';
if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) $problems[] = 'Die PHP-Erweiterung „pdo_sqlite“ ist nicht aktiv. Bitte in hPanel unter „Erweitert → PHP-Konfiguration → PHP-Erweiterungen“ einschalten.';
if (!function_exists('mb_strlen')) $problems[] = 'Die PHP-Erweiterung „mbstring“ ist nicht aktiv. Bitte in hPanel einschalten.';
$dataDir = '';
if (!$problems) {
    try {
        $dataDir = data_dir();
        db();
        $done = (bool) val('SELECT 1 FROM users WHERE id = ?', [CREATOR_ID]);
    } catch (Throwable $x) {
        $problems[] = $x instanceof HttpError ? $x->getMessage() : 'Die Datenbank konnte nicht angelegt werden: ' . $x->getMessage();
    }
}
$insideWeb = $dataDir !== '' && str_starts_with($dataDir, site_root());

if (!$problems && !$done && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $form = ['email' => trim($_POST['email'] ?? ''), 'mail_from' => trim($_POST['mail_from'] ?? ''), 'notify' => trim($_POST['notify'] ?? '')];
    $pw = (string) ($_POST['password'] ?? '');
    if (!valid_email($form['email'])) $errors[] = 'Bitte eine gültige E-Mail-Adresse für dein Admin-Konto angeben.';
    if (strlen($pw) < 10) $errors[] = 'Das Passwort muss mindestens 10 Zeichen lang sein.';
    if ($pw !== (string) ($_POST['password2'] ?? '')) $errors[] = 'Die beiden Passwörter stimmen nicht überein.';
    if ($form['mail_from'] !== '' && !valid_email($form['mail_from'])) $errors[] = 'Die Absender-Adresse ist ungültig.';
    if ($form['notify'] !== '' && !valid_email($form['notify'])) $errors[] = 'Die Benachrichtigungs-Adresse ist ungültig.';
    if (!$errors) {
        save_config(['base_url' => (is_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? $host), 'mail_from' => $form['mail_from'], 'notify_email' => $form['notify'] ?: $form['email']]);
        create_user($form['email'], $pw, 'BAREBASTIAN', [
            'id' => CREATOR_ID, 'role' => 'admin', 'username' => 'barebastian', 'verified' => true,
            'profile' => ['bio' => 'Content Creator aus Hamburg. Exklusive Inhalte, Live-Streams und persönliche Nachrichten.', 'location' => 'Hamburg', 'interests' => ['Content Creation', 'Live-Streams', 'Gym', 'Gaming'], 'socials' => ['instagram' => 'bare.bastian', 'x' => 'Bare_Bastian', 'telegram' => 'Bare_Bastian']],
        ]);
        create_session(CREATOR_ID, true);
        $done = true;
        $justCreated = true;
    }
}
?><!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Einrichtung · BAREBASTIAN</title>
<style>
  *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:#06080d;color:#e2e8f0;font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  main{width:100%;max-width:520px;background:#0b0f18;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:28px}
  .brand{font-weight:700;letter-spacing:.18em;color:#22d3ee;font-size:13px;margin:0 0 6px}
  h1{font-size:26px;margin:0 0 8px;color:#fff} p{margin:0 0 14px;color:#94a3b8;font-size:15px}
  label{display:block;font-size:13px;font-weight:600;color:#cbd5e1;margin:16px 0 6px}
  input{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;font:inherit}
  input:focus{outline:3px solid rgba(34,211,238,.25);border-color:#22d3ee}
  small{display:block;color:#64748b;font-size:12.5px;margin-top:5px}
  button,.btn{display:block;width:100%;margin-top:22px;padding:14px;border:0;border-radius:12px;background:linear-gradient(90deg,#22d3ee,#2563eb);color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer;text-align:center;text-decoration:none}
  .box{border-radius:12px;padding:12px 14px;font-size:14px;margin:0 0 12px}
  .err{background:rgba(244,63,94,.12);border:1px solid rgba(244,63,94,.4);color:#fecdd3}
  .ok{background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.4);color:#a7f3d0}
  .warn{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.35);color:#fde68a}
  code{background:rgba(255,255,255,.08);padding:1px 6px;border-radius:6px;font-size:13px;word-break:break-all}
</style>
</head>
<body>
<main>
  <p class="brand">BAREBASTIAN</p>
<?php if ($problems): ?>
  <h1>Fast geschafft</h1>
  <p>Bevor es losgehen kann, muss noch etwas am Hosting eingestellt werden:</p>
  <?php foreach ($problems as $p): ?><div class="box err"><?= $e($p) ?></div><?php endforeach; ?>
  <a class="btn" href="einrichtung.php">Erneut prüfen</a>
<?php elseif ($done): ?>
  <h1><?= !empty($justCreated) ? 'Einrichtung abgeschlossen 🎉' : 'Bereits eingerichtet' ?></h1>
  <?php if (!empty($justCreated)): ?>
    <div class="box ok">Dein Admin-Konto wurde angelegt und du bist angemeldet.</div>
    <p>Als Nächstes: Profil einrichten, Inhalte in die Bibliothek laden und in der <b>Verwaltung</b> den Zahlungstext anpassen.</p>
  <?php else: ?>
    <p>Die Website ist bereits eingerichtet. Diese Seite ist gesperrt.</p>
  <?php endif; ?>
  <?php if ($insideWeb): ?><div class="box warn">Hinweis: Die Daten liegen im Ordner <code>bb-data</code> innerhalb des Website-Ordners. Er ist per <code>.htaccess</code> gesperrt – lösche diese Datei nicht.</div><?php endif; ?>
  <a class="btn" href="./#/abo-bereich">Zur Website</a>
<?php else: ?>
  <h1>Website einrichten</h1>
  <p>Lege dein Admin-Konto an. Das dauert eine Minute und ist nur einmal nötig.</p>
  <?php foreach ($errors as $x): ?><div class="box err"><?= $e($x) ?></div><?php endforeach; ?>
  <form method="post" autocomplete="off">
    <label for="email">Deine E-Mail-Adresse (Admin-Login)</label>
    <input id="email" name="email" type="email" required value="<?= $e($form['email']) ?>">
    <label for="password">Passwort (mind. 10 Zeichen)</label>
    <input id="password" name="password" type="password" required minlength="10" autocomplete="new-password">
    <label for="password2">Passwort wiederholen</label>
    <input id="password2" name="password2" type="password" required minlength="10" autocomplete="new-password">
    <label for="mail_from">Absender für E-Mails der Website</label>
    <input id="mail_from" name="mail_from" type="email" value="<?= $e($form['mail_from']) ?>">
    <small>Am besten ein Postfach deiner Domain, das du in hPanel unter „E-Mails“ angelegt hast – sonst landen Mails eher im Spam.</small>
    <label for="notify">Benachrichtigungen an (optional)</label>
    <input id="notify" name="notify" type="email" value="<?= $e($form['notify']) ?>" placeholder="leer = deine Admin-Adresse">
    <small>Hierhin gehen Kontaktanfragen, neue Mitglieder und Abo-Anfragen.</small>
    <button type="submit">Einrichtung abschließen</button>
  </form>
  <p style="margin-top:18px;font-size:12.5px">Datenordner: <code><?= $e($dataDir) ?></code><?= $insideWeb ? ' (per .htaccess gesperrt)' : ' (außerhalb des Website-Ordners)' ?></p>
<?php endif; ?>
</main>
</body>
</html>
