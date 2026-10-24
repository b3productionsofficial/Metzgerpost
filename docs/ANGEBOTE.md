# Modul Angebote

Stand: 25.10.2026 · Branch `staging` · noch **nicht** auf `main`

Der Metzger legt ein Angebot an (Produkt, Preis, optional Vorher-Preis, Zeitraum, Bildschirm).
Daraus entstehen automatisch drei Bilder: TV (1920×1080), Instagram Feed (1080×1350), Story (1080×1920).
Das TV-Bild läuft im gewählten Zeitraum auf Screen 3 und verschwindet danach von selbst.

## Dateien

| Datei | Zweck |
|---|---|
| `modules/angebote/index.html` | Übersicht: läuft / geplant / vergangen / Entwürfe; Bilder, Duplizieren, Beenden, Löschen |
| `modules/angebote/bearbeiten.html` | Angebot anlegen/bearbeiten (`?id=`), duplizieren (`?copy=`), aus Produkt starten (`?produkt=`) |
| `modules/angebote/produkte.html` | Produktbibliothek (getrennt von den Mittagstisch-Gerichten) |
| `modules/angebote/angebote.js` | Datenzugriff (Supabase), Datum/Woche, Preis-Parsing, Foto-Komprimierung |
| `modules/angebote/renderer.js` | Zeichnet die Folien auf ein Canvas (keine Abhängigkeiten) |
| `modules/angebote/angebote.css` | Styles des Moduls (neue Designrichtung) |
| `modules/angebote/vorlagen/<kunde>/preis-angebot.json` | Positionen, Größen, Farben, Schriften je Format |
| `modules/angebote/vorlagen/<kunde>/bg-*.jpg` | Fester Hintergrund aus Canva (Papier, grüne Fläche, Logo, Würste, „Angebote“) |
| `modules/display/screen3-v2.html` | Neuer Screen 3: Aktionsbilder + laufende Angebote |
| `supabase/angebote.sql` | Tabellen `angebots_produkte`, `angebote` (bereits angewendet) |
| `tests/angebote/` | Render- und Oberflächentests (lokal, ohne echte Datenbank) |

## Datenmodell

**`angebots_produkte`**: `kunde_id`, `name`, `einheit` (`kg` / `100g` / `stueck`), `bild_url`, `sortierung`, `aktiv`
(„Entfernen“ setzt nur `aktiv = false`, alte Angebote bleiben intakt).

**`angebote`**: `kunde_id`, `produkt_id`, `titel` (Text auf der Folie), `bild_url`, `preis`, `einheit`,
`streichpreis` (leer = kein kleiner Kreis), `streichpreis_bestaetigt`, `gueltig_von`, `gueltig_bis`,
`screens` (z. B. `{screen3}`), `status` (`entwurf` / `aktiv` / `beendet`), `render_tv_url`, `render_feed_url`, `render_story_url`.

Datenbank-Regeln: `gueltig_bis >= gueltig_von`; ein Streichpreis ist nur mit Bestätigung speicherbar (§ 11 PAngV).
Lesen ist öffentlich (TV ohne Login), Schreiben nur eingeloggt. `angebote` ist in der Realtime-Publikation.

Bilder liegen im Bucket `screen-assets` unter `<kunde_id>/angebote/…` (Produktfotos unter `…/angebote/produkte/`).
Beim erneuten Speichern werden die alten Renderbilder gelöscht.

## Regeln der Vorlage (Preis-Angebot)

- Großer Kreis: Preis groß und mittig, darunter „€ pro kg / 100 g / Stück“
- Kleiner Kreis (versetzt, mit Schatten): „statt“ + durchgestrichener Vorher-Preis – **nur wenn ein Vorher-Preis eingetragen ist**
- Lange Preise (z. B. 139,90) und lange Vorher-Preise werden automatisch kleiner
- Produktname: TV bis 3 Zeilen, Feed 2, Story 3; wird zu lang → kleiner, notfalls mit „…“ gekürzt
- Zeitraum direkt unter dem Namen: „vom 26. Okt - 31. Okt 2026“ (über den Jahreswechsel mit beiden Jahren)
- Foto füllt den Kreis automatisch (mittig zugeschnitten), weißer Rand
- Schriften: Montserrat (Preise), IBM Plex Serif (Name, Zeitraum) – werden von Google Fonts geladen

Neuer Kunde: Ordner `vorlagen/<config-key>/` mit eigener JSON + Hintergründen anlegen. Fehlt er, wird `sorgundseitz` verwendet.

## Screen 3 (v2)

URL: `/modules/display/screen3-v2.html?kunde=<kunden-id>`

- liest dieselbe `screen3_config` wie bisher (aktive Bilder, Timer) – im Display Manager ändert sich nichts
- mischt die heute gültigen Angebote (`status = aktiv`, `screens` enthält `screen3`) abwechselnd mit den Bildern
- gleicht ab: per Realtime, alle 5 Minuten, kurz nach Mitternacht, nach Verbindungsabbruch, beim Sichtbarwerden
- lädt jedes Bild nur einmal und wechselt erst, wenn alle Bilder geladen sind (kein schwarzes Bild)
- startet nachts gegen 3 Uhr einmal neu – nur wenn online
- Testen: `&datum=2026-10-26` simuliert ein Datum, `&debug=1` zeigt eine Info-Box
- Doppelklick = Vollbild

## Testen auf der Testseite

1. `https://staging--metzgerpost.netlify.app/dashboard.html` → Karte „Angebote“
2. Als Admin mit Testkunde: `…/modules/angebote/index.html?kunde=test0001`
   (Testdaten: 4 Produkte, Angebote in verschiedenen Zeiträumen; Produktfotos sind vorerst Mittagstisch-Bilder)
3. Screen-Test: `…/modules/display/screen3-v2.html?kunde=test0001&datum=2026-10-26&debug=1`

Ohne `?kunde=` arbeitet das Modul mit dem im Dashboard gewählten Kunden – das ist unkritisch,
solange der Laden-TV noch auf dem alten `screen3.html` läuft.

## Go-live

1. `staging` in `main` mergen (nur neue Dateien + Dashboard-Link)
2. Rinderlende o. Ä. als echtes Angebot für den Kunden anlegen
3. Am Laden-TV die URL von `screen3.html` auf `screen3-v2.html` umstellen (gleicher `?kunde=`)
4. Rollback: alte URL wieder eintragen

## Bewusst noch nicht enthalten

Rabatt-Aktion (Folie „-20 % auf …“), Angebote auf Screen 1/2, KI-Eingabe, Bildgenerierung (fal.ai),
Instagram-Auto-Posting, Mandantentrennung per Datenbank (siehe `VERBESSERUNGEN.md`).
