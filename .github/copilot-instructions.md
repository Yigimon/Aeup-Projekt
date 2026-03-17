# Copilot Instructions – Steam Games Web App (Ergänzung)

## 1. Core Principle: Simplicity First

* This project is a **school project** → prioritize simplicity over abstraction
* Use **plain PHP + Vanilla JS only**
* Avoid:

  * Framework patterns (Laravel, MVC overengineering)
  * Complex class structures
* Prefer:

  * Clear procedural code
  * Small, understandable functions

---

## 2. Project Context Awareness (Critical)

* Data source: `steam-games.json` → imported into **MySQL**

* Images:

  * `image-logo-url` → used in grid view
  * `image-icon-url` → used in modal

* External API:

  * Steam API (`appdetails`) → used for description

* UI behavior:

  * Grid = all games
  * Click = open modal with:

    * Icon image
    * Description
    * Metadata (price, genres, etc.)

---

## 3. Database Handling (Context 7 Focus)

* Always respect the **m:n relationship**:

  ```
  games ↔ game_genres ↔ genres
  ```

* Queries must:

  * Use **JOIN instead of multiple queries**
  * Be optimized for readability

Example guideline:

```php
// Fetch games with their genres using a JOIN to resolve m:n relation
```

* Never hardcode data → always load from DB

---

## 4. API Best Practices

* Keep endpoints **minimal and focused**:

  * `get_games.php` → list
  * `get_game_details.php` → single game
  * `get_genres.php` → filter data

* Always return clean JSON:

```json
{
  "success": true,
  "data": {}
}
```

* Do NOT:

  * Mix HTML into API
  * Duplicate logic across endpoints

---

## 5. Frontend Logic (Vanilla JS Only)

* Separate responsibilities:

  * Fetching → API calls
  * Rendering → DOM creation
  * Interaction → events

* Modal handling must be:

  * Simple
  * Reusable

Example structure:

```js
fetchGames()
renderGames(games)
openModal(gameId)
```

---

## 6. UI Rules (Netflix-Style)

* Grid layout must:

  * Focus on images (image-logo-url)
  * Be responsive

* Modal must clearly show:

  * Icon (image-icon-url)
  * Description (Steam API)
  * Metadata

* Always implement:

  * Hover effect
  * Click feedback
  * Close modal interaction

---

## 7. Reuse Before Rewrite

* Before writing new code:

  * Check if a function already exists
  * Reuse rendering logic

* Typical reusable parts:

  * Game card
  * Modal
  * API fetch helper

---

## 8. Clean Code Rules

* Use clear naming:

  * `getGames()`, `renderGrid()`, `openModal()`
* Avoid:

  * Deep nesting
  * Inline logic in HTML
* Keep functions short and focused

---

## 9. Performance Basics

* Load only necessary data:

  * No `SELECT *` unless required
* Avoid repeated API calls:

  * Cache results in JS if possible
* Use DB indexes (from schema)

---

## 10. Security Basics

* Always:

  * Use prepared statements (PDO)
  * Validate GET parameters (`id`, `search`)
* Never:

  * Trust user input directly
  * Build SQL strings manually

---

## 11. Documentation Requirement

* Since this is a graded project:

  * Every important part must be explained

Must include comments for:

* SQL queries (what + why)
* m:n relationship usage
* API endpoints purpose

---

## 12. Expected Output Behavior

* Homepage:

  * Shows all games with cover images
* Click:

  * Opens modal
* Modal:

  * Loads details dynamically
  * Displays Steam description + metadata

---

## Goal

Create a **simple, functional Netflix-style Steam library** that demonstrates:

* Understanding of **databases (m:n relationships)**
* Clean **PHP API usage**
* Structured **Vanilla JS frontend**
* Clear and maintainable code
