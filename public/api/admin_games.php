<?php
// admin_games.php – Admin CRUD für Spiele (toggle_visible, delete)
// Nur für authentifizierte Admins zugänglich
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

// ── Admin Guard ───────────────────────────────────────────────────────────────
if (($_SESSION['role'] ?? '') !== 'admin') {
    echo json_encode(['success' => false, 'error' => 'Kein Zugriff – Admin erforderlich']);
    exit;
}

$action = $_POST['action'] ?? '';
$gameId = intval($_POST['game_id'] ?? 0);

if (!$gameId) {
    echo json_encode(['success' => false, 'error' => 'Keine gültige Spiel-ID']);
    exit;
}

$pdo = getDB();

switch ($action) {
    // Sichtbarkeit umschalten
    case 'toggle_visible':
        $pdo->prepare('UPDATE games SET is_visible = NOT is_visible WHERE id = ?')
            ->execute([$gameId]);
        $stmt = $pdo->prepare('SELECT is_visible FROM games WHERE id = ?');
        $stmt->execute([$gameId]);
        $visible = (int) $stmt->fetchColumn();
        echo json_encode(['success' => true, 'is_visible' => $visible], JSON_UNESCAPED_UNICODE);
        break;

    // Spiel löschen (inkl. m:n Verknüpfungen)
    case 'delete':
        $pdo->prepare('DELETE FROM game_genres WHERE game_id = ?')->execute([$gameId]);
        $pdo->prepare('DELETE FROM games WHERE id = ?')->execute([$gameId]);
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Unbekannte Aktion'], JSON_UNESCAPED_UNICODE);
}
