// =============================================
// expand-import.js
// Holt populäre Steam AppIDs von SteamSpy und
// importiert so viele neue Spiele, bis 500 in der DB sind.
// Bereits vorhandene Spiele werden übersprungen.
// =============================================

const mysql = require('mysql2/promise');
const fetch = require('node-fetch');
const https = require('https');

const DB_CONFIG = {
    host: '127.0.0.1', user: 'root', password: '',
    database: 'steam_games_db', charset: 'utf8mb4'
};

const TARGET     = 1000;  // Ziel-Anzahl Spiele in der DB
const API_DELAY  = 400;   // ms zwischen Steam-API Anfragen

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── Steam Store APIs: populäre AppIDs holen ───────────────────────────────
// Quelle 1: /api/featured + /api/featuredcategories → Featured/Top-Seller Highlights
// Quelle 2: /search/results/?filter=topsellers     → Paginierte Top-Seller Liste
// Kein API-Key nötig. AppID wird aus Logo-URL extrahiert (/apps/<id>/).
async function fetchPopularSteamIds(needed) {
    const allIds = new Map(); // appid -> name

    // AppID aus Steam CDN Logo-URL extrahieren: .../apps/730/...  → "730"
    const extractAppid = url => { const m = url && url.match(/\/apps\/(\d+)\//); return m ? m[1] : null; };

    // ── Quelle 1: Featured + FeaturedCategories ─────────────────────────────
    const bonusEndpoints = [
        'https://store.steampowered.com/api/featured',
        'https://store.steampowered.com/api/featuredcategories',
    ];
    for (const url of bonusEndpoints) {
        try {
            const res  = await fetch(url, { timeout: 10000, agent: httpsAgent });
            const data = await res.json();
            const addItems = items => (items || []).forEach(g => {
                const id = String(g.id ?? '');
                if (id && !allIds.has(id)) allIds.set(id, g.name || '');
            });
            // featured: featured_win, large_capsules, specials.items, ...
            for (const val of Object.values(data)) {
                if (Array.isArray(val)) addItems(val);
                else if (val && Array.isArray(val.items)) addItems(val.items);
            }
        } catch (err) {
            console.warn(`  ⚠️  ${url}: ${err.message}`);
        }
        await sleep(API_DELAY);
    }
    console.log(`  Bonus-Quellen: ${allIds.size} AppIDs`);

    // ── Quelle 2: Steam Search topsellers – paginiert ───────────────────────
    const pageSize = 100;
    const maxPages = Math.ceil((needed * 2.5) / pageSize); // Puffer wegen DLC-Filter
    console.log(`  Lade Top-Seller via Steam Search API (${maxPages} Seiten à ${pageSize})...`);

    for (let page = 0; page < maxPages; page++) {
        const start = page * pageSize;
        const url = `https://store.steampowered.com/search/results/?filter=topsellers&start=${start}&count=${pageSize}&json=1`;
        try {
            const res  = await fetch(url, { timeout: 15000, agent: httpsAgent });
            const data = await res.json();
            const items = data.items || [];

            if (items.length === 0) { console.log(`  Keine weiteren Ergebnisse ab Seite ${page + 1}.`); break; }

            let added = 0;
            for (const item of items) {
                const appid = extractAppid(item.logo);
                if (appid && !allIds.has(appid)) { allIds.set(appid, item.name || ''); added++; }
            }
            console.log(`  Seite ${page + 1}/${maxPages}: ${items.length} Treffer, ${added} neu → gesamt ${allIds.size} AppIDs`);
            await sleep(API_DELAY);
        } catch (err) {
            console.warn(`  ⚠️  Seite ${page + 1}: ${err.message}`);
            await sleep(API_DELAY * 3);
        }
        if (allIds.size >= needed * 2.5) break;
    }

    return allIds;
}

// ─── Steam Store API: Spieldetails holen ───────────────────────────────────
async function fetchSteamDetails(appid) {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&l=de`;
    try {
        const res  = await fetch(url, { timeout: 10000, agent: httpsAgent });
        const body = await res.json();
        if (!body[appid] || !body[appid].success || !body[appid].data) return null;
        return body[appid].data;
    } catch (err) {
        console.warn(`  ⚠️  API Fehler ${appid}: ${err.message}`);
        return null;
    }
}

// ─── Genre-Helfer ───────────────────────────────────────────────────────────
async function getOrCreateGenre(conn, genreName) {
    const [rows] = await conn.execute('SELECT id FROM genres WHERE name = ?', [genreName]);
    if (rows.length > 0) return rows[0].id;
    const [result] = await conn.execute('INSERT INTO genres (name) VALUES (?)', [genreName]);
    return result.insertId;
}

async function linkGameGenre(conn, gameId, genreId) {
    await conn.execute(
        'INSERT IGNORE INTO game_genres (game_id, genre_id) VALUES (?, ?)',
        [gameId, genreId]
    );
}

// ─── Haupt-Funktion ─────────────────────────────────────────────────────────
async function expandGames() {
    const conn = await mysql.createConnection(DB_CONFIG);

    // Aktuelle Anzahl + vorhandene AppIDs laden
    const [[{ count }]] = await conn.execute('SELECT COUNT(*) as count FROM games');
    console.log(`\n🎮 Expand Import`);
    console.log(`════════════════════════════════════`);
    console.log(`📋 Spiele aktuell in DB: ${count}`);
    console.log(`🎯 Ziel:                 ${TARGET}`);
    console.log(`➕ Benötigt:             ${Math.max(0, TARGET - count)}`);
    console.log(`════════════════════════════════════\n`);

    if (count >= TARGET) {
        console.log('✅ Ziel bereits erreicht!');
        await conn.end();
        return;
    }

    const [existingRows] = await conn.execute('SELECT appid FROM games');
    const existingIds = new Set(existingRows.map(r => String(r.appid)));
    console.log(`✅ DB-Verbindung hergestellt. Lade populäre Spiele von Steam...\n`);

    // Populäre AppIDs von Steam Store holen
    const needed = TARGET - Number(count);
    const popularIds = await fetchPopularSteamIds(needed);
    console.log(`\n📦 Steam Store: ${popularIds.size} populäre AppIDs gefunden`);

    // Bereits vorhandene rausfiltern
    const newIds = [...popularIds.keys()].filter(id => !existingIds.has(id));
    console.log(`🆕 Davon neu (nicht in DB): ${newIds.length}\n`);

    let imported = 0;
    let skipped  = 0;
    let errors   = 0;

    for (let i = 0; i < newIds.length && imported < needed; i++) {
        const appid    = parseInt(newIds[i]);
        const progress = `[${imported + 1}/${needed}]`;

        process.stdout.write(`${progress} AppID ${appid} ... `);

        const details = await fetchSteamDetails(appid);

        if (!details) {
            console.log('⚠️  kein Store-Eintrag');
            skipped++;
            await sleep(API_DELAY);
            continue;
        }

        // Nur echte Spiele importieren (kein DLC, kein Demo usw.)
        if (details.type !== 'game') {
            console.log(`⏭️  Typ: ${details.type} – übersprungen`);
            skipped++;
            await sleep(API_DELAY);
            continue;
        }

        try {
            const name = details.name || `AppID ${appid}`;
            console.log(`🎯 ${name}`);

            const shortDesc     = details.short_description || '';
            const aboutGame     = details.about_the_game    || '';
            const fullDesc      = details.detailed_description || '';
            const headerImg     = details.header_image      || '';
            const background    = details.background        || '';
            const developer     = (details.developers || []).join(', ');
            const publisher     = (details.publishers || []).join(', ');
            const releaseDate   = details.release_date ? details.release_date.date : '';
            const metacritic    = details.metacritic  ? details.metacritic.score  : null;
            const recommendations = details.recommendations ? details.recommendations.total : 0;
            const isFree        = details.is_free ? 1 : 0;
            const priceObj      = details.price_overview || null;
            const priceFinal    = priceObj ? priceObj.final            : 0;
            const priceDiscount = priceObj ? priceObj.discount_percent : 0;
            const priceInitFmt  = priceObj ? (priceObj.initial_formatted || '') : '';
            const priceFinalFmt = priceObj ? (priceObj.final_formatted   || '') : '';
            const platWin       = details.platforms ? (details.platforms.windows ? 1 : 0) : 0;
            const platMac       = details.platforms ? (details.platforms.mac     ? 1 : 0) : 0;
            const platLin       = details.platforms ? (details.platforms.linux   ? 1 : 0) : 0;
            const requiredAge   = parseInt(details.required_age) || 0;
            const ctrlSupport   = details.controller_support || '';
            const gameType      = details.type || '';
            const website       = details.website || '';
            const supportedLangs = details.supported_languages || '';
            const categories    = JSON.stringify((details.categories  || []).slice(0, 20).map(c => c.description));
            const screenshots   = JSON.stringify((details.screenshots || []).slice(0, 6).map(s => s.path_full));

            const [result] = await conn.execute(
                `INSERT INTO games
                    (appid, name, playtime_forever, img_icon_url, img_logo_url,
                     has_community_visible_stats,
                     short_description, about_the_game, description,
                     header_image, background,
                     developer, publisher, release_date, game_type, website,
                     metacritic_score, recommendations,
                     is_free, price_final, price_discount, price_initial_fmt, price_final_fmt,
                     platform_windows, platform_mac, platform_linux,
                     required_age, controller_support, supported_languages,
                     categories, screenshots)
                 VALUES (?,?,0,'','',0, ?,?,?, ?,?, ?,?,?,?,?, ?,?, ?,?,?,?,?, ?,?,?, ?,?,?, ?,?)
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [appid, name,
                 shortDesc, aboutGame, fullDesc,
                 headerImg, background,
                 developer, publisher, releaseDate, gameType, website,
                 metacritic, recommendations,
                 isFree, priceFinal, priceDiscount, priceInitFmt, priceFinalFmt,
                 platWin, platMac, platLin,
                 requiredAge, ctrlSupport, supportedLangs,
                 categories, screenshots]
            );

            let gameId = result.insertId;
            if (gameId === 0) {
                const [rows] = await conn.execute('SELECT id FROM games WHERE appid = ?', [appid]);
                gameId = rows[0].id;
            }

            if (details.genres) {
                for (const g of details.genres) {
                    const gId = await getOrCreateGenre(conn, g.description);
                    await linkGameGenre(conn, gameId, gId);
                }
            }

            imported++;
        } catch (err) {
            console.error(`  ❌ Fehler: ${err.message}`);
            errors++;
        }

        await sleep(API_DELAY);
    }

    const [[{ finalCount }]] = await conn.execute('SELECT COUNT(*) AS finalCount FROM games');

    console.log(`\n════════════════════════════════════`);
    console.log(`✅ Expand-Import abgeschlossen!`);
    console.log(`   Neu importiert: ${imported}`);
    console.log(`   Übersprungen:   ${skipped}`);
    console.log(`   Fehler:         ${errors}`);
    console.log(`   Spiele in DB:   ${finalCount}`);
    console.log(`════════════════════════════════════\n`);

    await conn.end();
}

expandGames().catch(err => {
    console.error('\n❌ Fataler Fehler:', err.message);
    process.exit(1);
});
