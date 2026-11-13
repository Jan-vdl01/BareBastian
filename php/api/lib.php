<?php
/**
 * BAREBASTIAN – gemeinsame Funktionen der PHP-Version (Hostinger Webhosting).
 * Daten: SQLite-Datenbank + Uploads in einem Ordner AUSSERHALB von public_html (falls möglich).
 */
if (!defined('BB_API')) { http_response_code(404); exit; }

const CREATOR_ID = 'creator';
const COOKIE = 'bb_sid';
const SESSION_DAYS = 30;
const ALLOWED_TYPES = [
    'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif',
    'video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov',
];
const MAX_IMAGE_MB = 15;
const MAX_VIDEO_MB = 4096;

class HttpError extends Exception {
    public int $status;
    public function __construct(int $status, string $message) { parent::__construct($message); $this->status = $status; }
}
function bad(string $m): HttpError { return new HttpError(400, $m); }
function forbidden(string $m = 'Dafür hast du keine Berechtigung.'): HttpError { return new HttpError(403, $m); }
function not_found(string $m = 'Nicht gefunden.'): HttpError { return new HttpError(404, $m); }

/* ---------- Speicherort ---------- */

function site_root(): string { return dirname(__DIR__); }

/** Datenordner: bevorzugt neben public_html (nicht aus dem Internet erreichbar), sonst geschützt im Webordner. */
function data_dir(): string {
    static $dir = null;
    if ($dir !== null) return $dir;
    $outside = dirname(site_root()) . '/barebastian-data';
    $inside = site_root() . '/bb-data';
    if (is_dir($outside) && is_writable($outside)) return $dir = $outside;
    if (is_dir($inside) && is_writable($inside)) return $dir = $inside;
    if (@mkdir($outside, 0750, true) && is_writable($outside)) return $dir = $outside;
    if ((is_dir($inside) || @mkdir($inside, 0750, true)) && is_writable($inside)) return $dir = $inside;
    throw new HttpError(500, 'Der Datenordner kann nicht angelegt werden. Bitte Schreibrechte für den Website-Ordner prüfen.');
}

function ensure_dirs(): void {
    $d = data_dir();
    if (!is_dir("$d/uploads")) @mkdir("$d/uploads", 0750, true);
    // Zusätzlicher Schutz, falls der Ordner im Webverzeichnis liegt
    if (!file_exists("$d/.htaccess")) @file_put_contents("$d/.htaccess", "Require all denied\nDeny from all\n");
    if (!file_exists("$d/index.html")) @file_put_contents("$d/index.html", '');
}

function config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $defaults = [
        'site_name' => 'BAREBASTIAN',
        'base_url' => '',
        'mail_from' => '',
        'notify_email' => '',
        'payment_info' => 'Danke für deine Anfrage! Du erhältst in Kürze die Zahlungsinformationen per E-Mail. Sobald die Zahlung eingegangen ist, wird dein Abo freigeschaltet.',
        'payment_links' => ['monthly' => '', 'quarterly' => '', 'yearly' => ''],
    ];
    $file = data_dir() . '/config.json';
    $saved = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    $cfg = array_merge($defaults, is_array($saved) ? $saved : []);
    if (!$cfg['base_url']) $cfg['base_url'] = (is_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $cfg['base_url'] = rtrim($cfg['base_url'], '/');
    return $cfg;
}

function save_config(array $values): void {
    $file = data_dir() . '/config.json';
    $saved = is_file($file) ? (json_decode((string) file_get_contents($file), true) ?: []) : [];
    file_put_contents($file, json_encode(array_merge($saved, $values), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function plans(): array {
    static $plans = null;
    if ($plans === null) {
        $plans = [];
        foreach (json_decode((string) file_get_contents(__DIR__ . '/plans.json'), true) as $p) $plans[$p['id']] = $p;
    }
    return $plans;
}
function plan(?string $id): array { $p = plans(); return $p[$id] ?? reset($p); }

function is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' || ($_SERVER['SERVER_PORT'] ?? '') == 443;
}

/* ---------- Datenbank ---------- */

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) throw new HttpError(500, 'Die PHP-Erweiterung „pdo_sqlite“ fehlt. Bitte in hPanel unter Erweitert → PHP-Konfiguration → PHP-Erweiterungen aktivieren.');
    ensure_dirs();
    $pdo = new PDO('sqlite:' . data_dir() . '/barebastian.db', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $pdo->exec('PRAGMA busy_timeout = 8000');
    $pdo->exec('PRAGMA foreign_keys = ON');
    if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() < 1) {
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec(SCHEMA);
        $pdo->exec('PRAGMA user_version = 1');
    }
    return $pdo;
}

