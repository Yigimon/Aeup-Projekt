# Steam Games – Projektdokumentation

## Inhaltsverzeichnis

1. [Projektübersicht](#1-projektübersicht)
2. [Technologie-Stack](#2-technologie-stack)
3. [Projektstruktur](#3-projektstruktur)
4. [Datenbankarchitektur](#4-datenbankarchitektur)
   - 4.1 [Tabelle: games](#41-tabelle-games)
   - 4.2 [Tabelle: genres](#42-tabelle-genres)
   - 4.3 [Tabelle: game_genres (m:n)](#43-tabelle-game_genres-mn-beziehung)
   - 4.4 [View: games_with_genres](#44-view-games_with_genres)
   - 4.5 [Datenbankdiagramm (ER)](#45-datenbankdiagramm-er)
5. [Import-Skripte](#5-import-skripte)
   - 5.1 [import.js](#51-importjs)
   - 5.2 [expand-import.js](#52-expand-importjs)
6. [Backend (PHP-API)](#6-backend-php-api)
   - 6.1 [db.php](#61-dbphp)
   - 6.2 [get_games.php](#62-get_gamesphp)
   - 6.3 [get_genres.php](#63-get_genresphp)
7. [Frontend](#7-frontend)
   - 7.1 [index.html](#71-indexhtml)
   - 7.2 [style.css](#72-stylecss)
   - 7.3 [app.js](#73-appjs)
8. [Datenfluss](#8-datenfluss)
9. [Externe APIs](#9-externe-apis)
10. [Server-Setup (XAMPP)](#10-server-setup-xampp)
11. [Wichtige Konfigurationswerte](#11-wichtige-konfigurationswerte)

---

## 1. Projektübersicht

**Steam Games** ist eine lokale Webanwendung im Netflix-Stil, die eine kuratierte Bibliothek von Steam-Spielen anzeigt. Die Spieldaten stammen aus einer lokalen `steam-games.json`-Datei und werden durch Daten der offiziellen **Steam Store API** angereichert. Alle Daten werden in einer lokalen **MySQL-Datenbank** gespeichert und über eine **PHP-API** an das Frontend geliefert.

**Kernfunktionen:**
- Alle Spiele in einem responsiven Grid mit Cover-Bildern anzeigen
- Nach Genre filtern und nach Spielname suchen
- Detailansicht (Modal) mit Screenshots, Beschreibung, Metadaten und Preis
- Kachelgröße anpassbar (XS / S / M)
- Design nach dem **Catppuccin Mocha**-Farbschema

---

## 2. Technologie-Stack

| Schicht | Technologie | Version / Details |
|---|---|---|
| Datenbank | MySQL (via XAMPP) | utf8mb4, InnoDB |
| Backend | PHP | Eingebauter Dev-Server (`php -S`) |
| Datenbankabstraktion | PDO (PHP) | Singleton-Pattern |
| Import-Skripte | Node.js | v24, `mysql2`, `node-fetch@2` |
| Frontend | Vanilla HTML / CSS / JavaScript | Kein Framework |
| Design-System | Catppuccin Mocha | Eigene Farbpalette |
| Bild-CDN | Steam Community CDN | Externe URLs |

---

## 3. Projektstruktur

```
Aeup-Projekt/
│
├── data/
│   └── steam-games.json        ← Quelldatei: 192 Steam-Spiele (Basisfelder)
├── package.json                ← Node.js Abhängigkeiten (mysql2, node-fetch)
├── Dockerfile                  ← PHP 8.2 Apache Container
├── docker-compose.yml          ← MySQL + PHP Container-Setup
├── README.md                   ← Projektübersicht (GitHub)
│
├── database/
│   ├── schema.sql              ← Datenbankstruktur (Tabellen, Indizes, View)
│   ├── expand-import.js        ← Importiert & erweitert DB auf 500 Spiele (via Steam + SteamSpy)
│   └── README.md               ← Datenbank-Dokumentation
│
└── public/                     ← PHP-Server Root (localhost:8080)
    ├── index.html              ← Einzige HTML-Seite (Single Page)
    ├── css/
    │   └── style.css           ← Gesamtes Styling (Catppuccin Mocha)
    ├── js/
    │   └── app.js              ← Gesamte Frontend-Logik
    └── api/
        ├── db.php              ← PDO-Datenbankverbindung (Singleton)
        ├── get_games.php       ← Spiele-Endpunkt (GET, Filter + Suche)
        ├── get_genres.php      ← Genres-Endpunkt (GET)
        └── get_game_details.php← Einzelspiel-Endpunkt (GET)
```

---

## 4. Datenbankarchitektur

Datenbankname: `steam_games_db`  
Zeichensatz: `utf8mb4` / `utf8mb4_unicode_ci` (vollständige Unicode-Unterstützung inkl. Emojis)

### 4.1 Tabelle: `games`

Speichert alle Spieledaten. Die Tabelle hat **32 Spalten**, gruppenweise erklärt:

#### Identifikation

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Primärschlüssel (intern) |
| `appid` | INT UNIQUE NOT NULL | Steam App-ID (eindeutig, Fremdschlüssel-Basis) |
| `name` | VARCHAR(255) NOT NULL | Spielname |

#### Quelldaten aus `steam-games.json`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `playtime_forever` | INT | Gespielte Minuten (aus dem Steam-Account der Quelle) |
| `img_icon_url` | VARCHAR(100) | Hash für das 32×32 Icon-Bild |
| `img_logo_url` | VARCHAR(100) | Hash für das Logo-Bild |
| `has_community_visible_stats` | TINYINT(1) | Hat das Spiel öffentliche Statistiken? |

> **Bild-URL-Konstruktion:** Die Hashes werden so zu echten URLs:  
> `https://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{hash}.jpg`

#### Beschreibungen (Steam Store API)

| Spalte | Typ | Beschreibung |
|---|---|---|
| `short_description` | TEXT | Kurzbeschreibung (Plain Text, ~200 Zeichen) |
| `about_the_game` | MEDIUMTEXT | Ausführliche Beschreibung (HTML, kann Bilder/Listen enthalten) |
| `description` | TEXT | `detailed_description` aus der API (HTML) |

#### Bilder (Steam Store API)

| Spalte | Typ | Beschreibung |
|---|---|---|
| `header_image` | VARCHAR(255) | Vollständige URL des Header-Bildes (460×215px) |
| `background` | VARCHAR(512) | Vollständige URL des Hintergrundbildes |
| `screenshots` | TEXT | **JSON-Array** mit bis zu 6 Screenshot-URLs (1920×1080, `path_full`) |

#### Publisher & Release

| Spalte | Typ | Beschreibung |
|---|---|---|
| `developer` | VARCHAR(255) | Entwicklerstudio(s), kommagetrennt |
| `publisher` | VARCHAR(255) | Publisher(s), kommagetrennt |
| `release_date` | VARCHAR(50) | Erscheinungsdatum als String (z.B. `"21 Aug, 2012"`) |
| `game_type` | VARCHAR(20) | Typ: `game`, `dlc`, `demo`, `mod`, ... |
| `website` | VARCHAR(512) | Offizielle Spielwebsite (kann NULL sein) |

#### Bewertungen & Statistiken

| Spalte | Typ | Beschreibung |
|---|---|---|
| `metacritic_score` | INT | Metacritic-Wertung (0–100, NULL wenn nicht vorhanden) |
| `recommendations` | INT | Anzahl positiver Steam-Empfehlungen |

#### Preisinformationen

| Spalte | Typ | Beschreibung |
|---|---|---|
| `is_free` | TINYINT(1) | 1 = kostenlos (Free-to-Play) |
| `price_final` | INT | Endpreis in **Cent** (z.B. 999 = 9,99 €) |
| `price_discount` | INT | Rabatt in Prozent (0–100) |
| `price_initial_fmt` | VARCHAR(30) | Originalpreis formatiert (z.B. `"9,99€"`) |
| `price_final_fmt` | VARCHAR(30) | Endpreis formatiert (z.B. `"4,99€"`) |

#### Plattformen

| Spalte | Typ | Beschreibung |
|---|---|---|
| `platform_windows` | TINYINT(1) | Verfügbar für Windows |
| `platform_mac` | TINYINT(1) | Verfügbar für macOS |
| `platform_linux` | TINYINT(1) | Verfügbar für Linux |

#### Features & Anforderungen

| Spalte | Typ | Beschreibung |
|---|---|---|
| `required_age` | INT | Mindestalter (0 = keine Beschränkung) |
| `controller_support` | VARCHAR(20) | `full` = vollständig, `partial` = teilweise, NULL = keiner |
| `supported_languages` | TEXT | Unterstützte Sprachen (HTML-String von Steam, enthält `<br>` / `<strong>`) |
| `categories` | TEXT | **JSON-Array** mit Steam-Kategorien (z.B. `["Single-player", "Co-op", "Steam Achievements"]`) |

#### Zeitstempel

| Spalte | Typ | Beschreibung |
|---|---|---|
| `created_at` | TIMESTAMP | Zeitpunkt des Einfügens (automatisch) |
| `updated_at` | TIMESTAMP | Zeitpunkt der letzten Änderung (automatisch) |

**Indizes:** `idx_appid` (appid), `idx_name` (name) für schnelle Suche

---

### 4.2 Tabelle: `genres`

Speichert alle bekannten Steam-Genres. Wird durch `import.js` automatisch befüllt.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Primärschlüssel |
| `name` | VARCHAR(100) UNIQUE | Genre-Name (z.B. `"Action"`, `"RPG"`, `"Indie"`) |
| `description` | VARCHAR(255) | Optionale Beschreibung (aktuell nicht genutzt) |
| `created_at` | TIMESTAMP | Zeitpunkt des Einfügens |

**Aktuell vorhanden (Beispiele):** Action, Adventure, Casual, Free To Play, Indie, Massively Multiplayer, RPG, Simulation, Sports, Strategy

---

### 4.3 Tabelle: `game_genres` (m:n Beziehung)

Diese Tabelle realisiert die **Viele-zu-viele-Beziehung** zwischen Spielen und Genres.

**Warum m:n?**  
Ein Spiel kann mehrere Genres haben (z.B. Counter-Strike: Action + Multiplayer), und ein Genre gehört zu vielen Spielen. Eine direkte Spalte `genre` in der `games`-Tabelle würde Datenbankregeln verletzen (1. Normalform).

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | INT AUTO_INCREMENT | Primärschlüssel |
| `game_id` | INT NOT NULL | Fremdschlüssel → `games.id` |
| `genre_id` | INT NOT NULL | Fremdschlüssel → `genres.id` |
| `created_at` | TIMESTAMP | Zeitpunkt des Einfügens |

**Constraints:**
- `UNIQUE KEY (game_id, genre_id)` – verhindert doppelte Zuordnungen
- `FOREIGN KEY game_id → games.id ON DELETE CASCADE` – löscht Verknüpfungen automatisch wenn ein Spiel gelöscht wird
- `FOREIGN KEY genre_id → genres.id ON DELETE CASCADE` – löscht Verknüpfungen automatisch wenn ein Genre gelöscht wird

---

### 4.4 View: `games_with_genres`

Ein **virtueller View**, der alle Spiele inklusive ihrer Genres als kommaseparierten String liefert. Nützlich für schnelle Abfragen ohne manuellen JOIN.

```sql
SELECT * FROM games_with_genres WHERE name LIKE '%Half-Life%';
-- → id, appid, name, ..., genres = "Action, Shooter"
```

Die Genres werden via `GROUP_CONCAT(gen.name ORDER BY gen.name SEPARATOR ', ')` zusammengefasst.

---

### 4.5 Datenbankdiagramm (ER)

```
┌─────────────────────────────────────────┐
│                  games                  │
│─────────────────────────────────────────│
│ PK  id              INT AUTO_INCREMENT  │
│ UK  appid           INT                 │
│     name            VARCHAR(255)        │
│     playtime_forever INT                │
│     img_icon_url    VARCHAR(100)        │
│     img_logo_url    VARCHAR(100)        │
│     header_image    VARCHAR(255)        │
│     background      VARCHAR(512)        │
│     short_description TEXT              │
│     about_the_game  MEDIUMTEXT          │
│     developer       VARCHAR(255)        │
│     publisher       VARCHAR(255)        │
│     release_date    VARCHAR(50)         │
│     game_type       VARCHAR(20)         │
│     metacritic_score INT                │
│     recommendations  INT               │
│     is_free         TINYINT(1)          │
│     price_final     INT                 │
│     price_discount  INT                 │
│     price_initial_fmt VARCHAR(30)       │
│     price_final_fmt VARCHAR(30)         │
│     platform_windows TINYINT(1)         │
│     platform_mac    TINYINT(1)          │
│     platform_linux  TINYINT(1)          │
│     controller_support VARCHAR(20)      │
│     supported_languages TEXT            │
│     categories      TEXT (JSON)         │
│     screenshots     TEXT (JSON)         │
│     website         VARCHAR(512)        │
│     required_age    INT                 │
│     created_at      TIMESTAMP           │
│     updated_at      TIMESTAMP           │
└────────────────┬────────────────────────┘
                 │ 1
                 │
                 │ n
┌────────────────┴────────────────────────┐
│              game_genres                │
│─────────────────────────────────────────│
│ PK  id         INT AUTO_INCREMENT       │
│ FK  game_id    INT → games.id           │
│ FK  genre_id   INT → genres.id          │
│     created_at TIMESTAMP               │
└────────────────┬────────────────────────┘
                 │ n
                 │
                 │ 1
┌────────────────┴────────────────────────┐
│                 genres                  │
│─────────────────────────────────────────│
│ PK  id         INT AUTO_INCREMENT       │
│ UK  name       VARCHAR(100)             │
│     description VARCHAR(255)            │
│     created_at TIMESTAMP               │
└─────────────────────────────────────────┘
```

---

## 5. Import-Skripte

### 5.1 `expand-import.js`

**Zweck:** Importiert die 192 Spiele aus `steam-games.json` und füllt die Datenbank mit weiteren populären Steam-Spielen bis zum Ziel von 500 Spielen. Nutzt **SteamSpy** als Quelle für weitere AppIDs.

**Ausführung:**
```powershell
node database/expand-import.js
```

**Ablauf:**

```
1. steam-games.json lesen → Basisspiele importieren
        ↓
2. Aktuelle Spielanzahl in DB prüfen
        ↓
3. Falls bereits ≥ 500: Abbruch
        ↓
4. SteamSpy-Endpunkte abfragen (top100forever, top100in2weeks,
   top100owned + 10 Genre-Listen) → bis zu ~3000 AppIDs sammeln
        ↓
5. Bereits in DB vorhandene AppIDs herausfiltern
        ↓
5. Für jede neue AppID bis Ziel erreicht:
   a) Steam Store API abfragen
   b) Nur type='game' importieren (DLCs, Demos überspringen)
   c) Alle Felder speichern wie in import.js
   d) Genres verknüpfen
   e) 400ms warten
        ↓
6. Zusammenfassung ausgeben
```

**Konfiguration:**
```javascript
const TARGET          = 500;  // Ziel-Spielanzahl in der DB
const API_DELAY       = 400;  // ms zwischen Steam-API Anfragen
const STEAMSPY_DELAY  = 1500; // ms zwischen SteamSpy-Anfragen
```

**SteamSpy-Endpunkte:**

| URL | Liefert |
|---|---|
| `?request=top100forever` | Alle Zeiten meistgespielt |
| `?request=top100in2weeks` | Letzte 2 Wochen meistgespielt |
| `?request=top100owned` | Meistbesessene Spiele |
| `?request=genre&genre=action` | Populäre Spiele je Genre |

---

## 6. Backend (PHP-API)

Der PHP-Server (oder Docker) wird unter **`http://localhost:8080`** betrieben.

Alle API-Endpunkte liefern **JSON** mit `Content-Type: application/json; charset=utf-8`.

---

### 6.1 `db.php`

**Zweck:** Stellt die PDO-Datenbankverbindung bereit. Wird von allen anderen PHP-Dateien eingebunden.

**Singleton-Pattern:** Die Verbindung wird beim ersten Aufruf aufgebaut und danach wiederverwendet (statische Variable `$pdo`). Das verhindert unnötige mehrfache Verbindungsaufbauten pro Request.

```php
require_once 'db.php';
$pdo = getDB(); // Gibt immer dieselbe PDO-Instanz zurück
```

**Konfiguration (in der Datei):**
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');            // Kein Passwort (XAMPP-Standard)
define('DB_NAME', 'steam_games_db');
```

---

### 6.2 `get_games.php`

**URL:** `http://localhost:8080/api/get_games.php`

**Parameter (optional, per GET):**

| Parameter | Typ | Beschreibung | Beispiel |
|---|---|---|---|
| `genre` | string | Filter nach Genre-Name | `?genre=Action` |
| `search` | string | Suche im Spielnamen (LIKE) | `?search=Half-Life` |

**Antwort-Struktur:**
```json
{
  "success": true,
  "count": 42,
  "games": [
    {
      "id": 1,
      "appid": 240,
      "name": "Counter-Strike: Source",
      "header_image": "https://cdn.akamai.steamstatic.com/...",
      "short_description": "...",
      "genres": ["Action", "Free To Play"],
      "categories": ["Single-player", "Multi-player", "Steam Achievements"],
      ...
    }
  ]
}
```

**Wichtig:** Die Felder `genres` (STRING in DB) und `categories` (JSON-STRING in DB) werden serverseitig umgewandelt:
- `genres`: `"Action,RPG"` → `["Action", "RPG"]` (explode)
- `categories`: `'["Single-player","Co-op"]'` → `["Single-player", "Co-op"]` (json_decode)

**SQL-Logik:**

Für den Genre-Filter wird ein Subquery verwendet, der die m:n-Verknüpfung korrekt filtert:
```sql
WHERE g.id IN (
  SELECT gg2.game_id FROM game_genres gg2
  JOIN genres gen2 ON gg2.genre_id = gen2.id
  WHERE gen2.name = ?
)
```

Die Genres werden für jedes Spiel via `GROUP_CONCAT` aggregiert:
```sql
GROUP_CONCAT(gen.name ORDER BY gen.name SEPARATOR ',') AS genres
```

---

### 6.3 `get_genres.php`

**URL:** `http://localhost:8080/api/get_genres.php`

**Parameter:** keine

**Antwort-Struktur:**
```json
{
  "success": true,
  "genres": [
    { "id": 1, "name": "Action",    "game_count": 390 },
    { "id": 2, "name": "Adventure", "game_count": 180 },
    ...
  ]
}
```

Gibt nur Genres zurück, die mindestens einem Spiel zugeordnet sind (`HAVING game_count > 0`). Alphabetisch sortiert.

---

## 7. Frontend

Das Frontend ist eine **Single Page Application (SPA)** ohne Frameworks – nur HTML, CSS und Vanilla JavaScript.

---

### 7.1 `index.html`

Die einzige HTML-Datei. Enthält die komplette Seitenstruktur:

```
<header>
  Logo (STEAM GAMES) + Suchleiste

<main>
  <section class="filter-section">
    Genre-Filter-Buttons (werden dynamisch befüllt)
  
  <div class="size-picker">
    Kachel-Größen-Buttons (XS / S / M)
  
  <section class="games-section">
    Sektion-Titel + Games-Grid

<div id="gameModal" class="modal">
  Modal-Overlay
  └── modal-content
      ├── Screenshot-Slider (img + prev/next + dots)
      └── modal-body
          ├── Titel + Metacritic-Badge
          ├── Genre-Tags (lila) + Kategorie-Tags (blau)
          ├── Kurzbeschreibung
          ├── <details> "Über das Spiel" (ausklappbar)
          ├── Info-Grid (8 Felder: Entwickler, Publisher, ...)
          ├── Sprachen
          └── Website-Button

<script src="js/app.js">
```

**Genre-Tags vs. Kategorie-Tags:**
- **Genre-Tags** (lila): Stammen aus der m:n-Genres-Tabelle (z.B. Action, RPG)
- **Kategorie-Tags** (blau): Stammen aus dem JSON-Feld `categories` in der games-Tabelle (z.B. Single-player, Co-op, Steam Achievements). Das sind Steam-interne Feature-Tags.

---

### 7.2 `style.css`

**Design-System:** Catppuccin Mocha Farbpalette

| CSS-Variable (Kommentar) | Hex-Wert | Verwendung |
|---|---|---|
| Base | `#1e1e2e` | Seiten-Hintergrund, info-item Hintergrund |
| Mantle | `#181825` | Header, Modal-Hintergrund |
| Crust | `#11111b` | Modal-Overlay, Slider-Hintergrund |
| Surface0 | `#313244` | Karten, Buttons, about-details |
| Surface1 | `#45475a` | Hover-Zustände, Borders |
| Overlay0 | `#6c7086` | Deaktivierter Text, Labels, Placeholder |
| Text | `#cdd6f4` | Haupttext, Titel |
| Subtext0 | `#a6adc8` | Sekundärer Text, Beschreibungen |
| Mauve | `#cba6f7` | Logo, aktiver Genre-Button, aktiver Size-Button, Card-Hover-Border, Slider-Dots |
| Blue | `#89b4fa` | Kategorie-Tags, Website-Button |
| Green | `#a6e3a1` | Metacritic gut (≥75), aktiver Size-Button |
| Yellow | `#f9e2af` | Metacritic mittel (50–74) |
| Red | `#f38ba8` | Metacritic schlecht (<50), Close-Button Hover |
| Teal | `#94e2d5` | Website-Button Hover |

**Wichtige CSS-Klassen:**

| Klasse | Beschreibung |
|---|---|
| `.header.scrolled` | Header wird beim Scrollen undurchsichtig |
| `.games-grid.size-xs/s/m` | Steuert die Kachelgröße via CSS Grid `minmax()` |
| `.game-card:hover` | Scale 1.06 + Mauve-Border-Glow |
| `.game-overlay` | Hover-Overlay mit Spieltitel (opacity 0→1) |
| `.modal` | Fixed-Overlay über die gesamte Seite |
| `.metacritic-badge` / `.mixed` / `.poor` | Farbige Bewertungsbadges |
| `.genre-tag` | Mauve-gefüllte Tag-Pills |
| `.category-tag` | Blue-umrandete Tag-Pills |
| `.about-details` | `<details>` Element mit Animation |
| `.modal-info-grid` | 2-spaltiges CSS-Grid für Metadaten |

---

### 7.3 `app.js`

**Einstiegspunkt:** `DOMContentLoaded` Event

```javascript
document.addEventListener('DOMContentLoaded', () => {
    initHeaderScroll();  // Header-Effekt beim Scrollen
    initModal();         // Modal-Events registrieren
    initSizePicker();    // Größen-Buttons aktivieren
    initSearch();        // Suche initialisieren
    loadGenres();        // Genres von API laden & Buttons rendern
    loadGames();         // Alle Spiele laden & Grid rendern
});
```

**Alle Funktionen im Überblick:**

#### Hilfsfunktionen (Single Source of Truth)

| Funktion | Beschreibung |
|---|---|
| `el(id)` | Shortcut für `document.getElementById(id)` |
| `setText(id, val)` | Setzt Textinhalt, zeigt `'—'` bei fehlendem Wert |
| `escapeHtml(str)` | Escaped HTML-Sonderzeichen (`&`, `<`, `>`, `"`) für sichere Ausgabe |
| `buildLogoUrl(appid, hash)` | Baut vollständige Steam-CDN-URL aus AppID und Hash |
| `renderTags(container, items, className)` | Rendert eine Liste von Tags in einen Container (genutzt für Genre- UND Kategorie-Tags) |
| `formatPlatforms(game)` | Gibt `"Windows · Mac"` etc. zurück |
| `formatController(val)` | `"full"` → `"Vollständig"`, `"partial"` → `"Teilweise"` |
| `formatPrice(game)` | Formatiert Preis inkl. Rabatt oder `"Kostenlos"` |

#### Init-Funktionen (einmalig beim Laden)

| Funktion | Beschreibung |
|---|---|
| `initHeaderScroll()` | Fügt `.scrolled`-Klasse am Header hinzu, wenn Seite gescrollt wird |
| `initSizePicker()` | Bindet Click-Events an die Kachelgrößen-Buttons, schaltet CSS-Klassen |
| `initSearch()` | Debounced Input-Handler (400ms), startet `loadGames()` nach Eingabe |
| `initModal()` | Registriert alle Modal-Events (Close-Button, Backdrop-Click, Tastatur-Shortcuts, Slider-Buttons) |

#### Datenladen

| Funktion | Parameter | Beschreibung |
|---|---|---|
| `loadGenres()` | – | `GET /api/get_genres.php` → rendert Genre-Buttons |
| `loadGames(genre, search)` | optional | `GET /api/get_games.php` → zeigt Loading, ruft `renderGames()` |
| `renderGames(games)` | Array | Leert Grid, erstellt für jedes Spiel eine Karte |
| `createGameCard(game)` | game-Objekt | Erstellt `.game-card` div mit Bild + Hover-Overlay |

#### Filter & Suche

| Funktion | Beschreibung |
|---|---|
| `filterByGenre(genre, btn)` | Entfernt alle aktiven Genre-Buttons, setzt neuen aktiv, ruft `loadGames(genre)` |
| `initSearch()` | Debounce 400ms, resettet Genre-Filter auf "Alle", ruft `loadGames('', suchbegriff)` |

#### Modal

| Funktion | Beschreibung |
|---|---|
| `openModal(game)` | Befüllt alle Felder des Modals + Slider, zeigt Modal |
| `closeModal()` | Versteckt Modal, stellt `overflow` am Body wieder her |
| `initModal()` | Event-Listener: Close-Button, Backdrop-Click, ESC-Taste, Pfeiltasten |
| `changeSlide(dir)` | Wechselt Screenshot um ±1 |
| `updateSlider()` | Aktualisiert Bild + Dots + Sichtbarkeit der Slider-Buttons |

#### Keyboard-Shortcuts im Modal

| Taste | Aktion |
|---|---|
| `Escape` | Modal schließen |
| `←` Arrow Left | Vorheriger Screenshot |
| `→` Arrow Right | Nächster Screenshot |

---

## 8. Datenfluss

### Beim Seitenaufruf

```
Browser öffnet localhost:8888
        ↓
PHP-Server liefert index.html + style.css + app.js
        ↓
app.js: DOMContentLoaded
  ├── loadGenres() → GET /api/get_genres.php
  │     └── PHP → MySQL: SELECT genres + COUNT
  │           → JSON an Browser → Genre-Buttons rendern
  │
  └── loadGames() → GET /api/get_games.php
        └── PHP → MySQL: SELECT games + GROUP_CONCAT(genres)
              → JSON an Browser → createGameCard() für jedes Spiel
```

### Bei Klick auf Genre-Button

```
filterByGenre("Action", button)
  ├── Alle .genre-btn → remove 'active'
  ├── Geklickter Button → add 'active'
  └── loadGames("Action")
        → GET /api/get_games.php?genre=Action
              PHP → MySQL: WHERE g.id IN (subquery für Genre)
                    → Gefilterte Spiele → Grid neu rendern
```

### Bei Klick auf eine Spielkarte

```
game-card click → openModal(game)
  ├── Screenshots aus game.screenshots (JSON) parsen
  ├── sliderImages aufbauen (header_image + screenshots)
  ├── updateSlider() → erstes Bild anzeigen
  ├── Titel + Metacritic-Badge setzen
  ├── renderTags() für Genre-Tags (lila)
  ├── renderTags() für Kategorie-Tags (blau)
  ├── Beschreibung setzen
  ├── about_the_game (HTML) in <details> einfügen
  ├── Info-Grid: setText() für alle 8 Felder
  │     (Developer, Publisher, Release, Typ,
  │      Plattformen, Controller, Empfehlungen, Preis)
  ├── Sprachen (HTML bereinigt) anzeigen
  └── Website-Link setzen
```

---

## 9. Externe APIs

### Steam Store API

**Basis-URL:** `https://store.steampowered.com/api/appdetails`

**Anfrage:**
```
GET https://store.steampowered.com/api/appdetails?appids={appid}&l=de
```

**Antwort-Struktur:**
```json
{
  "240": {
    "success": true,
    "data": {
      "type": "game",
      "name": "Counter-Strike: Source",
      "steam_appid": 240,
      "is_free": false,
      "short_description": "...",
      "about_the_game": "<html>...</html>",
      "detailed_description": "<html>...</html>",
      "header_image": "https://...",
      "background": "https://...",
      "website": "https://...",
      "developers": ["Valve"],
      "publishers": ["Valve"],
      "genres": [{ "id": "1", "description": "Action" }],
      "categories": [{ "id": 2, "description": "Single-player" }],
      "screenshots": [{ "id": 0, "path_thumbnail": "...", "path_full": "..." }],
      "metacritic": { "score": 88, "url": "..." },
      "recommendations": { "total": 95000 },
      "release_date": { "coming_soon": false, "date": "1 Nov, 2004" },
      "platforms": { "windows": true, "mac": false, "linux": false },
      "price_overview": {
        "final": 999,
        "discount_percent": 0,
        "initial_formatted": "9,99€",
        "final_formatted": "9,99€"
      },
      "controller_support": "full",
      "supported_languages": "Englisch, Deutsch<br><strong>*</strong>...",
      "required_age": 16
    }
  }
}
```

**Rate Limit:** Steam erlaubt ca. 10 Anfragen/10 Sekunden. Der Import nutzt `API_DELAY = 400ms`, was ~2,5 Anfragen/Sek entspricht und sicher im Limit liegt.

### SteamSpy API (nur expand-import.js)

**Basis-URL:** `https://steamspy.com/api.php`

Liefert populäre AppID-Listen. Benötigt kein API-Key. Rate Limit: `STEAMSPY_DELAY = 1500ms` zwischen Anfragen.

---

## 10. Server-Setup (XAMPP)

### Voraussetzungen

- XAMPP installiert unter `C:\xampp\`
- Node.js installiert
- NPM-Pakete installiert: `npm install` im Projektverzeichnis

### Dienste starten

#### MySQL starten
Im XAMPP Control Panel auf **MySQL → Start** klicken.  
Oder per PowerShell:
```powershell
Start-Process "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini" -WindowStyle Hidden
```

#### PHP-Entwicklungsserver starten (Port 8888)
```powershell
Start-Process "C:\xampp\php\php.exe" -ArgumentList "-S","localhost:8888","-t","C:\Users\yigithan.zeybel\Aeup-Projekt\public" -WindowStyle Hidden
```

#### phpMyAdmin öffnen
Dafür muss zusätzlich **Apache** im XAMPP Control Panel gestartet werden. Dann: [http://localhost/phpmyadmin](http://localhost/phpmyadmin)

### Datenbank einmalig einrichten

```powershell
# Schema erstellen
C:\xampp\mysql\bin\mysql.exe -u root < database/schema.sql

# Spiele importieren (dauert ~2-3 Minuten)
node database/import.js

# Optional: auf 500 Spiele erweitern (~5-10 Minuten)
node database/expand-import.js
```

### Webanwendung aufrufen

`http://localhost:8888`

---

## 11. Wichtige Konfigurationswerte

| Datei | Konstante / Variable | Wert | Beschreibung |
|---|---|---|---|
| `import.js` | `API_DELAY` | `400` ms | Pause zwischen Steam-API Anfragen |
| `expand-import.js` | `TARGET` | `500` | Ziel-Spielanzahl |
| `expand-import.js` | `API_DELAY` | `400` ms | Pause zwischen Steam-API Anfragen |
| `expand-import.js` | `STEAMSPY_DELAY` | `1500` ms | Pause zwischen SteamSpy-Anfragen |
| `db.php` | `DB_HOST` | `localhost` | MySQL-Hostadresse |
| `db.php` | `DB_USER` | `root` | MySQL-Benutzername |
| `db.php` | `DB_PASS` | `""` | MySQL-Passwort (leer = XAMPP-Standard) |
| `db.php` | `DB_NAME` | `steam_games_db` | Datenbankname |
| `app.js` | `API_BASE` | `'api/'` | Basis-Pfad für alle API-Anfragen |
| `app.js` | `SIZES` | `['xs','s','m']` | Verfügbare Kachelgrößen |
| PHP-Server | Port | `8888` | Webserver-Port |
| MySQL | Port | `3306` | Standard MySQL-Port |
