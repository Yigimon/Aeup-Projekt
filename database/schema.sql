-- =============================================
-- Steam Games Database Schema
-- =============================================
-- Erstellt:     2026-02-26
-- Aktualisiert: 2026-02-26
-- Beschreibung: Datenbankschema für Steam Games
--               mit m:n Beziehung zwischen Spielen und Genres.
--               Alle Spieldaten werden via Steam Store API befüllt (import.js).
-- =============================================

-- Datenbank erstellen
CREATE DATABASE IF NOT EXISTS steam_games_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE steam_games_db;


-- =============================================
-- Tabelle: roles
-- =============================================
-- Rollen für Nutzerrechte (user, admin)

CREATE TABLE IF NOT EXISTS roles (
    id   INT          AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20)  NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =============================================
-- Tabelle: users
-- =============================================
-- Nutzer mit Login, Passwort und Rolle

CREATE TABLE IF NOT EXISTS users (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT          NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email    (email),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =============================================
-- Tabelle: games
-- =============================================
CREATE TABLE IF NOT EXISTS games (
    -- Primärschlüssel & Identifikation
    id                          INT           AUTO_INCREMENT PRIMARY KEY,
    appid                       INT           NOT NULL UNIQUE,          -- Steam App-ID
    name                        VARCHAR(255)  NOT NULL,                 -- Spielname
    is_visible                  TINYINT(1)    NOT NULL DEFAULT 1,       -- Sichtbarkeit (1=anzeigen, 0=ausgeblendet)

    -- Originaldaten aus steam-games.json
    playtime_forever            INT           DEFAULT 0,                -- Gespielte Minuten
    img_icon_url                VARCHAR(100)  DEFAULT NULL,             -- Icon-Hash (Steam CDN)
    img_logo_url                VARCHAR(100)  DEFAULT NULL,             -- Logo-Hash (Steam CDN)
    has_community_visible_stats TINYINT(1)    DEFAULT 0,               -- Community-Statistiken

    -- Beschreibungen (Steam Store API)
    short_description           TEXT          DEFAULT NULL,             -- Kurzbeschreibung (plain text)
    about_the_game              MEDIUMTEXT    DEFAULT NULL,             -- "Über das Spiel" (HTML)
    description                 TEXT          DEFAULT NULL,             -- Detaillierte Beschreibung (HTML)

    -- Bilder (Steam Store API)
    header_image                VARCHAR(255)  DEFAULT NULL,             -- Header-Bild URL (460x215px)
    background                  VARCHAR(512)  DEFAULT NULL,             -- Hintergrundbild URL

    -- Publisher & Release (Steam Store API)
    developer                   VARCHAR(255)  DEFAULT NULL,             -- Entwickler (kommagetrennt)
    publisher                   VARCHAR(255)  DEFAULT NULL,             -- Publisher (kommagetrennt)
    release_date                VARCHAR(50)   DEFAULT NULL,             -- Erscheinungsdatum (z.B. "21 Aug, 2012")
    game_type                   VARCHAR(20)   DEFAULT NULL,             -- Typ: game | dlc | demo | ...
    website                     VARCHAR(512)  DEFAULT NULL,             -- Offizielle Website

    -- Bewertungen & Statistiken (Steam Store API)
    metacritic_score            INT           DEFAULT NULL,             -- Metacritic-Score (0-100)
    recommendations             INT           DEFAULT 0,                -- Anzahl Steam-Empfehlungen

    -- Preisinfos (Steam Store API, price_overview)
    is_free                     TINYINT(1)    DEFAULT 0,                -- Kostenloses Spiel
    price_final                 INT           DEFAULT 0,                -- Endpreis in Cent (z.B. 999 = 9,99€)
    price_discount              INT           DEFAULT 0,                -- Rabatt in Prozent
    price_initial_fmt           VARCHAR(30)   DEFAULT NULL,             -- Originalpreis formatiert (z.B. "9,99€")
    price_final_fmt             VARCHAR(30)   DEFAULT NULL,             -- Endpreis formatiert (z.B. "4,99€")

    -- Plattformen (Steam Store API, platforms)
    platform_windows            TINYINT(1)    DEFAULT 0,
    platform_mac                TINYINT(1)    DEFAULT 0,
    platform_linux              TINYINT(1)    DEFAULT 0,

    -- Anforderungen & Features (Steam Store API)
    required_age                INT           DEFAULT 0,                -- Mindestalter (0 = keine Beschränkung)
    controller_support          VARCHAR(20)   DEFAULT NULL,             -- full | partial | NULL
    supported_languages         TEXT          DEFAULT NULL,             -- Sprachen (HTML-String von Steam)

    -- Inhalte als JSON serialisiert (Steam Store API)
    categories                  TEXT          DEFAULT NULL,             -- JSON-Array: Steam-Kategorien (z.B. ["Multiplayer", "Co-op"])
    screenshots                 TEXT          DEFAULT NULL,             -- JSON-Array: Screenshot-URLs (path_full, 1920x1080)

    -- Zeitstempel
    created_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_appid (appid),
    INDEX idx_name  (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =============================================
-- Tabelle: genres
-- =============================================
-- Genres werden automatisch via Steam API befüllt (import.js).
-- Ein Genre kann mehreren Spielen zugeordnet sein (m:n über game_genres).
CREATE TABLE IF NOT EXISTS genres (
    id          INT          AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,   -- Genre-Name (z.B. "Action", "Strategy")
    description VARCHAR(255) DEFAULT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- =============================================
-- Tabelle: game_genres  (m:n Beziehung)
-- =============================================
-- Verknüpft Spiele mit Genres.
-- Ein Spiel kann mehrere Genres haben, ein Genre kann mehrere Spiele haben.
CREATE TABLE IF NOT EXISTS game_genres (
    id         INT       AUTO_INCREMENT PRIMARY KEY,
    game_id    INT       NOT NULL,
    genre_id   INT       NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY  unique_game_genre (game_id, genre_id),
    INDEX       idx_game_id  (game_id),
    INDEX       idx_genre_id (genre_id),
    FOREIGN KEY (game_id)  REFERENCES games(id)  ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


