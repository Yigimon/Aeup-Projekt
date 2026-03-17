# Datenbankschema Dokumentation

## Übersicht

Das Datenbankschema für die Steam Games Webseite besteht aus drei Tabellen und einer View.  
Die Grundstruktur implementiert eine **m:n Beziehung** zwischen Spielen und Genres.  
Alle erweiterten Spieldaten werden automatisch über die **Steam Store API** befüllt (`import.js`).

## Datenbankname
**`steam_games_db`** (utf8mb4, utf8mb4_unicode_ci)

---

## Tabellen

### 1. games

Zentrale Tabelle – speichert alle Spielinformationen.  
Basisfelder kommen aus `steam-games.json`, alle weiteren Felder aus der Steam Store API.

#### Identifikation & Basisdaten (steam-games.json)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | INT PK | Auto-Increment ID |
| `appid` | INT UNIQUE | Steam App-ID |
| `name` | VARCHAR(255) | Spielname |
| `playtime_forever` | INT | Gespielte Zeit in Minuten |
| `img_icon_url` | VARCHAR(100) | Icon-Hash (Steam CDN) |
| `img_logo_url` | VARCHAR(100) | Logo-Hash (Steam CDN) |
| `has_community_visible_stats` | TINYINT(1) | Hat öffentliche Community-Statistiken |

#### Beschreibungen (Steam Store API)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `short_description` | TEXT | Kurzbeschreibung (plain text) |
| `about_the_game` | MEDIUMTEXT | „Über das Spiel" (HTML-formatiert) |
| `description` | TEXT | Detaillierte Beschreibung (HTML-formatiert) |

#### Bilder (Steam Store API)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `header_image` | VARCHAR(255) | Header-Bild URL (460×215 px, Steam CDN) |
| `background` | VARCHAR(512) | Hintergrundbild URL (Store-Seite) |

#### Publisher & Release (Steam Store API)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `developer` | VARCHAR(255) | Entwickler, kommagetrennt |
| `publisher` | VARCHAR(255) | Publisher, kommagetrennt |
| `release_date` | VARCHAR(50) | Erscheinungsdatum (z.B. `"21 Aug, 2012"`) |
| `game_type` | VARCHAR(20) | Typ: `game` \| `dlc` \| `demo` \| … |
| `website` | VARCHAR(512) | Offizielle Website des Spiels |

#### Bewertungen (Steam Store API)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `metacritic_score` | INT | Metacritic-Score (0–100, NULL wenn nicht vorhanden) |
| `recommendations` | INT | Anzahl Steam-Empfehlungen |

#### Preis (Steam Store API – `price_overview`)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `is_free` | TINYINT(1) | Kostenloses Spiel |
| `price_final` | INT | Endpreis in Cent (z.B. `999` = 9,99 €) |
| `price_discount` | INT | Rabatt in Prozent |
| `price_initial_fmt` | VARCHAR(30) | Originalpreis formatiert (z.B. `"9,99€"`) |
| `price_final_fmt` | VARCHAR(30) | Endpreis formatiert (z.B. `"4,99€"`) |

#### Plattformen (Steam Store API – `platforms`)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `platform_windows` | TINYINT(1) | Verfügbar für Windows |
| `platform_mac` | TINYINT(1) | Verfügbar für macOS |
| `platform_linux` | TINYINT(1) | Verfügbar für Linux |

#### Features & Anforderungen (Steam Store API)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `required_age` | INT | Mindestalter (0 = keine Altersbeschränkung) |
| `controller_support` | VARCHAR(20) | `full` \| `partial` \| NULL |
| `supported_languages` | TEXT | Unterstützte Sprachen (HTML-String von Steam) |

#### JSON-Felder (Steam Store API, serialisiert)

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `categories` | TEXT | JSON-Array: Steam-Kategorien (z.B. `["Multiplayer", "Co-op"]`) |
| `screenshots` | TEXT | JSON-Array: Screenshot-URLs (path_full, 1920×1080 px, max. 6) |

#### Zeitstempel

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `created_at` | TIMESTAMP | Erstellungszeitpunkt (automatisch) |
| `updated_at` | TIMESTAMP | Letztes Update (automatisch) |

**Indizes:** `idx_appid`, `idx_name`

---

### 2. genres

Speichert alle Genres. Werden **automatisch** via Steam Store API angelegt – keine manuelle Pflege nötig.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | INT PK | Auto-Increment ID |
| `name` | VARCHAR(100) UNIQUE | Genre-Name (z.B. `"Action"`, `"Strategy"`) |
| `description` | VARCHAR(255) | Optionale Beschreibung |
| `created_at` | TIMESTAMP | Erstellungszeitpunkt |

