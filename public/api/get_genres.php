<?php
// get_genres.php – Alle Genres mit Spielanzahl liefern
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$stmt = getDB()->query("
    SELECT
        gen.id,
        gen.name,
        COUNT(gg.game_id) AS game_count
    FROM genres gen
    LEFT JOIN game_genres gg ON gen.id = gg.genre_id
    GROUP BY gen.id, gen.name
    HAVING game_count > 0
    ORDER BY gen.name ASC
");

echo json_encode(['success' => true, 'genres' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
