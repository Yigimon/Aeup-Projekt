<?php
// database.example.php – Vorlage für die Datenbankkonfiguration
// Kopiere diese Datei zu config/database.php und passe die Werte an.
// config/database.php ist in .gitignore eingetragen und wird NICHT committet.

define('DB_HOST', 'mysql');          // Docker: 'mysql' | XAMPP: 'localhost'
define('DB_USER', 'root');           // Standard für XAMPP und Docker
define('DB_PASS', '');               // Leer bei XAMPP und Docker (kein Passwort)
define('DB_NAME', 'steam_games_db'); // Datenbankname (siehe schema.sql)
