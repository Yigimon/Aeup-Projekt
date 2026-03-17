<?php
// get_game_details.php – Ein einzelnes Spiel im Detail liefern (?appid=)
// Respektiert is_visible: normale Nutzer sehen keine unsichtbaren Spiele
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$appid   = isset($_GET['appid']) ? intval($_GET['appid']) : 0;
$isAdmin = ($_SESSION['role'] ?? '') === 'admin';

if ($appid === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'appid fehlt']);
    exit;
}

$pdo = getDB();

// Explizite Spalten statt SELECT * – Principle 9: nur benötigte Daten laden
// JOIN löst die m:n Beziehung games ↔ game_genres ↔ genres auf
$sql = "
    SELECT
        g.id, g.appid, g.name, g.is_visible,
        g.img_icon_url, g.img_logo_url,
        g.short_description, g.about_the_game, g.description,
        g.header_image, g.background, g.screenshots,
        g.developer, g.publisher, g.release_date, g.game_type, g.website,
        g.metacritic_score, g.recommendations,
        g.is_free, g.price_final, g.price_discount,
        g.price_initial_fmt, g.price_final_fmt,
        g.platform_windows, g.platform_mac, g.platform_linux,
        g.required_age, g.controller_support, g.supported_languages, g.categories,
        GROUP_CONCAT(gen.name ORDER BY gen.name SEPARATOR ',') AS genres
    FROM games g
    LEFT JOIN game_genres gg ON g.id = gg.game_id
    LEFT JOIN genres gen     ON gg.genre_id = gen.id
    WHERE g.appid = ?
";
if (!$isAdmin) $sql .= ' AND g.is_visible = 1';
$sql .= ' GROUP BY g.id LIMIT 1';

$stmt = $pdo->prepare($sql);
$stmt->execute([$appid]);
$game = $stmt->fetch();

if (!$game) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Spiel nicht gefunden']);
    exit;
}

$game['genres']     = $game['genres']     ? explode(',', $game['genres'])          : [];
$game['categories'] = $game['categories'] ? json_decode($game['categories'], true) : [];
$game['screenshots']= $game['screenshots']? json_decode($game['screenshots'], true) : [];

echo json_encode([
    'success' => true,
    'game'    => $game
], JSON_UNESCAPED_UNICODE);
