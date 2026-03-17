<?php
// ============================================
// get_game_details.php - Ein Spiel im Detail
// ?appid=240
// ============================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$appid = isset($_GET['appid']) ? intval($_GET['appid']) : 0;

if ($appid === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'appid fehlt']);
    exit;
}

$pdo = getDB();

$stmt = $pdo->prepare("
    SELECT
        g.*,
        GROUP_CONCAT(gen.name ORDER BY gen.name SEPARATOR ',') AS genres
    FROM games g
    LEFT JOIN game_genres gg ON g.id = gg.game_id
    LEFT JOIN genres gen     ON gg.genre_id = gen.id
    WHERE g.appid = ?
    GROUP BY g.id
    LIMIT 1
");
$stmt->execute([$appid]);
$game = $stmt->fetch();

if (!$game) {
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => 'Spiel nicht gefunden']);
    exit;
}

$game['genres'] = $game['genres'] ? explode(',', $game['genres']) : [];

echo json_encode([
    'success' => true,
    'game'    => $game
], JSON_UNESCAPED_UNICODE);
