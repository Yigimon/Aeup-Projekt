// app.js – Steam Games Frontend
const API_BASE = 'api/';
const SIZES    = ['xs', 's', 'm'];

// Single Source of Truth für Auth-Zustand
let _auth   = null;   // null = nicht angemeldet | { id, username, role }
let _genres = null;   // Cache: Genres einmalig laden (Principle 9)

// DOM-Shortcuts
const el      = id  => document.getElementById(id);
const setText = (id, val) => { el(id).textContent = val || '—'; };
const isAdmin = ()  => _auth?.role === 'admin';

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initHeaderScroll();
    initModal();
    initSizePicker();
    initSearch();
    initHeroCarousel();   // Event-Listener einmalig registrieren
    await initAuth();     // Auth-Zustand laden, bevor Spiele gerendert werden
    loadHeroSales();      // Daten laden & Carousel befüllen
    loadGenres();
    loadGames();
});

// ── Header ────────────────────────────────────────────────────────────────────
function initHeaderScroll() {
    window.addEventListener('scroll', () =>
        el('header').classList.toggle('scrolled', window.scrollY > 50)
    );
}

// ── Size Picker ───────────────────────────────────────────────────────────────
function initSizePicker() {
    const grid = el('gamesGrid');
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            SIZES.forEach(s => grid.classList.remove('size-' + s));
            btn.classList.add('active');
            grid.classList.add('size-' + btn.dataset.size);
        });
    });
}

// ── Genres ────────────────────────────────────────────────────────────────────
async function loadGenres() {
    try {
        // Cache: Genres werden nur einmalig vom Server geholt (Principle 9)
        if (!_genres) {
            const { success, genres } = await fetch(API_BASE + 'get_genres.php').then(r => r.json());
            if (!success) return;
            _genres = genres;
        }

        const container = el('genreFilter');
        const allBtn  = container.querySelector('[data-genre=""]');
        const saleBtn = container.querySelector('[data-sale="1"]');
        allBtn.addEventListener('click',  e => applyFilter({ genre: '' }, e.currentTarget));
        saleBtn.addEventListener('click', () => applyFilter({ sale: true }, saleBtn));

        _genres.forEach(genre => {
            const btn = document.createElement('button');
            btn.className     = 'genre-btn';
            btn.dataset.genre = genre.name;
            btn.textContent   = `${genre.name} (${genre.game_count})`;
            btn.addEventListener('click', () => applyFilter({ genre: genre.name }, btn));
            container.appendChild(btn);
        });
    } catch (e) {
        console.warn('Genres konnten nicht geladen werden:', e.message);
    }
}

// ── Games ─────────────────────────────────────────────────────────────────────
async function loadGames({ genre = '', search = '', sale = false } = {}) {
    const grid = el('gamesGrid');
    grid.innerHTML = '<p class="loading-text">Lade Spiele…</p>';

    const params = new URLSearchParams();
    if (genre)  params.set('genre',  genre);
    if (search) params.set('search', search);
    if (sale)   params.set('sale',   '1');
    const url = API_BASE + 'get_games.php' + (params.size ? '?' + params : '');

    try {
        const { success, count, games } = await fetch(url).then(r => r.json());
        if (!success) {
            grid.innerHTML = '<p class="loading-text">Fehler beim Laden der Spiele.</p>';
            return;
        }
        let title = `Alle Spiele (${count})`;
        if (sale)   title = `Sales (${count})`;
        else if (genre)  title = `Genre: ${genre} (${count})`;
        else if (search) title = `Suche: „${search}" – ${count} Ergebnis(se)`;
        el('sectionTitle').textContent = title;
        renderGames(games);
    } catch {
        grid.innerHTML = '<p class="loading-text">PHP-Server nicht erreichbar. Starte XAMPP!</p>';
    }
}

function renderGames(games) {
    const grid = el('gamesGrid');
    if (!games.length) {
        grid.innerHTML = '<p class="loading-text">Keine Spiele gefunden.</p>';
        return;
    }
    grid.innerHTML = '';
    games.forEach(game => grid.appendChild(createGameCard(game)));
}

