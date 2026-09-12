# 🌱 Grow a Garden - Live Stock Tracker & Notifier

Eine moderne, blitzschnelle Web-App für das Roblox-Spiel **Grow a Garden (GAG)**. Sie zeigt den Live-Bestand aus den Ingame-Shops für Samen (Seeds), Werkzeuge (Gear) und Dekoration (Cosmetics) an, bietet animierte Restock-Countdown-Timer und versendet native Windows-Desktop-Benachrichtigungen, sobald beobachtete Gegenstände im Shop vorrätig sind.

![GAG Stock Preview](https://growagarden.gg/favicon.ico)

---

## ✨ Features

- 🌾 **Seeds Shop (Alle Samen):**
  - Zeigt **alle** bekannten Seeds im Spiel an – auch wenn sie ausverkauft sind (Bestand `0`).
  - Vorrätige Samen werden mit grünem Badge und exakter Stückzahl hervorgehoben.
  - Notification-Button (🔴 Rot = Aus / 🟢 Grün = An) neben jedem Seed.

- ⚙️ **Gear Shop (Alle Werkzeuge):**
  - Zeigt **alle** Werkzeuge und Sprinkler an (auch bei Bestand `0`).
  - Notification-Button (🔴 Rot / 🟢 Grün) zur gezielten Überwachung seltener Werkzeuge.

- ✨ **Cosmetics Shop (Nur im Stock):**
  - Zeigt ausschließlich Deko-Artikel an, die **aktuell im Shop verfügbar** sind. Keine unübersichtlichen Leer-Einträge.

- 🔔 **Windows Desktop-Benachrichtigungen:**
  - Klicke auf die Glocke eines Seeds oder Gears, um sie auf **🟢 Grün** zu schalten.
  - Der Status wird dauerhaft im Browser (`localStorage`) gespeichert.
  - Sobald das Item im Shop auftaucht oder nachgestockt wird, sendet der Browser eine native Windows-Benachrichtigung:
    ```text
    Titel: GAG Stock Notifier
    Text:  [ItemName] in Stock Amount: [Amount]
    ```
  - Angenehmer Chime-Sound (über die Web Audio API – keine externen MP3s nötig).

- ⏱️ **Live Restock Countdown Timers:**
  - Exakte Countdown-Anzeige (`MM:SS`) und Fortschrittsbalken für Seeds, Gear und Cosmetics.
  - Bei Ablauf der Restock-Zeit aktualisiert sich die Seite automatisch.

- 🔍 **Echtzeit-Suche & Filter:**
  - Sofortiges Filtern nach Namen.
  - Filter nach *Alle anzeigen*, *Nur im Stock* oder *Nur mit aktiver Benachrichtigung (🟢)*.

---

## 🚀 Live auf GitHub Pages aktivieren

Um diese Website direkt über GitHub Pages online erreichbar zu machen:

1. Gehe auf GitHub zu deinem Repository: `https://github.com/kipperadrian3-boop/gag-stock`
2. Klicke auf **Settings** (Einstellungen) > **Pages**.
3. Wähle unter **Branch** den Branch `main` und Ordner `/ (root)`.
4. Klicke auf **Save**.
5. Nach 1–2 Minuten ist deine Website weltweit unter `https://kipperadrian3-boop.github.io/gag-stock/` erreichbar!

---

## 🛠️ Technologie

- **Frontend:** Pure HTML5, Modern CSS3 (Glassmorphism, Dark Emerald Glow, CSS Grid), Vanilla ES6 JavaScript.
- **APIs:** 
  - Offizielle In-Game Stock API (`growagarden.gg/api/stock`)
  - Web Notification API (Windows Desktop Alerts)
  - Web Audio API (Synthesizer Sound Effects)
- Keine schweren Frameworks oder Node-Abhängigkeiten zur Laufzeit – maximale Performance und 100% kompatibel mit statischem Hosting.

---

*Erstellt mit ❤️ für die Grow a Garden Community.*
