# Steam Games - Netflix Style Demo

## 🎮 Demo Schritt 1 - Frontend Layout

### Was wurde erstellt:
- ✅ Netflix-inspiriertes Design mit dunklem Theme
- ✅ Responsive Header mit Navigation
- ✅ Hero-Bereich mit Featured Game
- ✅ Grid-Layout für Spieleanzeige
- ✅ Interaktives Pop-up Modal für Spieldetails
- ✅ Hover-Effekte und Animationen

### Dateien:
- `public/index.html` - Hauptseite
- `public/css/style.css` - Styling (Netflix-Style)
- `public/js/app.js` - JavaScript für Interaktivität

### Demo starten:

**Option 1: Mit npm http-server (empfohlen)**
```bash
cd public
npx http-server -p 8080 -o
```
Öffnet automatisch http://localhost:8080

**Option 2: Mit Live Server Extension**
- Rechtsklick auf `public/index.html`
- "Open with Live Server" wählen

**Option 3: Direkt im Browser**
- Öffnen Sie `public/index.html` direkt im Browser
- (API-Funktionen werden nicht funktionieren ohne Server)

### Funktionen testen:
1. ✨ **Hover-Effekt**: Bewegen Sie die Maus über ein Spiel
2. 🖱️ **Klick auf Spiel**: Öffnet Modal mit Details
3. ❌ **Modal schließen**: Klick auf X, außerhalb oder ESC-Taste
4. 📱 **Responsive**: Ändern Sie die Browsergröße

### Nächste Schritte:
- ⏳ MySQL Datenbank einrichten
- ⏳ PHP Backend für Daten-API
- ⏳ Alle 192 Spiele aus steam-games.json laden
- ⏳ Genre-Filter implementieren

---

**Status:** Demo 1 - Frontend Layout ✅
**Server läuft auf:** http://localhost:8080