function createGameCard(game) {
    const imgUrl = game.header_image || buildLogoUrl(game.appid, game.img_logo_url);

    const card    = document.createElement('div');
    card.className = 'game-card';
    if (!parseInt(game.is_visible)) card.classList.add('game-card--hidden');

    const img     = document.createElement('img');
    img.className = 'game-image';
    img.src       = imgUrl;
    img.alt       = game.name;
    img.loading   = 'lazy';
    img.onerror   = () => {
        img.src = `https://via.placeholder.com/460x215/313244/cdd6f4?text=${encodeURIComponent(game.name)}`;
    };
    card.append(img);

    if (isAdmin()) card.appendChild(createAdminControls(game, card));
    card.addEventListener('click', () => openModal(game));
    return card;
}

function createAdminControls(game, card) {
    const controls = document.createElement('div');
    controls.className = 'admin-controls';

    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'admin-btn admin-btn-eye';
    updateEyeBtn(eyeBtn, parseInt(game.is_visible));
    eyeBtn.addEventListener('click', e => {
        e.stopPropagation();
        adminToggleVisible(game, card, eyeBtn);
    });

    const delBtn = document.createElement('button');
    delBtn.className   = 'admin-btn admin-btn-delete';
    delBtn.title       = 'Löschen';
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', e => {
        e.stopPropagation();
        adminDeleteGame(game, card);
    });

    controls.append(eyeBtn, delBtn);
    return controls;
}

function updateEyeBtn(btn, visible) {
    btn.title       = visible ? 'Ausblenden' : 'Einblenden';
    btn.textContent = visible ? '👁️' : '🙈';
}

// ── Filter & Search ───────────────────────────────────────────────────────────
function applyFilter(params, clickedBtn) {
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');
    el('searchInput').value = '';
    loadGames(params);
}

function initSearch() {
    let timer;
    el('searchInput').addEventListener('input', ({ target }) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            el('genreFilter').querySelector('[data-genre=""]').classList.add('active');
            loadGames({ search: target.value.trim() });
        }, 400);
    });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function initAuth() {
    try {
        const { success, user } = await fetch(API_BASE + 'auth.php?action=me').then(r => r.json());
        if (success && user) _auth = user;
    } catch {}
    renderAuthBtn();
    initAuthModal();
}

function renderAuthBtn() {
    const btn = el('authBtn');
    if (_auth) {
        btn.textContent = _auth.username.charAt(0).toUpperCase();
        btn.title       = `${_auth.username} (${_auth.role}) – Abmelden`;
        btn.classList.add('logged-in');
        btn.classList.toggle('is-admin', _auth.role === 'admin');
    } else {
        btn.textContent = '👤';
        btn.title       = 'Anmelden / Registrieren';
        btn.classList.remove('logged-in', 'is-admin');
    }
}

function initAuthModal() {
    el('authBtn').addEventListener('click', () => _auth ? authLogout() : openAuthModal('login'));
    el('closeAuthModal').addEventListener('click', closeAuthModal);
    el('authModal').addEventListener('click', e => { if (e.target === el('authModal')) closeAuthModal(); });

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    el('loginForm').addEventListener('submit', async e => {
        e.preventDefault();
        await submitAuth('login', {
            action:   'login',
            username: el('loginUsername').value.trim(),
            password: el('loginPassword').value,
        }, 'loginError');
    });

    el('registerForm').addEventListener('submit', async e => {
        e.preventDefault();
        await submitAuth('register', {
            action:   'register',
            username: el('regUsername').value.trim(),
            email:    el('regEmail').value.trim(),
            password: el('regPassword').value,
        }, 'registerError');
    });
}