const SCHEMA = <<<SQL
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0, age_confirmed_at TEXT, terms_accepted_at TEXT, disabled INTEGER NOT NULL DEFAULT 0, last_login_at TEXT);
CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, username TEXT NOT NULL UNIQUE COLLATE NOCASE, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, remember INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subscriptions (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, plan TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, renews_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sub_requests (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, design TEXT NOT NULL, images TEXT NOT NULL, poll TEXT, tags TEXT NOT NULL, visibility TEXT NOT NULL, created_at TEXT NOT NULL, edited_at TEXT);
CREATE INDEX IF NOT EXISTS posts_created ON posts(created_at);
CREATE TABLE IF NOT EXISTS post_likes (post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (post_id, user_id));
CREATE TABLE IF NOT EXISTS post_comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS poll_votes (post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, option_id TEXT NOT NULL, PRIMARY KEY (post_id, user_id));
CREATE TABLE IF NOT EXISTS follows (follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, followee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, PRIMARY KEY (follower_id, followee_id));
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, text TEXT NOT NULL, at TEXT NOT NULL, read_at TEXT, hidden_from INTEGER NOT NULL DEFAULT 0, hidden_to INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS messages_from ON messages(from_id);
CREATE INDEX IF NOT EXISTS messages_to ON messages(to_id);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS user_docs (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, key));
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, scope TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS contact_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, topic TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, handled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS rate_limits (k TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL);
SQL;

function q(string $sql, array $params = []): PDOStatement { $st = db()->prepare($sql); $st->execute($params); return $st; }
function one(string $sql, array $params = []): ?array { $r = q($sql, $params)->fetch(); return $r === false ? null : $r; }
function all(string $sql, array $params = []): array { return q($sql, $params)->fetchAll(); }
function val(string $sql, array $params = []) { return q($sql, $params)->fetchColumn(); }

function tx(callable $fn) {
    $pdo = db();
    $pdo->beginTransaction();
    try { $r = $fn(); $pdo->commit(); return $r; } catch (Throwable $e) { $pdo->rollBack(); throw $e; }
}

/** Zeitstempel im selben Format wie JavaScript (ISO 8601, UTC, Millisekunden). */
function now_iso(?float $ts = null): string {
    $ts ??= microtime(true);
    return gmdate('Y-m-d\TH:i:s', (int) $ts) . sprintf('.%03dZ', (int) (($ts - floor($ts)) * 1000));
}
function new_id(string $prefix): string { return $prefix . '_' . rtrim(strtr(base64_encode(random_bytes(9)), '+/', '-_'), '='); }
function new_token(): string { return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='); }
function sha(string $v): string { return hash('sha256', $v); }

/* ---------- Anfrage & Antwort ---------- */

function send_json($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** JSON-Body als assoziatives Array (für Prüfungen). */
function body(): array {
    static $b = null;
    if ($b === null) { $d = json_decode(raw_body(), true); $b = is_array($d) ? $d : []; }
    return $b;
}
/** JSON-Body als Objekt – erhält den Unterschied zwischen {} und [] beim Speichern. */
function body_obj() {
    static $b = null, $done = false;
    if (!$done) { $b = json_decode(raw_body()); $done = true; }
    return $b;
}
function raw_body(): string {
    static $raw = null;
    if ($raw === null) $raw = (string) file_get_contents('php://input');
    return $raw;
}
function str($v, int $max = 100000): string { return is_string($v) || is_numeric($v) ? mb_substr(trim((string) $v), 0, $max) : ''; }
function decode(?string $json, $fallback = null) { if ($json === null || $json === '') return $fallback; $v = json_decode($json); return $v === null && $json !== 'null' ? $fallback : $v; }
function valid_email(string $e): bool { return (bool) preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $e) && mb_strlen($e) <= 200; }
function client_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; }

/* ---------- Ratenbegrenzung ---------- */

function rate_limit(string $name, int $max, int $windowSec, string $message = 'Zu viele Versuche. Bitte warte ein paar Minuten.'): void {
    $key = $name . ':' . client_ip();
    $t = time();
    if (random_int(1, 200) === 1) q('DELETE FROM rate_limits WHERE reset < ?', [$t]);
    $row = one('SELECT count, reset FROM rate_limits WHERE k = ?', [$key]);
    if (!$row || $row['reset'] < $t) {
        q('INSERT INTO rate_limits (k, count, reset) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET count = 1, reset = excluded.reset', [$key, $t + $windowSec]);
        return;
    }
    q('UPDATE rate_limits SET count = count + 1 WHERE k = ?', [$key]);
    if ($row['count'] + 1 > $max) { header('Retry-After: ' . ($row['reset'] - $t)); throw new HttpError(429, $message); }
}
/** Erfolgreiche Anfrage nicht mitzählen (z. B. normale Logins). */
function rate_ok(string $name): void { q('UPDATE rate_limits SET count = MAX(count - 1, 0) WHERE k = ?', [$name . ':' . client_ip()]); }

