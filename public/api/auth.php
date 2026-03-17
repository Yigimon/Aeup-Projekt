<?php
// auth.php – Login / Register / Logout / Me
// Aktionen via POST action= : login | register | logout | me
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'register': handleRegister(); break;
    case 'login':    handleLogin();    break;
    case 'logout':   handleLogout();   break;
    case 'me':       handleMe();       break;
    default:         respond(['success' => false, 'error' => 'Unbekannte Aktion']);
}

// ── Handler ───────────────────────────────────────────────────────────────────

function handleRegister(): void {
    $username = trim($_POST['username'] ?? '');
    $email    = trim($_POST['email']    ?? '');
    $password =      $_POST['password'] ?? '';

    if (!$username || !$email || !$password)
        respond(['success' => false, 'error' => 'Alle Felder ausfüllen']);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        respond(['success' => false, 'error' => 'Ungültige E-Mail-Adresse']);

    if (strlen($password) < 6)
        respond(['success' => false, 'error' => 'Passwort mind. 6 Zeichen']);

    $pdo  = getDB();
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
    $stmt->execute([$username, $email]);
    if ($stmt->fetch())
        respond(['success' => false, 'error' => 'Nutzername oder E-Mail bereits vergeben']);

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $pdo->prepare('INSERT INTO users (username, email, password_hash, role_id) VALUES (?, ?, ?, 1)')
        ->execute([$username, $email, $hash]);

    startUserSession((int)$pdo->lastInsertId(), $username, 'user');
    respond(['success' => true, 'user' => currentUser()]);
}

function handleLogin(): void {
    $username = trim($_POST['username'] ?? '');
    $password =      $_POST['password'] ?? '';

    if (!$username || !$password)
        respond(['success' => false, 'error' => 'Nutzername und Passwort eingeben']);

    $stmt = getDB()->prepare(
        'SELECT u.id, u.username, u.password_hash, r.name AS role
         FROM users u JOIN roles r ON u.role_id = r.id
         WHERE u.username = ?'
    );
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash']))
        respond(['success' => false, 'error' => 'Ungültige Anmeldedaten']);

    startUserSession($user['id'], $user['username'], $user['role']);
    respond(['success' => true, 'user' => currentUser()]);
}

function handleLogout(): void {
    session_destroy();
    respond(['success' => true]);
}

function handleMe(): void {
    respond(['success' => true, 'user' => currentUser()]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startUserSession(int $id, string $username, string $role): void {
    session_regenerate_id(true);
    $_SESSION['user_id']  = $id;
    $_SESSION['username'] = $username;
    $_SESSION['role']     = $role;
}

function currentUser(): ?array {
    if (!isset($_SESSION['user_id'])) return null;
    return [
        'id'       => $_SESSION['user_id'],
        'username' => $_SESSION['username'],
        'role'     => $_SESSION['role'],
    ];
}

function respond(array $data): never {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