async function submitAuth(action, fields, errorId) {
    el(errorId).textContent = '';
    try {
        const { success, user, error } = await fetch(
            API_BASE + 'auth.php',
            { method: 'POST', body: new URLSearchParams(fields) }
        ).then(r => r.json());
        if (!success) { el(errorId).textContent = error; return; }
        _auth = user;
        renderAuthBtn();
        closeAuthModal();
        loadGames();
    } catch { el(errorId).textContent = 'Verbindungsfehler'; }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t =>
        t.classList.toggle('active', t.dataset.tab === tab)
    );
    el('loginForm').style.display    = tab === 'login' ? '' : 'none';
    el('registerForm').style.display = tab === 'login' ? 'none' : '';
    el('loginError').textContent     = '';
    el('registerError').textContent  = '';
}

function openAuthModal(tab = 'login') {
    switchAuthTab(tab);
    el('authModal').style.display = 'block';
    document.body.style.overflow  = 'hidden';
}

function closeAuthModal() {
    el('authModal').style.display = 'none';
    document.body.style.overflow  = '';
}

async function authLogout() {
    await fetch(API_BASE + 'auth.php', {
        method: 'POST',
        body: new URLSearchParams({ action: 'logout' }),
    });
    _auth = null;
    renderAuthBtn();
    loadGames();
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

async function adminToggleVisible(game, card, eyeBtn) {
    const body = new URLSearchParams({ action: 'toggle_visible', game_id: game.id });
    try {
        const { success, is_visible } = await fetch(API_BASE + 'admin_games.php', { method: 'POST', body }).then(r => r.json());
        if (!success) return;
        game.is_visible = is_visible;
        card.classList.toggle('game-card--hidden', !is_visible);
        updateEyeBtn(eyeBtn, is_visible);
    } catch {}
}

async function adminDeleteGame(game, card) {
    if (!confirm(`„${game.name}" wirklich löschen?`)) return;
    const body = new URLSearchParams({ action: 'delete', game_id: game.id });
    try {
        const { success } = await fetch(API_BASE + 'admin_games.php', { method: 'POST', body }).then(r => r.json());
        if (success) card.remove();
    } catch {}
}

// ── Hero Carousel ─────────────────────────────────────────────────────────────
let _hcGames = [], _hcIndex = 0, _hcTimer = null, _hcCurrentGame = null;

function resetCarouselTimer() {
    if (_hcTimer) clearInterval(_hcTimer);
    _hcTimer = setInterval(() => carouselStep(1), 5000);
}

// Event-Listener des Carousels einmalig beim Laden registrieren (SRP: nur Init)
function initHeroCarousel() {
    el('hcPrev').addEventListener('click', e => { e.stopPropagation(); carouselStep(-1); resetCarouselTimer(); });
    el('hcNext').addEventListener('click', e => { e.stopPropagation(); carouselStep(1);  resetCarouselTimer(); });
    el('hcCta').addEventListener('click',  () => { if (_hcCurrentGame) openModal(_hcCurrentGame); });
    el('heroCarousel').addEventListener('click', () => { if (_hcCurrentGame) openModal(_hcCurrentGame); });
}

// Nur Daten laden und Carousel befüllen (SRP: nur Datenladen + Render)
async function loadHeroSales() {
    try {
        const { success, games } = await fetch(API_BASE + 'get_games.php?sale=1').then(r => r.json());
        if (!success || !games.length) { el('hcTitle').textContent = 'Keine Angebote'; return; }
        _hcGames = games;
        renderCarouselSlide(0);
        buildCarouselDots();
        resetCarouselTimer();
    } catch {
        el('hcTitle').textContent = 'PHP-Server nicht erreichbar';
    }
}

function getGameBg(game) {
    const shots = Array.isArray(game.screenshots) ? game.screenshots : [];
    if (shots.length) return shots[0];
    return game.header_image || game.background || buildLogoUrl(game.appid, game.img_logo_url);
}

function renderCarouselSlide(index) {
    _hcIndex       = (index + _hcGames.length) % _hcGames.length;
    _hcCurrentGame = _hcGames[_hcIndex];
    const game     = _hcCurrentGame;
    const bgImg    = getGameBg(game);

    // Background
    const track = el('hcTrack');
    track.style.backgroundImage = bgImg ? `url("${bgImg}")` : 'none';
    track.style.animation = 'none';
    void track.offsetWidth; // Force reflow to restart animation
    track.style.animation = '';

    el('hcTitle').textContent = game.name;
    renderCarouselBadges(game);

    document.querySelectorAll('.hc-dot').forEach((d, i) =>
        d.classList.toggle('active', i === _hcIndex)
    );

    preloadNextSlide();
    restartProgressBar();
}

// Rabatt- und Preis-Badges im Carousel rendern
function renderCarouselBadges(game) {
    const badges   = el('hcBadges');
    badges.innerHTML = '';
    const discount = parseInt(game.price_discount) || 0;
    if (discount > 0) {
        const d = document.createElement('span');
        d.className   = 'hc-discount';
        d.textContent = `-${discount}%`;
        badges.appendChild(d);
    }
    const priceStr = formatPrice(game);
    if (priceStr) {
        const p = document.createElement('span');
        p.className   = 'hc-price';
        p.textContent = priceStr;
        badges.appendChild(p);
    }
}

// Nächstes Carousel-Bild vorladen
function preloadNextSlide() {
    const next   = _hcGames[(_hcIndex + 1) % _hcGames.length];
    const nextBg = next && getGameBg(next);
    if (nextBg) { const img = new Image(); img.src = nextBg; }
}

// Fortschrittsbalken-Animation neu starten
function restartProgressBar() {
    const bar = el('hcProgress');
    bar.classList.remove('running');
    bar.style.width = '0%';
    void bar.offsetWidth; // Force reflow
    bar.classList.add('running');
}

function buildCarouselDots() {
    const dotsEl = el('hcDots');
    dotsEl.innerHTML = '';
    _hcGames.forEach((_, i) => {
        const d = document.createElement('span');
        d.className = 'hc-dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', e => { e.stopPropagation(); carouselGoTo(i, true); });
        dotsEl.appendChild(d);
    });
}

