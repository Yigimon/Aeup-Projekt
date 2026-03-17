# Steam Games – Netflix-Style Bibliothek

Eine lokale Webanwendung im Netflix-Stil, die eine kuratierte Bibliothek von Steam-Spielen anzeigt.  
Technologie-Stack: **PHP · MySQL · Vanilla JS · HTML · CSS**

---

## Funktionen

- Alle Spiele in einem responsiven Grid mit Cover-Bildern
- Genre-Filter und Spielname-Suche
- Detailansicht (Modal) mit Screenshots, Beschreibung, Metadaten und Preis
- Kachelgröße anpassbar (XS / S / M)
- Design nach dem **Catppuccin Mocha**-Farbschema

---

## Projektstruktur

```
Aeup-Projekt/
│
├── data/
│   └── steam-games.json        ← Quelldatei: 192 Steam-Spiele
├── package.json                ← Node.js Abhängigkeiten (mysql2, node-fetch)
│
├── database/
│   ├── schema.sql              ← Datenbankstruktur (Tabellen, Indizes, View)
│   ├── expand-import.js        ← Importiert und erweitert die DB auf 500 Spiele
│   └── README.md               ← Datenbank-Dokumentation
│
├── public/                     ← PHP-Server Root (localhost:8080)
│   ├── index.html              ← Single Page Application
│   ├── css/
│   │   └── style.css           ← Gesamtes Styling (Catppuccin Mocha)
│   ├── js/
│   │   └── app.js              ← Gesamte Frontend-Logik
│   └── api/
│       ├── db.php              ← PDO-Datenbankverbindung (Singleton)
│       ├── get_games.php       ← Spiele-Endpunkt (GET, Filter + Suche)
│       ├── get_genres.php      ← Genres-Endpunkt (GET)
│       ├── get_game_details.php← Einzelspiel-Endpunkt (GET)
│       ├── admin_games.php     ← Admin-Endpunkt (CRUD)
│       └── auth.php            ← Authentifizierung
│
├── Dockerfile                  ← PHP 8.2 Apache Container
├── docker-compose.yml          ← MySQL + PHP Container-Setup
└── DOKUMENTATION.md            ← Vollständige technische Dokumentation
```

---

## Schnellstart (Docker)

```bash
docker-compose up -d
```

Die Anwendung ist dann erreichbar unter: **http://localhost:8080**

---

## Schnellstart (XAMPP / manuell)

### 1. Datenbank einrichten

1. XAMPP starten (MySQL + Apache)
2. In phpMyAdmin: `steam-games.json`-Daten importieren via:

```powershell
node database/expand-import.js
```

### 2. PHP-Server starten

```powershell
Start-Process "C:\xampp\php\php.exe" -ArgumentList "-S", "localhost:8080", "-t", ".\public" -WindowStyle Hidden
```

Dann im Browser: **http://localhost:8080**

---

## Datenbankschema

Das Schema implementiert eine **m:n-Beziehung** zwischen Spielen und Genres:

```
games ──< game_genres >── genres
```

- Ein Spiel kann mehrere Genres haben (z.B. Counter-Strike: Action + Multiplayer)
- Ein Genre gehört zu vielen Spielen

Vollständige Schema-Dokumentation: [`database/schema.sql`](database/schema.sql)

---

## Abhängigkeiten

| Paket | Version | Zweck |
|---|---|---|
| `mysql2` | ^3.18 | Node.js MySQL-Treiber für Import-Skripte |
| `node-fetch` | ^2.7 | HTTP-Requests an Steam/SteamSpy API |

```bash
npm install
```

---

## Dokumentation

Vollständige technische Dokumentation: [`DOKUMENTATION.md`](DOKUMENTATION.md)
