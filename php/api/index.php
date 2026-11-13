<?php
/**
 * BAREBASTIAN – API der PHP-Version. Alle Adressen unter /api/… landen hier (siehe .htaccess).
 */
define('BB_API', true);
require __DIR__ . '/lib.php';

error_reporting(E_ALL);
ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');

$routes = [];
function route(string $method, string $pattern, callable $fn): void { global $routes; $routes[] = [$method, '#^' . $pattern . '$#', $fn]; }

/* ================= Öffentlich / Konto ================= */

route('GET', '/health', fn() => send_json(['status' => 'ok', 'time' => now_iso(), 'server' => 'php']));

route('GET', '/config', function () {
    $c = config();
    send_json(['siteName' => $c['site_name'], 'mailEnabled' => true, 'payment' => ['info' => $c['payment_info'], 'links' => (object) $c['payment_links']], 'plans' => array_keys(plans())]);
});

route('GET', '/auth/me', function () {
    if (!val('SELECT 1 FROM users WHERE id = ?', [CREATOR_ID])) send_json(['user' => null, 'setup' => true]);
    $u = current_user();
    send_json(['user' => $u ? client_user($u) : null]);
});

function check_password($pw): string {
    if (!is_string($pw) || strlen($pw) < 8) throw bad('Das Passwort muss mindestens 8 Zeichen lang sein.');
    if (strlen($pw) > 200) throw bad('Das Passwort ist zu lang.');
    return $pw;
}
function send_verification(array $u): void {
    $token = one_time_token($u['id'], 'verify', 72);
    $c = config();
    send_mail($u['email'], 'E-Mail-Adresse bestätigen – ' . $c['site_name'], 'Bitte bestätige deine E-Mail-Adresse',
        ['Willkommen! Bitte bestätige deine E-Mail-Adresse, damit wir dich bei Passwort-Problemen und zu deinem Abo erreichen können.', 'Der Link ist 72 Stunden gültig.'],
        ['E-Mail bestätigen', $c['base_url'] . '/#/email-bestaetigen?token=' . $token]);
}

route('POST', '/auth/register', function () {
    rate_limit('auth', 15, 900);
    if (!getenv('BB_DISABLE_REGISTER_LIMIT')) rate_limit('register', 10, 3600, 'Von dieser Verbindung wurden gerade sehr viele Konten erstellt. Bitte versuche es später erneut.');
    $b = body();
    $email = mb_strtolower(str($b['email'] ?? ''));
    if (!valid_email($email)) throw bad('Bitte gib eine gültige E-Mail-Adresse ein.');
    $pw = check_password($b['password'] ?? null);
    $name = str($b['displayName'] ?? '', 40);
    if (mb_strlen($name) < 2) throw bad('Bitte gib einen Anzeigenamen mit mindestens 2 Zeichen an.');
    if (($b['ageConfirmed'] ?? false) !== true) throw bad('Du musst mindestens 18 Jahre alt sein.');
    if (($b['termsAccepted'] ?? false) !== true) throw bad('Bitte akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.');
    if (!val('SELECT 1 FROM users WHERE id = ?', [CREATOR_ID])) throw new HttpError(503, 'Die Website wird gerade eingerichtet.');
    if (val('SELECT 1 FROM users WHERE email = ?', [$email])) throw new HttpError(409, 'Für diese E-Mail-Adresse gibt es schon ein Konto. Melde dich an oder setze dein Passwort zurück.');
    $u = create_user($email, $pw, $name);
    create_session($u['id'], true);
    rate_ok('auth');
    send_verification($u);
    notify_admin('Neues Mitglied', ["$name hat sich registriert."]);
    send_json(['user' => client_user($u)], 201);
});

/**
 * Notfall: Admin-Passwort ohne E-Mail zurücksetzen. Dazu im Datenordner (per Dateimanager) eine Datei
 * „admin-passwort.txt“ anlegen, die nur das neue Passwort enthält (mind. 10 Zeichen). Sie wird beim nächsten Login übernommen und gelöscht.
 */
function apply_admin_reset(): void {
    $file = data_dir() . '/admin-passwort.txt';
    if (!is_file($file)) return;
    $pw = trim((string) file_get_contents($file));
    @unlink($file);
    if (strlen($pw) < 10) return;
    q('UPDATE users SET password_hash = ?, disabled = 0 WHERE id = ?', [password_hash($pw, PASSWORD_DEFAULT), CREATOR_ID]);
    q('DELETE FROM sessions WHERE user_id = ?', [CREATOR_ID]);
}

route('POST', '/auth/login', function () {
    rate_limit('auth', 15, 900);
    apply_admin_reset();
    $b = body();
    $u = one('SELECT * FROM users WHERE email = ?', [mb_strtolower(str($b['email'] ?? ''))]);
    if (!$u || !password_verify((string) ($b['password'] ?? ''), $u['password_hash'])) throw new HttpError(401, 'E-Mail oder Passwort ist falsch.');
    if ($u['disabled']) throw new HttpError(403, 'Dieses Konto wurde gesperrt. Bitte kontaktiere den Support.');
    create_session($u['id'], ($b['remember'] ?? true) !== false);
    rate_ok('auth');
    send_json(['user' => client_user($u)]);
});

route('POST', '/auth/logout', function () { destroy_session(); send_json(['ok' => true]); });