/* ---------- Benutzer, Sitzungen, Abo ---------- */

function current_user(): ?array {
    static $user = false;
    if ($user !== false) return $user;
    $user = null;
    $token = $_COOKIE[COOKIE] ?? '';
    if ($token === '') return null;
    $hash = sha($token);
    $s = one('SELECT user_id, expires_at, remember FROM sessions WHERE token_hash = ?', [$hash]);
    if (!$s) return null;
    if ($s['expires_at'] <= now_iso()) { q('DELETE FROM sessions WHERE token_hash = ?', [$hash]); return null; }
    $u = one('SELECT * FROM users WHERE id = ?', [$s['user_id']]);
    if (!$u || $u['disabled']) return null;
    $days = $s['remember'] ? SESSION_DAYS : 1;
    if (strtotime($s['expires_at']) - time() < $days * 43200) q('UPDATE sessions SET expires_at = ? WHERE token_hash = ?', [now_iso(time() + $days * 86400), $hash]);
    return $user = $u;
}
function require_login(): array { $u = current_user(); if (!$u) throw new HttpError(401, 'Bitte melde dich an.'); return $u; }
function has_access(?array $u): bool {
    if (!$u) return false;
    if ($u['role'] === 'admin') return true;
    $r = val('SELECT renews_at FROM subscriptions WHERE user_id = ?', [$u['id']]);
    return $r && $r > now_iso();
}
function require_access(): array { $u = require_login(); if (!has_access($u)) throw forbidden('Dafür brauchst du ein aktives Abo.'); return $u; }
function require_admin(): array { $u = current_user(); if (!$u || $u['role'] !== 'admin') throw forbidden(); return $u; }