function carouselStep(dir)             { renderCarouselSlide(_hcIndex + dir); }
function carouselGoTo(i, reset = false) { renderCarouselSlide(i); if (reset) resetCarouselTimer(); }


// ── Modal + Slider ────────────────────────────────────────────────────────────
let sliderImages = [], sliderIndex = 0;

function initModal() {
    el('closeModal').addEventListener('click', closeModal);
    el('gameModal').addEventListener('click', e => { if (e.target === el('gameModal')) closeModal(); });
    el('sliderPrev').addEventListener('click', () => changeSlide(-1));
    el('sliderNext').addEventListener('click', () => changeSlide(1));
    document.addEventListener('keydown', ({ key }) => {
        if (key === 'Escape')     closeModal();
        if (key === 'ArrowLeft')  changeSlide(-1);
        if (key === 'ArrowRight') changeSlide(1);
    });
}

function changeSlide(dir) {
    if (sliderImages.length < 2) return;
    sliderIndex = (sliderIndex + dir + sliderImages.length) % sliderImages.length;
    updateSlider();
}

function updateSlider() {
    const img = el('sliderImg');
    img.style.opacity = '0';
    setTimeout(() => { img.src = sliderImages[sliderIndex] || ''; img.style.opacity = '1'; }, 120);

    el('sliderDots').innerHTML = sliderImages
        .map((_, i) => `<span class="dot${i === sliderIndex ? ' active' : ''}"></span>`)
        .join('');

    const multi = sliderImages.length > 1;
    el('sliderPrev').style.display = multi ? '' : 'none';
    el('sliderNext').style.display = multi ? '' : 'none';
}