route('POST', '/auth/forgot', function () {
    rate_limit('mail', 5, 3600, 'Zu viele E-Mails angefordert. Bitte versuche es später erneut.');
    $email = mb_strtolower(str(body()['email'] ?? ''));
    $u = valid_email($email) ? one('SELECT * FROM users WHERE email = ?', [$email]) : null;
    if ($u && !$u['disabled']) {
        $token = one_time_token($u['id'], 'reset', 2);
        $c = config();
        send_mail($u['email'], 'Passwort zurücksetzen – ' . $c['site_name'], 'Neues Passwort festlegen',
            ['Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf den Button, um ein neues Passwort festzulegen.', 'Der Link ist 2 Stunden gültig. Wenn du das nicht warst, kannst du diese E-Mail ignorieren.'],
            ['Passwort zurücksetzen', $c['base_url'] . '/#/passwort-reset?token=' . $token]);
    }
    send_json(['ok' => true]); // immer gleich – verrät nicht, ob ein Konto existiert
});

route('POST', '/auth/reset', function () {
    rate_limit('auth', 15, 900);
    $b = body();
    $pw = check_password($b['password'] ?? null);
    $uid = consume_token(str($b['token'] ?? ''), 'reset');
    if (!$uid) throw bad('Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.');
    q('UPDATE users SET password_hash = ?, email_verified = 1 WHERE id = ?', [password_hash($pw, PASSWORD_DEFAULT), $uid]);
    q('DELETE FROM sessions WHERE user_id = ?', [$uid]);
    create_session($uid, true);
    rate_ok('auth');
    send_json(['user' => client_user(one('SELECT * FROM users WHERE id = ?', [$uid]))]);
});

route('POST', '/auth/verify', function () {
    $uid = consume_token(str(body()['token'] ?? ''), 'verify');
    if (!$uid) throw bad('Der Bestätigungslink ist ungültig oder abgelaufen.');
    q('UPDATE users SET email_verified = 1 WHERE id = ?', [$uid]);
    send_json(['ok' => true]);
});

route('POST', '/auth/resend-verification', function () {
    $u = require_login();
    rate_limit('mail', 5, 3600, 'Zu viele E-Mails angefordert. Bitte versuche es später erneut.');
    if (!$u['email_verified']) send_verification($u);
    send_json(['ok' => true]);
});

route('POST', '/account/password', function () {
    $u = require_login();
    rate_limit('auth', 15, 900);
    $b = body();
    if (!password_verify((string) ($b['current'] ?? ''), $u['password_hash'])) throw bad('Das aktuelle Passwort ist falsch.');
    $next = check_password($b['next'] ?? null);
    q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($next, PASSWORD_DEFAULT), $u['id']]);
    q('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', [$u['id'], sha($_COOKIE[COOKIE] ?? '')]);
    rate_ok('auth');
    send_json(['ok' => true]);
});

route('DELETE', '/account', function () {
    $u = require_login();
    rate_limit('auth', 15, 900);
    if ($u['id'] === CREATOR_ID) throw bad('Das Creator-Konto kann nicht gelöscht werden.');
    if (!password_verify((string) (body()['password'] ?? ''), $u['password_hash'])) throw bad('Das Passwort ist falsch.');
    delete_files_of($u['id']);
    q('DELETE FROM users WHERE id = ?', [$u['id']]);
    destroy_session();
    send_json(['ok' => true]);
});

route('GET', '/account/export', function () {
    $u = require_login();
    $id = $u['id'];
    $posts = array_map(function ($p) { $p['design'] = decode($p['design']); $p['images'] = decode($p['images'], []); $p['poll'] = decode($p['poll']); $p['tags'] = decode($p['tags'], []); return $p; },
        all('SELECT id, text, design, images, poll, tags, visibility, created_at, edited_at FROM posts WHERE author_id = ?', [$id]));
    $docs = new stdClass();
    foreach (all('SELECT key, value FROM user_docs WHERE user_id = ?', [$id]) as $d) $docs->{$d['key']} = decode($d['value']);
    header('Content-Disposition: attachment; filename="meine-daten.json"');
    send_json([
        'exportedAt' => now_iso(), 'account' => client_user($u), 'profile' => get_profile($id), 'posts' => $posts,
        'comments' => all('SELECT post_id, text, created_at FROM post_comments WHERE author_id = ?', [$id]),
        'likes' => all('SELECT post_id FROM post_likes WHERE user_id = ?', [$id]),
        'following' => all('SELECT followee_id, created_at FROM follows WHERE follower_id = ?', [$id]),
        'messages' => all('SELECT from_id, to_id, text, at, read_at FROM messages WHERE from_id = ? OR to_id = ?', [$id, $id]),
        'documents' => $docs,
    ]);
});

/* ---------- Abo ---------- */

route('POST', '/subscription/request', function () {
    $u = require_login();
    $planId = str(body()['plan'] ?? '');
    if (!isset(plans()[$planId])) throw bad('Bitte wähle ein Paket.');
    $p = plan($planId);
    q("UPDATE sub_requests SET status = 'replaced' WHERE user_id = ? AND status = 'open'", [$u['id']]);
    q('INSERT INTO sub_requests (id, user_id, plan, status, created_at) VALUES (?, ?, ?, ?, ?)', [new_id('r'), $u['id'], $planId, 'open', now_iso()]);
    $name = get_profile($u['id'])->displayName ?? $u['email'];
    $price = number_format($p['price'], 2, ',', '.');
    $c = config();
    notify_admin('Neue Abo-Anfrage', ["$name ({$u['email']}) möchte das Paket „{$p['name']}“ ($price €).", 'Nach Zahlungseingang in der Verwaltung unter „Mitglieder & Abos“ freischalten.'], $u['email']);
    $link = $c['payment_links'][$planId] ?? '';
    send_mail($u['email'], 'Deine Abo-Anfrage – ' . $c['site_name'], 'Danke für deine Abo-Anfrage!', ["Paket: {$p['name']} – $price €", $c['payment_info']], $link ? ['Jetzt bezahlen', $link] : null);
    send_json(['user' => client_user($u)]);
});

route('DELETE', '/subscription/request', function () {
    $u = require_login();
    q("UPDATE sub_requests SET status = 'withdrawn' WHERE user_id = ? AND status = 'open'", [$u['id']]);
    send_json(['user' => client_user($u)]);
});