**Indizes:** `idx_name`

---

### 3. game_genres (m:n Zwischentabelle)

Verknüpft Spiele mit Genres. Implementiert die m:n Beziehung.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | INT PK | Auto-Increment ID |
| `game_id` | INT FK | → `games.id` |
| `genre_id` | INT FK | → `genres.id` |
| `created_at` | TIMESTAMP | Erstellungszeitpunkt |

**Constraints:**
- `FOREIGN KEY (game_id) → games(id) ON DELETE CASCADE`
- `FOREIGN KEY (genre_id) → genres(id) ON DELETE CASCADE`
- `UNIQUE (game_id, genre_id)` – verhindert Duplikate

**Indizes:** `idx_game_id`, `idx_genre_id`

---

## Entity-Relationship Diagramm

```
┌──────────────────────┐         ┌──────────────┐         ┌─────────────┐
│        games         │         │ game_genres  │         │   genres    │
├──────────────────────┤         ├──────────────┤         ├─────────────┤
│ id (PK)              │────┐    │ id (PK)      │    ┌────│ id (PK)     │
│ appid                │    │    │ game_id (FK) │    │    │ name        │
│ name                 │    └───<│ genre_id (FK)│>───┘    │ description │
│ short_description    │         └──────────────┘         └─────────────┘
│ about_the_game       │              m : n
│ header_image         │
│ background           │
│ developer/publisher  │
│ release_date         │
│ game_type / website  │
│ metacritic_score     │
│ recommendations      │
│ is_free / price_*    │
│ platform_*           │
│ controller_support   │
│ supported_languages  │
│ categories (JSON)    │
│ screenshots (JSON)   │
│ created_at           │
│ updated_at           │
└──────────────────────┘
```

---

## m:n Beziehung Erklärung

Die m:n Beziehung ermöglicht:
- **Ein Spiel** kann **mehrere Genres** haben  
  (z.B. *Amnesia: The Dark Descent* → `Action`, `Adventure`, `Indie`)
- **Ein Genre** kann **mehrere Spiele** enthalten  
  (z.B. Genre `Strategy` → Civilization V, Total War, …)

Die Zwischentabelle `game_genres` speichert nur die Fremdschlüssel beider Tabellen.  
Bei Löschung eines Spiels oder Genres werden alle Verknüpfungen automatisch mitgelöscht (`ON DELETE CASCADE`).

---

## View: games_with_genres

Praktische View für Übersichtsabfragen – liefert alle Spiele inklusive Genres als kommaseparierten String:

```sql
SELECT appid, name, genres FROM games_with_genres WHERE genres LIKE '%Action%';
```

Die View enthält alle relevanten Spalten aus `games` plus das berechnete Feld `genres`.

---

## Bild-URLs

### Kartenansicht (Startseite)
Das Feld `header_image` enthält die vollständige URL direkt von der Steam Store API:
```
https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg
```
Auflösung: **460 × 215 px**

### Screenshots (Modal)
Das Feld `screenshots` enthält ein JSON-Array mit bis zu 6 URLs in Vollauflösung:
```json
["https://shared.akamai.steamstatic.com/...1920x1080.jpg", "..."]
```
Auflösung: **1920 × 1080 px**

### Fallback (Icon / Logo aus steam-games.json)
Falls kein `header_image` vorhanden ist, werden die gespeicherten Hashes verwendet:
```
https://media.steampowered.com/steamcommunity/public/images/apps/{appid}/{hash}.jpg
```

---

## Datenquellen

| Quelle | Felder |
|--------|--------|
| `steam-games.json` | `appid`, `name`, `playtime_forever`, `img_icon_url`, `img_logo_url`, `has_community_visible_stats` |
| Steam Store API | Alle übrigen Felder |

Steam Store API Endpunkt:
```
https://store.steampowered.com/api/appdetails?appids={appid}&l=de
```

---

## Installation

### Datenbank neu anlegen

```bash
# MySQL starten (XAMPP)
C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini

# Schema einspielen
C:\xampp\mysql\bin\mysql.exe -u root < database/schema.sql
```

### Spiele importieren

```bash
# Node.js Abhängigkeiten installieren (einmalig)
npm install

# Import starten (~5 Minuten für 192 Spiele, Steam API Rate-Limit: 1.5s/Anfrage)
node database/import.js
```

### PHP-Server starten

```bash
C:\xampp\php\php.exe -S localhost:8888 -t public/
```

Webseite erreichbar unter: **http://localhost:8888**
