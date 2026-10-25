# Bildschirme (TV) – neue Versionen

Stand: 25.10.2026 abends · Screens v2 live; Display Manager 2.0 nur auf `staging`

## Überblick

| Bildschirm | neu (empfohlen) | alt (Rückfall) | Inhalt |
|---|---|---|---|
| 1 | `modules/display/screen-v2.html?kunde=<id>&screen=screen1` | `screen.html` | Mittagstisch + Sonderlayouts + Angebote |
| 2 | `modules/display/screen2-v2.html?kunde=<id>` | `screen2.html` | Bilder aus dem Display Manager + Angebote |
| 3 | `modules/display/screen3-v2.html?kunde=<id>` | `screen3.html` | Aktionsbilder + Angebote |

Alle neuen Screens nutzen `shared/screen-runtime.js` (Laufzeit) und `shared/screen-regeln.js` (Regeln, siehe `docs/REGELN.md`):

- Abgleich beim Start, **alle 5 Minuten**, per Realtime, nach Mitternacht, wenn wieder online, wenn sichtbar
- Realtime mit automatischer Wiederverbindung
- Erste Folie erscheint, sobald ihr Bild geladen ist (vorher „Inhalte werden geladen …“); danach Umschalten erst, wenn alle Bilder da sind; fehlende Bilder werden später erneut versucht, ohne Endlosschleife
- kurzer Internet-Ausfall: Anzeige läuft einfach weiter; Supabase-Bibliothek nicht geladen → Neuversuch nach 60 s
- nächtlicher Neustart gegen 3 Uhr (nur wenn online)
- Test: `&datum=2026-10-28` simuliert ein Datum, `&debug=1` zeigt eine Info-Box
- Doppelklick = Vollbild, Mauszeiger verschwindet nach 3 s

## Display Manager 2.0 (Testseite)

`modules/display/index.html` – alte Ansicht bleibt unter `manager-alt.html`.
- „So läuft Bildschirm X“: Folien in Reihenfolge, Rundendauer, angewandte Regeln, Warnungen – für jedes Datum (rechnet mit `screen-regeln.js` wie der TV)
- Sonderlayouts: Tage/Datum ändern, umbenennen, pausieren, sortieren, hochladen
- Bildschirm 2/3: Bilder pausieren, sortieren, ersetzen, Takt; Screen 3 mit Bibliothek „weitere hochgeladene Bilder“
- „Bilder optimieren“: große Bilder → max. 1920 px JPG in `<kunde>/optimiert/`, Verweise werden umgestellt, `original` gemerkt
- Speichert sofort, löscht nie Bilddateien

## Regeln Bildschirm 1

1. **Mittagstisch** nur an den im Display Manager eingestellten Mittagstisch-Tagen.
2. Welche Woche? Mo–Fr: die Woche, in der heute liegt. **Sa/So: schon die nächste Woche**, falls gespeichert, sonst die laufende.
3. Ist für diese Woche nichts gespeichert, wird der Mittagstisch **weggelassen** (keine alten/falschen Gerichte).
   Der Display Manager zeigt dann eine Warnung.
4. Groß hervorgehoben wird der heutige Tag; an Tagen ohne eigenes Gericht (Mo/Sa/So) der erste Tag der Woche (Dienstag).
5. **Manueller Modus** (Display Manager) gilt nur am Tag, an dem gesendet wurde – danach automatisch zurück zur Automatik.
6. **Sonderlayouts**: „bestimmtes Datum“ zuerst, dann die nach Wochentagen.
7. **Angebote** mit Bildschirm 1 laufen abwechselnd mit: Mittagstisch → Angebot → Sonderlayout → Angebot …
8. Pausierte Sonderlayouts (`aktiv: false`) laufen nicht.
9. Takt: 10 Sekunden. Positionen/Schriften kommen weiterhin aus dem Editor (`screen.html?editor=true`).

## Regeln Bildschirm 2 und 3

Bilder in der Reihenfolge aus dem Display Manager, Angebote (mit dem jeweiligen Bildschirm) im Wechsel dazwischen,
Takt aus dem Display Manager.

## Mittagstisch-Generator

- Woche wird unter dem **gewählten Kunden** gespeichert (vorher: unter der Login-ID → Admin-Speicherungen gingen verloren).
- Gleiche Woche nochmal speichern **aktualisiert** den Eintrag statt einen zweiten anzulegen.

## Umstellung im Laden (Go-live)

1. `staging` → `main` übernehmen.
2. Supabase: Realtime für `wochen`, `display_configs`, `screen2_config`, `screen3_config` einschalten
   (`alter publication supabase_realtime add table …`). **Nicht** für `displays`, solange irgendwo noch ein alter
   Screen läuft – der alte Screen 1 würde sonst bei jeder Einstellung die Gerichte ausblenden, der alte Screen 2 neu laden.
   Ohne Realtime funktioniert alles trotzdem – dann mit bis zu 5 Minuten Verzögerung.
3. An jedem TV die Adresse auf die neue Version ändern (gleicher `?kunde=`), kurz beobachten.
4. Rückfall: alte Adresse wieder eintragen.

## Tests

`python3 tests/regeln/run_all.py` – alle Regeltests (41 Prüfungen). Einzeln: `python3 tests/bildschirme/screens_test.py` – prüft Wochenwahl (So/Mo/Mi/Fr/Sa/ohne Woche), manuellen Modus,
Live-Änderung, Mischung mit Angeboten, Screen 2 und vergleicht die Darstellung alt/neu (Screenshots in `tests/bildschirme/out/`).