function create_session(string $userId, bool $remember): void {
    $token = new_token();
    $days = $remember ? SESSION_DAYS : 1;
    $exp = time() + $days * 86400;
    q('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, remember) VALUES (?, ?, ?, ?, ?)', [sha($token), $userId, now_iso(), now_iso($exp), $remember ? 1 : 0]);
    q('UPDATE users SET last_login_at = ? WHERE id = ?', [now_iso(), $userId]);
    setcookie(COOKIE, $token, ['expires' => $remember ? $exp : 0, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}
function destroy_session(): void {
    if (!empty($_COOKIE[COOKIE])) q('DELETE FROM sessions WHERE token_hash = ?', [sha($_COOKIE[COOKIE])]);
    setcookie(COOKIE, '', ['expires' => 1, 'path' => '/', 'secure' => is_https(), 'httponly' => true, 'samesite' => 'Lax']);
}

function one_time_token(string $userId, string $kind, int $hours): string {
    $token = new_token();
    q('DELETE FROM tokens WHERE user_id = ? AND kind = ?', [$userId, $kind]);
    q('INSERT INTO tokens (token_hash, user_id, kind, expires_at) VALUES (?, ?, ?, ?)', [sha($token), $userId, $kind, now_iso(time() + $hours * 3600)]);
    return $token;
}
function consume_token(string $token, string $kind): ?string {
    $row = one('SELECT user_id, expires_at FROM tokens WHERE token_hash = ? AND kind = ?', [sha($token), $kind]);
    if (!$row) return null;
    q('DELETE FROM tokens WHERE token_hash = ?', [sha($token)]);
    return $row['expires_at'] > now_iso() ? $row['user_id'] : null;
}

function unique_username(string $base): string {
    $clean = mb_strtolower($base);
    $clean = strtr($clean, ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss']);
    $clean = substr(preg_replace('/[^a-z0-9_.]/', '', $clean), 0, 16);
    if (strlen($clean) < 3) $clean = substr($clean . 'mitglied', 0, 16);
    $name = $clean;
    for ($i = 2; val('SELECT 1 FROM profiles WHERE username = ?', [$name]); $i++) $name = $clean . $i;
    return $name;
}

function create_user(string $email, string $password, string $displayName, array $opts = []): array {
    $id = $opts['id'] ?? new_id('u');
    $t = now_iso();
    $profile = array_merge(['displayName' => $displayName, 'bio' => '', 'location' => '', 'website' => '', 'pronouns' => '', 'interests' => [], 'socials' => new stdClass()], $opts['profile'] ?? []);
    tx(function () use ($id, $email, $password, $opts, $t, $profile, $displayName) {
        q('INSERT INTO users (id, email, password_hash, role, created_at, email_verified, age_confirmed_at, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [$id, mb_strtolower($email), password_hash($password, PASSWORD_DEFAULT), $opts['role'] ?? 'member', $t, empty($opts['verified']) ? 0 : 1, $t, $t]);
        q('INSERT INTO profiles (user_id, username, data) VALUES (?, ?, ?)', [$id, $opts['username'] ?? unique_username($displayName ?: explode('@', $email)[0]), json_encode($profile, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        if ($id !== CREATOR_ID && val('SELECT 1 FROM users WHERE id = ?', [CREATOR_ID])) q('INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', [$id, CREATOR_ID, $t]);
    });
    return one('SELECT * FROM users WHERE id = ?', [$id]);
}

function profile_row(array $r): object {
    $d = decode($r['data'], new stdClass());
    if (!is_object($d)) $d = new stdClass();
    foreach (['displayName' => 'Mitglied', 'bio' => '', 'location' => '', 'website' => '', 'pronouns' => ''] as $k => $def) if (!isset($d->$k)) $d->$k = $def;
    if (!isset($d->interests) || !is_array($d->interests)) $d->interests = [];
    if (!isset($d->socials) || !is_object($d->socials)) $d->socials = new stdClass();
    $d->id = $r['user_id'];
    $d->username = $r['username'];
    $d->joinedAt = $r['created_at'];
    $d->role = $r['role'];
    return $d;
}
const PROFILE_SQL = 'SELECT p.user_id, p.username, p.data, u.role, u.created_at FROM profiles p JOIN users u ON u.id = p.user_id';
function get_profile(string $id): ?object { $r = one(PROFILE_SQL . ' WHERE p.user_id = ?', [$id]); return $r ? profile_row($r) : null; }

function client_user(array $u): array {
    $sub = one('SELECT * FROM subscriptions WHERE user_id = ?', [$u['id']]);
    $req = one("SELECT plan, created_at FROM sub_requests WHERE user_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 1", [$u['id']]);
    $p = get_profile($u['id']);
    return [
        'id' => $u['id'], 'email' => $u['email'], 'displayName' => $p->displayName ?? 'Mitglied', 'createdAt' => $u['created_at'],
        'provider' => 'password', 'role' => $u['role'], 'emailVerified' => (bool) $u['email_verified'],
        'subscription' => $sub ? ['plan' => $sub['plan'], 'status' => $sub['status'], 'startedAt' => $sub['started_at'], 'renewsAt' => $sub['renews_at']] : null,
        'pendingRequest' => $req ? ['plan' => $req['plan'], 'createdAt' => $req['created_at']] : null,
    ];
}

/* ---------- Dateien ---------- */

function file_path(string $id): string { return data_dir() . '/uploads/' . $id; }
function file_url(string $id): string { return '/api/files/' . $id; }
function file_id_of(?string $url): ?string { return $url && preg_match('#^/api/files/(f_[\w-]+)$#', $url, $m) ? $m[1] : null; }

function save_file_data(string $ownerId, string $scope, string $mime, string $data): string {
    if (!isset(ALLOWED_TYPES[$mime])) throw bad('Dateiformat wird nicht unterstützt.');
    $id = new_id('f');
    file_put_contents(file_path($id), $data);
    q('INSERT INTO files (id, owner_id, scope, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', [$id, $ownerId, $scope, $mime, strlen($data), now_iso()]);
    return file_url($id);
}
/** Eingebettetes Bild (data:image/…;base64) als Datei speichern; andere Werte bleiben unverändert. */
function store_data_url(?string $value, string $ownerId, string $scope): ?string {
    if (!$value || !preg_match('#^data:(image/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$#', $value, $m)) return $value;
    $bin = base64_decode($m[2], true);
    if ($bin === false || strlen($bin) > 3 * 1024 * 1024) throw bad('Das Bild ist zu groß.');
    return save_file_data($ownerId, $scope, $m[1], $bin);
}
function delete_file_url(?string $url, ?array $actor = null): void {
    $id = file_id_of($url);
    if (!$id) return;
    $row = one('SELECT * FROM files WHERE id = ?', [$id]);
    if (!$row) return;
    if ($actor && $actor['role'] !== 'admin' && $row['owner_id'] !== $actor['id']) return;
    q('DELETE FROM files WHERE id = ?', [$id]);
    @unlink(file_path($id));
}
function delete_files_of(string $userId): void {
    foreach (all('SELECT id FROM files WHERE owner_id = ?', [$userId]) as $f) @unlink(file_path($f['id']));
    q('DELETE FROM files WHERE owner_id = ?', [$userId]);
}

/** Datei ausliefern – mit Unterstützung für Teilabrufe (Vorspulen in Videos). */
function serve_file(string $path, string $mime): void {
    $size = filesize($path);
    $start = 0; $end = $size - 1; $status = 200;
    if (isset($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
        if ($m[1] === '' && $m[2] !== '') { $start = max(0, $size - (int) $m[2]); }
        else { $start = (int) $m[1]; if ($m[2] !== '') $end = min($end, (int) $m[2]); }
        if ($start > $end || $start >= $size) { http_response_code(416); header("Content-Range: bytes */$size"); exit; }
        $status = 206;
    }
    while (ob_get_level()) ob_end_clean();
    @set_time_limit(0);
    http_response_code($status);
    header('Content-Type: ' . $mime);
    header('Accept-Ranges: bytes');
    header('Cache-Control: private, max-age=604800');
    header('Content-Disposition: inline');
    header('X-Content-Type-Options: nosniff');
    header('Content-Length: ' . ($end - $start + 1));
    if ($status === 206) header("Content-Range: bytes $start-$end/$size");
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') exit;
    $fh = fopen($path, 'rb');
    fseek($fh, $start);
    $left = $end - $start + 1;
    while ($left > 0 && !feof($fh) && !connection_aborted()) {
        $chunk = fread($fh, (int) min(262144, $left));
        if ($chunk === false) break;
        echo $chunk;
        $left -= strlen($chunk);
        flush();
    }
    fclose($fh);
    exit;
}

/* ---------- E-Mail ---------- */

function mail_from(): string {
    $c = config();
    if ($c['mail_from']) return $c['mail_from'];
    $host = preg_replace('/^www\./', '', parse_url($c['base_url'], PHP_URL_HOST) ?: 'localhost');
    return 'noreply@' . $host;
}

/** Versendet eine E-Mail über den Mailserver des Hostings. Jede Mail wird zusätzlich in mail.log vermerkt. */
function send_mail(string $to, string $subject, string $title, array $lines, ?array $button = null, ?string $replyTo = null): bool {
    $site = config()['site_name'];
    $e = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    $text = implode("\n\n", $lines) . ($button ? "\n\n{$button[0]}: {$button[1]}" : '');
    $html = '<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border-radius:16px;padding:28px">'
        . '<p style="margin:0 0 18px;font-weight:700;letter-spacing:.15em;color:#2563eb">' . $e($site) . '</p><h1 style="font-size:20px;margin:0 0 16px">' . $e($title) . '</h1>';
    foreach ($lines as $l) $html .= '<p style="margin:0 0 14px;line-height:1.55">' . nl2br($e($l)) . '</p>';
    if ($button) $html .= '<p style="margin:24px 0"><a href="' . $e($button[1]) . '" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">' . $e($button[0]) . '</a></p><p style="font-size:12px;color:#64748b;word-break:break-all">Falls der Button nicht funktioniert: ' . $e($button[1]) . '</p>';
    $html .= '</div></div></body></html>';

    $from = mail_from();
    $boundary = 'bb' . bin2hex(random_bytes(8));
    $headers = [
        'From: =?UTF-8?B?' . base64_encode($site) . '?= <' . $from . '>',
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ];
    if ($replyTo && valid_email($replyTo)) $headers[] = 'Reply-To: ' . $replyTo;
    $bodyText = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text))
        . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html)) . "--$boundary--\r\n";
    $ok = false;
    if (valid_email($to) && !getenv('BB_NO_MAIL')) $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $bodyText, implode("\r\n", $headers), '-f' . $from);
    // Protokoll (ohne Inhalt geheimer Links nur im Testmodus)
    $log = '[' . now_iso() . '] ' . ($ok ? 'gesendet' : 'NICHT gesendet') . " | An: $to | $subject" . (getenv('BB_LOG_MAIL_BODY') ? "\n$text\n" : '') . "\n";
    @file_put_contents(data_dir() . '/mail.log', $log, FILE_APPEND | LOCK_EX);
    return $ok;
}
function notify_admin(string $subject, array $lines, ?string $replyTo = null): void {
    $c = config();
    if ($c['notify_email']) send_mail($c['notify_email'], '[' . $c['site_name'] . '] ' . $subject, $subject, $lines, null, $replyTo);
}
