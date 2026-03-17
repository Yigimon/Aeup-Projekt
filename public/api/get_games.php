<?php
// get_games.php – Spiele liefern (?genre=, ?search=, ?sale= optional)
// Admins sehen alle Spiele inkl. unsichtbarer; normale Nutzer nur is_visible=1
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$pdo      = getDB();
$genre    = trim($_GET['genre']  ?? '');
$search   = trim($_GET['search'] ?? '');
$sale     = ($_GET['sale']  ?? '') === '1';
$limit    = intval($_GET['limit'] ?? 0);
$isAdmin  = ($_SESSION['role'] ?? '') === 'admin';

// GROUP_CONCAT für Genres (m:n)
$sql = "
    SELECT
        g.id, g.appid, g.name, g.playtime_forever,
        g.img_icon_url, g.img_logo_url,
        g.short_description, g.about_the_game, g.description,
        g.header_image, g.background,
        g.developer, g.publisher, g.release_date,
        g.metacritic_score, g.recommendations,
        g.is_free, g.price_final, g.price_discount,
        g.price_initial_fmt, g.price_final_fmt,
        g.platform_windows, g.platform_mac, g.platform_linux,
        g.required_age, g.screenshots, g.categories,
        g.supported_languages, g.website, g.game_type, g.controller_support,
        GROUP_CONCAT(gen.name ORDER BY gen.name SEPARATOR ',') AS genres
    FROM games g
    LEFT JOIN game_genres gg ON g.id = gg.game_id
    LEFT JOIN genres gen     ON gg.genre_id = gen.id
";

$params = [];
$where  = [];

if ($genre !== '') {
    $where[]  = 'g.id IN (SELECT gg2.game_id FROM game_genres gg2 JOIN genres gen2 ON gg2.genre_id = gen2.id WHERE gen2.name = ?)';
    $params[] = $genre;
}
if ($search !== '') {
    $where[]  = 'g.name LIKE ?';
    $params[] = "%$search%";
}
if ($sale) {
    $where[] = 'g.price_discount > 0';
}

// Nur sichtbare Spiele für normale Nutzer
if (!$isAdmin) {
    $where[] = 'g.is_visible = 1';
}
if (!empty($where)) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}

$sql .= " GROUP BY g.id ORDER BY g.name ASC";
if ($limit > 0) {
    $sql .= " LIMIT " . (int) $limit;
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$games = $stmt->fetchAll();

foreach ($games as &$game) {
    $game['genres']     = $game['genres']     ? explode(',', $game['genres'])          : [];
    $game['categories'] = $game['categories'] ? json_decode($game['categories'], true) : [];
    $game['screenshots']= $game['screenshots'] ? json_decode($game['screenshots'], true): [];
}

echo json_encode([
    'success' => true,
    'count'   => count($games),
    'games'   => $games
], JSON_UNESCAPED_UNICODE);