route('POST', '/subscription/(cancel|resume)', function ($action) {
    $u = require_login();
    q('UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?', [$action === 'cancel' ? 'canceled' : 'active', now_iso(), $u['id']]);
    send_json(['user' => client_user($u)]);
});

/* ================= Profile ================= */

route('GET', '/profiles', function () {
    require_login();
    $out = new stdClass();
    foreach (all(PROFILE_SQL . ' WHERE u.disabled = 0') as $r) $out->{$r['user_id']} = profile_row($r);
    send_json($out);
});

route('PUT', '/profiles/me', function () {
    $u = require_login();
    rate_limit('write', 60, 60, 'Du bist gerade sehr schnell unterwegs. Bitte warte einen Moment.');
    $b = body();
    $name = str($b['displayName'] ?? '', 40);
    if (mb_strlen($name) < 2) throw bad('Der Anzeigename braucht mindestens 2 Zeichen.');
    $username = str($b['username'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9_.]{3,20}$/', $username)) throw bad('Benutzername: 3–20 Zeichen, nur Buchstaben, Zahlen, Punkt und Unterstrich.');
    if (val('SELECT 1 FROM profiles WHERE username = ? AND user_id != ?', [$username, $u['id']])) throw bad('Dieser Benutzername ist schon vergeben.');
    $website = str($b['website'] ?? '', 200);
    if ($website !== '' && !preg_match('#^https?://#i', $website)) throw bad('Die Website muss mit https:// beginnen.');
    $old = get_profile($u['id']);
    $image = function ($value, $previous) use ($u) {
        $value = is_string($value) ? $value : '';
        if ($value === '') { if ($previous) delete_file_url($previous, $u); return null; }
        if ($value === $previous || file_id_of($value)) return $value;
        if (strlen($value) > 5000000) throw bad('Das Bild ist zu groß.');
        $stored = store_data_url($value, $u['id'], 'avatar');
        if (!file_id_of($stored)) throw bad('Ungültiges Bild.');
        if ($previous) delete_file_url($previous, $u);
        return $stored;
    };
    $interests = [];
    foreach (array_slice(is_array($b['interests'] ?? null) ? $b['interests'] : [], 0, 12) as $i) if (str($i, 30) !== '') $interests[] = str($i, 30);
    $socials = new stdClass();
    foreach (['instagram', 'x', 'telegram'] as $k) if (str($b['socials'][$k] ?? '', 60) !== '') $socials->$k = str($b['socials'][$k], 60);
    $data = ['displayName' => $name, 'bio' => str($b['bio'] ?? '', 300), 'location' => str($b['location'] ?? '', 60), 'website' => $website, 'pronouns' => str($b['pronouns'] ?? '', 30), 'interests' => $interests, 'socials' => $socials];
    $avatar = $image($b['avatar'] ?? '', $old->avatar ?? null);
    $cover = $image($b['cover'] ?? '', $old->cover ?? null);
    if ($avatar) $data['avatar'] = $avatar;
    if ($cover) $data['cover'] = $cover;
    q('UPDATE profiles SET username = ?, data = ? WHERE user_id = ?', [$username, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $u['id']]);
    send_json(get_profile($u['id']));
});

/* ================= Social Hub ================= */

function extract_tags(string $text): array {
    preg_match_all('/(^|[^\p{L}\d_&#])#([\p{L}\d_]{2,30})/u', $text, $m);
    return array_slice(array_values(array_unique(array_map('mb_strtolower', $m[2]))), 0, 15);
}

/** Alle Posts, die der Betrachter sehen darf – im Format der Oberfläche. */
function social_state(array $viewer): array {
    $follows = [];
    foreach (all('SELECT follower_id, followee_id FROM follows') as $f) $follows[$f['follower_id']][] = $f['followee_id'];
    $mine = array_flip($follows[$viewer['id']] ?? []);
    $admin = $viewer['role'] === 'admin';
    $rows = array_values(array_filter(all('SELECT * FROM posts ORDER BY created_at DESC LIMIT 1000'),
        fn($p) => $admin || $p['visibility'] === 'public' || $p['author_id'] === $viewer['id'] || isset($mine[$p['author_id']])));
    $ids = array_flip(array_column($rows, 'id'));
    $likes = []; $comments = []; $votes = [];
    foreach (all('SELECT post_id, user_id FROM post_likes') as $l) if (isset($ids[$l['post_id']])) $likes[$l['post_id']][] = $l['user_id'];
    foreach (all('SELECT * FROM post_comments ORDER BY created_at') as $c) if (isset($ids[$c['post_id']])) $comments[$c['post_id']][] = ['id' => $c['id'], 'authorId' => $c['author_id'], 'text' => $c['text'], 'createdAt' => $c['created_at']];
    foreach (all('SELECT * FROM poll_votes') as $v) if (isset($ids[$v['post_id']])) $votes[$v['post_id']][] = $v;
    $posts = [];
    foreach ($rows as $p) {
        $poll = decode($p['poll']);
        if (is_object($poll) && isset($poll->options) && is_array($poll->options)) {
            foreach ($poll->options as $o) {
                $o->votes = [];
                foreach ($votes[$p['id']] ?? [] as $v) if ($v['option_id'] === $o->id) $o->votes[] = $v['user_id'];
            }
        } else $poll = null;
        $post = [
            'id' => $p['id'], 'authorId' => $p['author_id'], 'text' => $p['text'],
            'design' => decode($p['design'], (object) ['bg' => 'none', 'size' => 16, 'align' => 'left']),
            'images' => decode($p['images'], []), 'poll' => $poll, 'tags' => decode($p['tags'], []), 'visibility' => $p['visibility'],
            'likes' => $likes[$p['id']] ?? [], 'comments' => $comments[$p['id']] ?? [], 'createdAt' => $p['created_at'],
        ];
        if ($p['edited_at']) $post['editedAt'] = $p['edited_at'];
        $posts[] = $post;
    }
    return ['version' => 1, 'posts' => $posts, 'follows' => (object) $follows];
}

/** Prüft die Eingabe für einen Post und liefert die zu speichernden Werte. */
function post_input(): array {
    $b = body(); $o = body_obj();
    $text = is_string($b['text'] ?? null) ? mb_substr($b['text'], 0, 2000) : '';
    $d = $b['design'] ?? null;
    if (!is_array($d) || !is_string($d['bg'] ?? null) || !is_numeric($d['size'] ?? null) || $d['size'] < 8 || $d['size'] > 80 || !in_array($d['align'] ?? '', ['left', 'center', 'right'], true)) throw bad('Ungültiger Post.');
    $design = ['bg' => mb_substr($d['bg'], 0, 40), 'size' => $d['size'] + 0, 'align' => $d['align']];
    foreach (['textColor', 'font'] as $k) if (is_string($d[$k] ?? null)) $design[$k] = mb_substr($d[$k], 0, 40);
    $images = [];
    foreach (is_array($b['images'] ?? null) ? $b['images'] : [] as $img) { if (!is_string($img) || !file_id_of($img)) throw bad('Ungültiges Bild.'); $images[] = $img; }
    if (count($images) > 4) throw bad('Höchstens 4 Bilder pro Post.');
    $poll = null;
    if (is_array($b['poll'] ?? null)) {
        $opts = [];
        foreach (is_array($b['poll']['options'] ?? null) ? $b['poll']['options'] : [] as $op) {
            $t = str($op['text'] ?? '', 80);
            if ($t !== '' && is_string($op['id'] ?? null)) $opts[] = ['id' => mb_substr($op['id'], 0, 40), 'text' => $t];
        }
        if (count($opts) < 2 || count($opts) > 4) throw bad('Eine Umfrage braucht 2 bis 4 Antworten.');
        $ends = $b['poll']['endsAt'] ?? null;
        $poll = ['options' => $opts, 'endsAt' => is_string($ends) ? mb_substr($ends, 0, 40) : null];
    }
    $vis = $b['visibility'] ?? '';
    if (!in_array($vis, ['public', 'followers'], true)) throw bad('Ungültige Sichtbarkeit.');
    if (trim($text) === '' && !$images && !$poll) throw bad('Der Post ist leer.');
    $j = fn($v) => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return ['text' => $text, 'design' => $j($design), 'images' => $j($images), 'image_list' => $images, 'poll' => $poll ? $j($poll) : null, 'tags' => $j(extract_tags($text)), 'visibility' => $vis];
}
function write_limit(): void { rate_limit('write', 60, 60, 'Du bist gerade sehr schnell unterwegs. Bitte warte einen Moment.'); }
function visible_post(string $id, array $u): array {
    $p = one('SELECT * FROM posts WHERE id = ?', [$id]);
    if (!$p) throw not_found('Post nicht gefunden.');
    if ($u['role'] !== 'admin' && $p['visibility'] === 'followers' && $p['author_id'] !== $u['id'] && !val('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', [$u['id'], $p['author_id']])) throw not_found('Post nicht gefunden.');
    return $p;
}

route('GET', '/social', function () { send_json(social_state(require_access())); });

route('POST', '/social/posts', function () {
    $u = require_access(); write_limit();
    $p = post_input();
    $id = new_id('sp');
    q('INSERT INTO posts (id, author_id, text, design, images, poll, tags, visibility, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [$id, $u['id'], $p['text'], $p['design'], $p['images'], $p['poll'], $p['tags'], $p['visibility'], now_iso()]);
    send_json(['id' => $id, 'state' => social_state($u)], 201);
});

route('PUT', '/social/posts/([\w-]+)', function ($id) {
    $u = require_access(); write_limit();
    $post = one('SELECT * FROM posts WHERE id = ?', [$id]);
    if (!$post) throw not_found('Post nicht gefunden.');
    if ($post['author_id'] !== $u['id']) throw forbidden('Nur der Autor kann diesen Post bearbeiten.');
    $p = post_input();
    tx(function () use ($p, $id) {
        q('UPDATE posts SET text = ?, design = ?, images = ?, poll = ?, tags = ?, visibility = ?, edited_at = ? WHERE id = ?', [$p['text'], $p['design'], $p['images'], $p['poll'], $p['tags'], $p['visibility'], now_iso(), $id]);
        if (!$p['poll']) q('DELETE FROM poll_votes WHERE post_id = ?', [$id]);
    });
    foreach (decode($post['images'], []) as $old) if (!in_array($old, $p['image_list'], true)) delete_file_url($old, $u);
    send_json(['id' => $id, 'state' => social_state($u)]);
});

route('DELETE', '/social/posts/([\w-]+)', function ($id) {
    $u = require_access();
    $post = one('SELECT * FROM posts WHERE id = ?', [$id]);
    if (!$post) throw not_found('Post nicht gefunden.');
    if ($u['role'] !== 'admin' && $post['author_id'] !== $u['id']) throw forbidden();
    q('DELETE FROM posts WHERE id = ?', [$id]);
    foreach (decode($post['images'], []) as $img) delete_file_url($img);
    send_json(social_state($u));
});

route('POST', '/social/posts/([\w-]+)/like', function ($id) {
    $u = require_access(); write_limit();
    $p = visible_post($id, $u);
    if (val('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', [$p['id'], $u['id']])) q('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [$p['id'], $u['id']]);
    else q('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [$p['id'], $u['id']]);
    send_json(social_state($u));
});

route('POST', '/social/posts/([\w-]+)/comments', function ($id) {
    $u = require_access(); write_limit();
    $p = visible_post($id, $u);
    $text = str(body()['text'] ?? '', 500);
    if ($text === '') throw bad('Der Kommentar ist leer.');
    q('INSERT INTO post_comments (id, post_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)', [new_id('c'), $p['id'], $u['id'], $text, now_iso()]);
    send_json(social_state($u));
});

route('DELETE', '/social/posts/([\w-]+)/comments/([\w-]+)', function ($id, $cid) {
    $u = require_access();
    $c = one('SELECT author_id, post_id FROM post_comments WHERE id = ?', [$cid]);
    if (!$c) throw not_found('Kommentar nicht gefunden.');
    $author = val('SELECT author_id FROM posts WHERE id = ?', [$c['post_id']]);
    if (!($u['role'] === 'admin' || $c['author_id'] === $u['id'] || $author === $u['id'])) throw forbidden();
    q('DELETE FROM post_comments WHERE id = ?', [$cid]);
    send_json(social_state($u));
});

route('POST', '/social/posts/([\w-]+)/vote', function ($id) {
    $u = require_access(); write_limit();
    $p = visible_post($id, $u);
    $poll = json_decode((string) $p['poll'], true);
    $opt = str(body()['optionId'] ?? '');
    if (!is_array($poll) || !in_array($opt, array_column($poll['options'] ?? [], 'id'), true)) throw bad('Ungültige Antwort.');
    if (!empty($poll['endsAt']) && strtotime($poll['endsAt']) < time()) throw bad('Die Umfrage ist beendet.');
    q('INSERT INTO poll_votes (post_id, user_id, option_id) VALUES (?, ?, ?) ON CONFLICT(post_id, user_id) DO UPDATE SET option_id = excluded.option_id', [$p['id'], $u['id'], $opt]);
    send_json(social_state($u));
});

route('POST', '/social/follow/([\w-]+)', function ($target) {
    $u = require_access(); write_limit();
    if ($target === $u['id']) throw bad('Du kannst dir nicht selbst folgen.');
    if (!val('SELECT 1 FROM users WHERE id = ? AND disabled = 0', [$target])) throw not_found('Mitglied nicht gefunden.');
    if (val('SELECT 1 FROM follows WHERE follower_id = ? AND followee_id = ?', [$u['id'], $target])) q('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [$u['id'], $target]);
    else q('INSERT INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', [$u['id'], $target, now_iso()]);
    send_json(social_state($u));
});

/* ================= Chat ================= */

function messages_for(string $me): array {
    $out = [];
    foreach (all('SELECT id, from_id, to_id, text, at, read_at FROM messages WHERE (from_id = ? AND hidden_from = 0) OR (to_id = ? AND hidden_to = 0) ORDER BY at', [$me, $me]) as $m) {
        $x = ['id' => $m['id'], 'from' => $m['from_id'], 'to' => $m['to_id'], 'text' => $m['text'], 'at' => $m['at']];
        if ($m['read_at']) $x['readAt'] = $m['read_at'];
        $out[] = $x;
    }
    return $out;
}
route('GET', '/chat', function () { send_json(messages_for(require_access()['id'])); });
route('POST', '/chat', function () {
    $u = require_access(); write_limit();
    $b = body();
    $to = str($b['to'] ?? ''); $text = str($b['text'] ?? '', 1000);
    if ($text === '') throw bad('Die Nachricht ist leer.');
    if ($to === $u['id'] || !val('SELECT 1 FROM users WHERE id = ? AND disabled = 0', [$to])) throw bad('Empfänger nicht gefunden.');
    q('INSERT INTO messages (id, from_id, to_id, text, at) VALUES (?, ?, ?, ?, ?)', [new_id('m'), $u['id'], $to, $text, now_iso()]);
    send_json(messages_for($u['id']));
});
route('POST', '/chat/read', function () {
    $u = require_access();
    q('UPDATE messages SET read_at = ? WHERE from_id = ? AND to_id = ? AND read_at IS NULL', [now_iso(), str(body()['other'] ?? ''), $u['id']]);
    send_json(messages_for($u['id']));
});
route('DELETE', '/chat/([\w-]+)', function ($other) {
    $u = require_access();
    q('UPDATE messages SET hidden_from = 1 WHERE from_id = ? AND to_id = ?', [$u['id'], $other]);
    q('UPDATE messages SET hidden_to = 1 WHERE to_id = ? AND from_id = ?', [$u['id'], $other]);
    q('DELETE FROM messages WHERE hidden_from = 1 AND hidden_to = 1');
    send_json(messages_for($u['id']));
});

/* ================= Persönliche Dokumente ================= */

route('GET', '/docs', function () {
    $u = require_login();
    $out = new stdClass();
    foreach (all('SELECT key, value FROM user_docs WHERE user_id = ?', [$u['id']]) as $d) $out->{$d['key']} = decode($d['value']);
    send_json($out);
});
route('PUT', '/docs/([\w-]+)', function ($key) {
    $u = require_access();
    if (!preg_match('/^bb_(finance|bio_library)_[\w-]+$/', $key) || !str_ends_with($key, '_' . $u['id'])) throw bad('Ungültiger Speicherbereich.');
    $o = body_obj();
    $value = json_encode(is_object($o) && property_exists($o, 'value') ? $o->value : null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($value) > 6 * 1024 * 1024) throw bad('Die Daten sind zu groß (max. 6 MB). Bitte ältere Versionen oder Profile löschen.');
    q('INSERT INTO user_docs (user_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', [$u['id'], $key, $value, now_iso()]);
    send_json(['ok' => true]);
});

/* ================= Bibliothek ================= */

route('GET', '/content', function () {
    require_access();
    $v = val("SELECT value FROM kv WHERE key = 'content'");
    send_json(decode($v ?: null, (object) ['version' => 1, 'updatedAt' => '', 'videos' => [], 'photos' => [], 'posts' => []]));
});
route('PUT', '/content', function () {
    $u = require_admin();
    $c = body_obj();
    if (!is_object($c) || ($c->version ?? null) !== 1 || !is_array($c->videos ?? null) || !is_array($c->photos ?? null) || !is_array($c->posts ?? null)) throw bad('Ungültige Inhalte.');
    foreach ([['videos', ['id', 'title', 'description', 'duration', 'date', 'category']], ['photos', ['id', 'title', 'album', 'date']], ['posts', ['id', 'date', 'text']]] as [$list, $fields]) {
        foreach ($c->$list as $item) {
            if (!is_object($item)) throw bad("Ungültige Inhalte ($list).");
            foreach ($fields as $f) if (!is_string($item->$f ?? null)) throw bad("Ungültige Inhalte: $list.$f fehlt.");
        }
    }
    foreach ($c->videos as $v) if (is_string($v->poster ?? null) && str_starts_with($v->poster, 'data:')) $v->poster = store_data_url($v->poster, $u['id'], 'library');
    $c->updatedAt = now_iso();
    q('INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at', ['content', json_encode($c, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), now_iso()]);
    send_json($c);
});

/* ================= Kontaktformular ================= */

route('POST', '/contact', function () {
    rate_limit('contact', 5, 3600, 'Du hast schon mehrere Nachrichten gesendet. Bitte versuche es später erneut.');
    $b = body();
    if (!empty($b['website'])) send_json(['ok' => true]); // Honeypot gegen Bots
    $name = str($b['name'] ?? '', 80); $email = str($b['email'] ?? '', 200); $topic = str($b['topic'] ?? 'allgemein', 40); $msg = str($b['message'] ?? '', 5000);
    if (mb_strlen($name) < 2 || !valid_email($email) || mb_strlen($msg) < 10) throw bad('Bitte fülle alle Felder korrekt aus.');
    q('INSERT INTO contact_messages (id, name, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?, ?)', [new_id('k'), $name, $email, $topic, $msg, now_iso()]);
    notify_admin("Kontaktformular: $topic", ["Von: $name <$email>", $msg], $email);
    send_json(['ok' => true]);
});

/* ================= Dateien ================= */

function upload_checks(array $u, string $scope, string $mime): int {
    if (!in_array($scope, ['library', 'social', 'avatar'], true)) throw bad('Unbekannter Bereich.');
    if ($scope === 'library' && $u['role'] !== 'admin') throw forbidden();
    if ($scope === 'social' && !has_access($u)) throw forbidden('Dafür brauchst du ein aktives Abo.');
    if (!isset(ALLOWED_TYPES[$mime])) throw bad('Dateiformat wird nicht unterstützt (erlaubt: JPG, PNG, WebP, GIF, MP4, WebM, MOV).');
    if ($scope !== 'library' && str_starts_with($mime, 'video/')) throw bad('Hier sind nur Bilder erlaubt.');
    return ($scope === 'library' ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
}
/** Kopiert den Anfrage-Body in eine Datei (anhängend) und liefert die neue Größe. */
function append_body(string $target, int $startSize, int $limit): int {
    $in = fopen('php://input', 'rb');
    $out = fopen($target, $startSize > 0 ? 'ab' : 'wb');
    if (!$in || !$out) throw new HttpError(500, 'Die Datei konnte nicht gespeichert werden.');
    $size = $startSize;
    while (!feof($in)) {
        $chunk = fread($in, 262144);
        if ($chunk === false || $chunk === '') break;
        $size += strlen($chunk);
        if ($size > $limit) { fclose($out); @unlink($target); throw new HttpError(413, 'Die Datei ist zu groß (max. ' . round($limit / 1048576) . ' MB).'); }
        fwrite($out, $chunk);
    }
    fclose($in); fclose($out);
    return $size;
}

route('POST', '/files', function () {
    $u = require_login();
    $scope = str($_GET['scope'] ?? '');
    $mime = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    $limit = upload_checks($u, $scope, $mime);
    ensure_dirs();
    $id = new_id('f');
    $size = append_body(file_path($id), 0, $limit);
    if ($size === 0) { @unlink(file_path($id)); throw bad('Die Datei ist leer.'); }
    q('INSERT INTO files (id, owner_id, scope, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', [$id, $u['id'], $scope, $mime, $size, now_iso()]);
    send_json(['url' => file_url($id), 'size' => $size], 201);
});

/** Upload in Teilstücken (große Videos): ?scope=&id=&offset=&last=&type= */
route('POST', '/files/chunk', function () {
    $u = require_login();
    $scope = str($_GET['scope'] ?? '');
    $mime = strtolower(str($_GET['type'] ?? ''));
    $limit = upload_checks($u, $scope, $mime);
    if ($scope !== 'library') throw forbidden('Große Uploads sind nur für die Bibliothek möglich.');
    $uploadId = str($_GET['id'] ?? '');
    if (!preg_match('/^[a-z0-9]{8,40}$/', $uploadId)) throw bad('Ungültiger Upload.');
    ensure_dirs();
    $tmp = data_dir() . '/uploads/tmp_' . $uploadId;
    clearstatcache();
    $current = is_file($tmp) ? filesize($tmp) : 0;
    $offset = (int) ($_GET['offset'] ?? -1);
    if ((string) $offset !== (string) ($_GET['offset'] ?? '') || $offset < 0 || $offset > $current) throw new HttpError(409, 'Upload ist aus dem Takt geraten. Bitte erneut hochladen.');
    if ($offset < $current) { $fh = fopen($tmp, 'r+b'); ftruncate($fh, $offset); fclose($fh); } // wiederholtes Teilstück
    $size = append_body($tmp, $offset, $limit);
    if (($_GET['last'] ?? '') !== '1') send_json(['ok' => true, 'received' => $size]);
    $id = new_id('f');
    rename($tmp, file_path($id));
    q('INSERT INTO files (id, owner_id, scope, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?)', [$id, $u['id'], $scope, $mime, $size, now_iso()]);
    send_json(['url' => file_url($id), 'size' => $size], 201);
});

route('GET', '/files/(f_[\w-]+)', function ($id) {
    $u = require_login();
    $row = one('SELECT * FROM files WHERE id = ?', [$id]);
    if (!$row || !is_file(file_path($id))) throw not_found('Datei nicht gefunden.');
    if ($row['owner_id'] !== $u['id'] && !has_access($u)) throw forbidden('Dafür brauchst du ein aktives Abo.');
    session_write_close();
    serve_file(file_path($id), $row['mime']);
});

route('DELETE', '/files/(f_[\w-]+)', function ($id) {
    $u = require_access();
    delete_file_url(file_url($id), $u);
    send_json(['ok' => true]);
});

/* ================= Verwaltung (nur Admin) ================= */

route('GET', '/admin/users', function () {
    require_admin();
    $subs = []; foreach (all('SELECT * FROM subscriptions') as $s) $subs[$s['user_id']] = $s;
    $reqs = []; foreach (all("SELECT * FROM sub_requests WHERE status = 'open'") as $r) $reqs[$r['user_id']] = $r;
    $out = [];
    foreach (all('SELECT * FROM users ORDER BY created_at DESC') as $x) {
        $p = get_profile($x['id']); $s = $subs[$x['id']] ?? null; $r = $reqs[$x['id']] ?? null;
        $row = [
            'id' => $x['id'], 'email' => $x['email'], 'displayName' => $p->displayName ?? '–', 'username' => $p->username ?? '', 'role' => $x['role'],
            'createdAt' => $x['created_at'], 'lastLoginAt' => $x['last_login_at'], 'emailVerified' => (bool) $x['email_verified'], 'disabled' => (bool) $x['disabled'],
            'subscription' => $s ? ['plan' => $s['plan'], 'status' => $s['status'], 'startedAt' => $s['started_at'], 'renewsAt' => $s['renews_at']] : null,
            'request' => $r ? ['id' => $r['id'], 'plan' => $r['plan'], 'createdAt' => $r['created_at']] : null,
        ];
        if (!empty($p->avatar)) $row['avatar'] = $p->avatar;
        $out[] = $row;
    }
    send_json($out);
});

function target_user(string $id): array { $u = one('SELECT * FROM users WHERE id = ?', [$id]); if (!$u) throw not_found('Mitglied nicht gefunden.'); return $u; }

route('POST', '/admin/users/([\w-]+)/subscription', function ($id) {
    require_admin();
    $t = target_user($id);
    $b = body();
    if (($b['action'] ?? '') === 'end') { q('DELETE FROM subscriptions WHERE user_id = ?', [$id]); send_json(['ok' => true]); }
    if (($b['action'] ?? '') !== 'grant') throw bad('Unbekannte Aktion.');
    $p = plan(is_string($b['plan'] ?? null) ? $b['plan'] : null);
    $months = max(1, min(36, (int) ($b['months'] ?? 0) ?: (int) $p['months']));
    $existing = one('SELECT * FROM subscriptions WHERE user_id = ?', [$id]);
    $base = new DateTime($existing && $existing['renews_at'] > now_iso() ? $existing['renews_at'] : 'now', new DateTimeZone('UTC'));
    $base->modify("+$months months");
    $end = $base->format('Y-m-d\TH:i:s') . '.000Z';
    tx(function () use ($id, $p, $existing, $end) {
        q('INSERT INTO subscriptions (user_id, plan, status, started_at, renews_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET plan = excluded.plan, status = excluded.status, renews_at = excluded.renews_at, updated_at = excluded.updated_at',
            [$id, $p['id'], 'active', $existing['started_at'] ?? now_iso(), $end, now_iso()]);
        q("UPDATE sub_requests SET status = 'done' WHERE user_id = ? AND status = 'open'", [$id]);
    });
    $c = config();
    send_mail($t['email'], 'Dein Abo ist aktiv – ' . $c['site_name'], 'Dein Abo ist freigeschaltet 🎉', ["Paket: {$p['name']}", 'Dein Zugang gilt bis ' . $base->format('d.m.Y') . '. Viel Spaß im Abo-Bereich!'], ['Zum Abo-Bereich', $c['base_url'] . '/#/abo-bereich']);
    send_json(['ok' => true, 'renewsAt' => $end]);
});

route('POST', '/admin/requests/([\w-]+)/dismiss', function ($id) { require_admin(); q("UPDATE sub_requests SET status = 'dismissed' WHERE id = ?", [$id]); send_json(['ok' => true]); });

route('POST', '/admin/users/([\w-]+)/disable', function ($id) {
    require_admin();
    $t = target_user($id);
    if ($t['id'] === CREATOR_ID || $t['role'] === 'admin') throw bad('Admins können nicht gesperrt werden.');
    $disabled = (body()['disabled'] ?? false) === true;
    q('UPDATE users SET disabled = ? WHERE id = ?', [$disabled ? 1 : 0, $id]);
    if ($disabled) q('DELETE FROM sessions WHERE user_id = ?', [$id]);
    send_json(['ok' => true]);
});

route('DELETE', '/admin/users/([\w-]+)', function ($id) {
    require_admin();
    $t = target_user($id);
    if ($t['id'] === CREATOR_ID || $t['role'] === 'admin') throw bad('Admins können nicht gelöscht werden.');
    delete_files_of($id);
    q('DELETE FROM users WHERE id = ?', [$id]);
    send_json(['ok' => true]);
});

route('GET', '/admin/contact', function () { require_admin(); send_json(all('SELECT id, name, email, topic, message, created_at AS createdAt, handled FROM contact_messages ORDER BY created_at DESC LIMIT 200')); });
route('POST', '/admin/contact/([\w-]+)/handled', function ($id) { require_admin(); q('UPDATE contact_messages SET handled = ? WHERE id = ?', [(body()['handled'] ?? true) === false ? 0 : 1, $id]); send_json(['ok' => true]); });
route('DELETE', '/admin/contact/([\w-]+)', function ($id) { require_admin(); q('DELETE FROM contact_messages WHERE id = ?', [$id]); send_json(['ok' => true]); });

route('GET', '/admin/stats', function () {
    require_admin();
    send_json([
        'members' => (int) val("SELECT COUNT(*) FROM users WHERE role = 'member'"),
        'activeSubs' => (int) val('SELECT COUNT(*) FROM subscriptions WHERE renews_at > ?', [now_iso()]),
        'openRequests' => (int) val("SELECT COUNT(*) FROM sub_requests WHERE status = 'open'"),
        'openContact' => (int) val('SELECT COUNT(*) FROM contact_messages WHERE handled = 0'),
        'posts' => (int) val('SELECT COUNT(*) FROM posts'),
        'messages' => (int) val('SELECT COUNT(*) FROM messages'),
        'storageMb' => round(((int) val('SELECT COALESCE(SUM(size), 0) FROM files')) / 1048576, 1),
    ]);
});

/** Einstellungen der Website (Zahlungstext, Bezahl-Links, E-Mail-Adressen) – in der Verwaltung änderbar. */
route('GET', '/admin/settings', function () {
    require_admin();
    $c = config();
    send_json(['siteName' => $c['site_name'], 'baseUrl' => $c['base_url'], 'mailFrom' => valid_email(mail_from()) ? mail_from() : '', 'notifyEmail' => $c['notify_email'], 'paymentInfo' => $c['payment_info'], 'paymentLinks' => (object) $c['payment_links']]);
});
route('PUT', '/admin/settings', function () {
    require_admin();
    $b = body();
    $links = [];
    foreach (array_keys(plans()) as $k) {
        $l = str($b['paymentLinks'][$k] ?? '', 500);
        if ($l !== '' && !preg_match('#^https://#i', $l)) throw bad('Bezahl-Links müssen mit https:// beginnen.');
        $links[$k] = $l;
    }
    $from = str($b['mailFrom'] ?? '', 200); $notify = str($b['notifyEmail'] ?? '', 200);
    if ($from !== '' && !valid_email($from)) throw bad('Die Absender-Adresse ist ungültig.');
    if ($notify !== '' && !valid_email($notify)) throw bad('Die Benachrichtigungs-Adresse ist ungültig.');
    $info = str($b['paymentInfo'] ?? '', 2000);
    if ($info === '') throw bad('Bitte einen Zahlungstext angeben.');
    save_config(['mail_from' => $from, 'notify_email' => $notify, 'payment_info' => $info, 'payment_links' => $links]);
    send_json(['ok' => true]);
});
route('POST', '/admin/settings/test-mail', function () {
    $u = require_admin();
    $ok = send_mail($u['email'], 'Test-E-Mail – ' . config()['site_name'], 'Der E-Mail-Versand funktioniert', ['Diese Nachricht wurde über deine Website verschickt. Wenn du sie liest, ist alles richtig eingerichtet.']);
    if (!$ok) throw new HttpError(500, 'Die E-Mail konnte nicht versendet werden. Prüfe, ob die Absender-Adresse als Postfach bei deinem Hoster existiert.');
    send_json(['ok' => true, 'to' => $u['email']]);
});

/* ================= Verteilung ================= */

try {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $pos = strpos($uri, '/api');
    $path = $pos === false ? '/' : (substr($uri, $pos + 4) ?: '/');
    $path = preg_replace('#^/index\.php#', '', $path) ?: '/';
    if ($path !== '/') $path = rtrim($path, '/');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $override = strtoupper($_SERVER['HTTP_X_BB_METHOD'] ?? '');
    if ($method === 'POST' && in_array($override, ['PUT', 'DELETE'], true)) $method = $override;
    if ($method === 'HEAD') $method = 'GET';

    // CSRF-Schutz: Ändernde Anfragen brauchen den Header „X-BB: 1“ und müssen von derselben Website kommen
    if ($method !== 'GET') {
        if (($_SERVER['HTTP_X_BB'] ?? '') !== '1') throw new HttpError(403, 'Ungültige Anfrage.');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && parse_url($origin, PHP_URL_HOST) . (parse_url($origin, PHP_URL_PORT) ? ':' . parse_url($origin, PHP_URL_PORT) : '') !== ($_SERVER['HTTP_HOST'] ?? '')) throw new HttpError(403, 'Ungültige Herkunft der Anfrage.');
    }

    $found = false;
    foreach ($routes as [$m, $re, $fn]) {
        if (preg_match($re, $path, $args)) {
            $found = true;
            if ($m === $method) { array_shift($args); $fn(...$args); send_json(['ok' => true]); }
        }
    }
    throw new HttpError($found ? 405 : 404, $found ? 'Diese Aktion ist hier nicht möglich.' : 'Unbekannte Adresse.');
} catch (HttpError $e) {
    send_json(['error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
    try { $logDir = data_dir(); } catch (Throwable $x) { $logDir = sys_get_temp_dir(); }
    @file_put_contents($logDir . '/error.log', '[' . now_iso() . '] ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine() . "\n", FILE_APPEND | LOCK_EX);
    send_json(['error' => 'Interner Fehler. Bitte versuche es später erneut.'], 500);
}
