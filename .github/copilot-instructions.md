Es soll eine Webseite erstellt werden mit einer Datenbank über Steamgames in der steam-games.json.
Das Projekt soll wie Nextflix aussehen und die Spiele mit deren Bildern aus der "image-logo-url" beinhalten und wenn man draufklickt soll die "image-icon-url" in einem pop up fenster angezeigt werden mit der Game beschreibung und ein paar metadaten zum Spiel. 

BSP. für eine API:

Image-logo-url: https://media.steampowered.com/steamcommunity/public/images/apps/240/ee97d0dbf3e5d5d59e69dc20b98ed9dc8cad5283.jpg

image-icon-url: https://media.steampowered.com/steamcommunity/public/images/apps/240/9052fa60c496a1c03383b27687ec50f4bf0f0e10.jpg

game-beschreibung: https://store.steampowered.com/api/appdetails?appids=240&l=de

Techstack: MySQL, PHP, HTML, Javascript vanilla, css

Die Webseite soll so einfach wie möglich sein kein komplizierter code nur die nötigsten Funktionen. Es soll eine Startseite geben auf der alle Spiele mit ihren Bildern angezeigt werden. Man kann auf ein bild klicken und ein Pop-up-Fenster öffnet sich, das die "image-icon-url" anzeigt, zusammen mit der Spielbeschreibung und einigen Metadaten zum Spiel. Die Daten für die Spiele sollen aus der "steam-games.json" Datei geladen werden, die in einer MySQL-Datenbank gespeichert ist. Die Webseite soll mit PHP erstellt werden, um die Daten aus der Datenbank abzurufen und an die Frontend-Seite zu senden, die mit HTML, CSS und JavaScript erstellt wird.

Aufgaben die erledigt werden müssen:
1. Erstellen einer MySQL-Datenbank (lokal) und einer Tabelle, um die Spieldaten zu speichern. Mindestens eine m zu n Beziehung zwischen Spielen und Genres, da ein Spiel mehrere Genres haben kann und ein Genre mehrere Spiele haben kann.
2. Datenbankschema erstellen, um die Spieldaten zu organisieren.
3. Skizze Oberflächendesign erstellen, um die Webseite wie Netflix aussehen zu lassen.
4.Dokumentation erstellen, um die Funktionen und den Code der Webseite zu erklären.