function openModal(game) {
    // Slider-Bilder aufbauen
    // screenshots kommt bereits als Array vom Server (PHP dekodiert es via json_decode)
    const shots = Array.isArray(game.screenshots) ? game.screenshots : [];
    sliderImages = [game.header_image, ...shots.filter(u => u && u !== game.header_image)].filter(Boolean);
    if (!sliderImages.length) sliderImages = [buildLogoUrl(game.appid, game.img_logo_url)];
    sliderIndex = 0;

    // Alle Slider-Bilder vorab im Browser-Cache laden → kein Lag beim Wechseln
    sliderImages.forEach(src => { const img = new Image(); img.src = src; });

    updateSlider();

    // Titel
    el('modalTitle').textContent = game.name;

    // Metacritic
    const mc    = parseInt(game.metacritic_score);
    const badge = el('modalMetacritic');
    if (mc > 0) {
        el('metacriticScore').textContent = mc;
        badge.className    = 'metacritic-badge' + (mc >= 75 ? '' : mc >= 50 ? ' mixed' : ' poor');
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }

    // Tags (wiederverwendbare Funktion)
    renderTags(el('modalGenreTags'),    Array.isArray(game.genres)     ? game.genres     : [], 'genre-tag');
    renderTags(el('modalCategoryTags'), Array.isArray(game.categories) ? game.categories : [], 'category-tag');

    // Beschreibung
    el('modalDescription').textContent = game.short_description || 'Keine Beschreibung verfügbar.';

    // About the Game
    const aboutDetails = el('modalAbout').closest('details');
    if (game.about_the_game) {
        el('modalAbout').innerHTML  = game.about_the_game;
        aboutDetails.style.display = '';
    } else {
        aboutDetails.style.display = 'none';
    }

    // Info-Grid
    setText('infoDeveloper',      game.developer);
    setText('infoPublisher',      game.publisher);
    setText('infoRelease',        game.release_date);
    setText('infoType',           game.game_type);
    setText('infoController',     formatController(game.controller_support));
    setText('infoRecommendations', game.recommendations > 0
        ? Number(game.recommendations).toLocaleString('de-DE') : null);
    setText('infoPlatforms', formatPlatforms(game));
    setText('infoPrice',     formatPrice(game));

    // Sprachen
    const langEl = el('modalLanguages');
    if (game.supported_languages) {
        langEl.textContent   = '🌍 ' + game.supported_languages.replace(/<[^>]+>/g, '').trim();
        langEl.style.display = '';
    } else {
        langEl.style.display = 'none';
    }

    // Website / Store
    const siteEl   = el('modalWebsite');
    siteEl.href    = game.website || `https://store.steampowered.com/app/${game.appid}/`;
    siteEl.textContent = game.website ? '🌐 Website ↗' : '🛒 Steam Store ↗';

    el('gameModal').style.display = 'block';
    document.body.style.overflow  = 'hidden';
}

function closeModal() {
    el('gameModal').style.display = 'none';
    document.body.style.overflow  = '';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Tags in einen Container rendern (Single Source of Truth für Genres & Kategorien)
function renderTags(container, items, className) {
    container.innerHTML = '';
    items.forEach(text => {
        const span       = document.createElement('span');
        span.className   = className;
        span.textContent = text;
        container.appendChild(span);
    });
}

function formatPlatforms(game) {
    return [
        parseInt(game.platform_windows) && 'Windows',
        parseInt(game.platform_mac)     && 'Mac',
        parseInt(game.platform_linux)   && 'Linux',
    ].filter(Boolean).join(' · ') || null;
}

function formatController(val) {
    return val === 'full' ? 'Vollständig' : val === 'partial' ? 'Teilweise' : null;
}

function formatPrice(game) {
    if (parseInt(game.is_free))   return 'Kostenlos';
    if (game.price_final_fmt)     return game.price_discount > 0
        ? `${game.price_final_fmt}  −${game.price_discount}%` : game.price_final_fmt;
    if (game.price_final > 0) {
        const eur = (game.price_final / 100).toFixed(2).replace('.', ',') + ' €';
        return game.price_discount > 0 ? `${eur}  −${game.price_discount}%` : eur;
    }
    return null;
}

function buildLogoUrl(appid, hash) {
    return hash
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg`
        : '';
}
