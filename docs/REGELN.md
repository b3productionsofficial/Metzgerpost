# Regelkatalog MetzgerPost

Stand: 25.10.2026. Jede Regel hat eine Nummer und mindestens einen automatischen Test.
Alle Tests auf einmal: `python3 tests/regeln/run_all.py` (lokal, ohne echte Datenbank, ca. 3 Minuten).
Die Bildschirm-Regeln stehen als Code an **einer** Stelle: `shared/screen-regeln.js` – benutzt von den
TV-Bildschirmen (`screen-v2`, `screen2-v2`, `screen3-v2`) und der Vorschau im Display Manager.

## Bildschirm 1 – Mittagstisch, Sonderlayouts, Angebote

| Nr. | Regel |
|---|---|
| S1-01 | Mittagstisch nur an den eingestellten Mittagstisch-Tagen (Display Manager). Nichts eingestellt → Mo–Fr. |
| S1-02 | Mo–Fr gilt die Woche, deren „gültig ab“ in der laufenden Woche (Mo–So) liegt. Alte Einträge ohne Datum: über KW + Jahr. |
| S1-03 | Sa/So gilt schon die **nächste** Woche, wenn sie gespeichert ist – sonst die laufende. |
| S1-04 | Keine passende Woche → **kein** Mittagstisch (keine alten Gerichte). Display Manager zeigt eine Warnung. |
| S1-05 | Groß hervorgehoben: der heutige Tag (Di–Fr). Mo/Sa/So, fehlender Tag oder nächste Woche → erster Tag mit Gericht. |
| S1-06 | Positionen, Schriften, Farben je Layout aus dem Editor (`display_configs`); fehlt etwas → Standardwerte. |
| S1-07 | Manueller Modus gilt nur am Tag, an dem gesendet wurde: dann nur der Mittagstisch, keine Rotation. Ab dem Folgetag Automatik. |
| S1-08 | Sonderlayouts: „bestimmtes Datum“ zuerst, dann die nach Wochentagen, in gespeicherter Reihenfolge. **Pausierte nie.** |
| S1-09 | Angebote: Status aktiv, Bildschirm 1 angehakt, heute zwischen von und bis (inkl.), TV-Bild vorhanden. |
| S1-10 | Mischung: Basis 1 → Angebot → Basis 2 → Angebot …; mehrere Angebote abwechselnd; jedes mindestens einmal pro Runde. |
| S1-11 | Takt 10 Sekunden, Fortschrittsbalken unten. |
| S1-12 | Daten anderer Kunden erscheinen nie. |
| S1-13 | Nichts anzuzeigen → Hinweis „Gleich geht's weiter“. |

## Bildschirm 2 und 3 – Bilder und Angebote

| Nr. | Regel |
|---|---|
| S2-01 | Bildschirm 2 zeigt die Bilder aus dem Display Manager in dieser Reihenfolge (pausierte nicht). |
| S2-02 | Angebote mit Bildschirm 2 im Wechsel dazwischen (wie S1-10). |
| S2-03 | Takt aus dem Display Manager (3–120 s, Standard 8 s). |
| S3-01 | Bildschirm 3 zeigt die ausgewählten Aktionsbilder (pausierte nicht). |
| S3-02 | Angebote mit Bildschirm 3 zuerst, dann die Aktionsbilder (A1, B1, A2, B2 …). |
| S3-03 | Takt aus dem Display Manager (Standard 10 s). |

## Laufzeit aller neuen Bildschirme

| Nr. | Regel |
|---|---|
| LZ-01 | Abgleich: beim Start, alle 5 Minuten, per Realtime, kurz nach Mitternacht, wenn wieder online, wenn sichtbar. |
| LZ-02 | Die erste Folie erscheint, sobald **ihr** Bild geladen ist; beim Laden „Inhalte werden geladen …“ statt Schwarz. |
| LZ-03 | Bilder, die nicht laden, werden weggelassen und später erneut versucht – **kein** Endlos-Nachladen. |
| LZ-04 | Änderungen erscheinen ohne Neuladen der Seite; die Rotation bleibt an derselben Stelle. |
| LZ-05 | Supabase-Bibliothek nicht geladen → Neuversuch nach 60 s. |
| LZ-06 | Nächtlicher Neustart gegen 3 Uhr, nur wenn online. |
| LZ-07 | Testparameter: `&datum=JJJJ-MM-TT`, `&debug=1`. |

## Angebote-Modul

| Nr. | Regel |
|---|---|
| AN-01 | Kleiner Kreis („statt“ + durchgestrichener Vorher-Preis) nur, wenn ein Vorher-Preis eingetragen ist. |
| AN-02 | Vorher-Preis nur mit Bestätigung „niedrigster Preis der letzten 30 Tage“ (§ 11 PAngV) – in Oberfläche **und** Datenbank. |
| AN-03 | „bis“ nie vor „von“ (Oberfläche und Datenbank). |
| AN-04 | Zeitraum-Text „vom 26. Okt - 31. Okt 2026“, über den Jahreswechsel mit beiden Jahren. |
| AN-05 | Lange Preise/Namen werden automatisch kleiner (Name zuerst einzeilig, dann max. 2 Zeilen). |
| AN-06 | Drei Bilder: TV 1920×1080, Feed 1080×1350, Story 1080×1920. |
| AN-07 | Speichern rendert und lädt die drei Bilder hoch; alte Bilder werden gelöscht. |
| AN-08 | Übersicht: läuft / geplant / vergangen / Entwürfe. |
| AN-09 | Duplizieren schlägt die Woche nach dem Original vor. |
| AN-10 | Produkt „entfernen“ blendet es nur aus – alte Angebote bleiben intakt. |
| AN-11 | Bildschirme 1, 2, 3 einzeln wählbar. |

## Mittagstisch-Generator

| Nr. | Regel |
|---|---|
| GE-01 | „Als Woche speichern“ speichert beim **gewählten Kunden** (Admin) bzw. beim eigenen Betrieb. |
| GE-02 | Dieselbe Woche nochmal speichern aktualisiert den Eintrag (kein Doppel). |

## Display Manager

| Nr. | Regel |
|---|---|
| DM-01 | Warnung, wenn für diese (bzw. am Wochenende nächste) Woche kein Mittagstisch gespeichert ist. |
| DM-02 | Hinweis, wie viele Angebote auf welchem Bildschirm mitlaufen. |
| DM-03 | Tag-Knöpfe im manuellen Modus verändern die Mittagstisch-Tage nicht. |
| DM-04 | „Öffnen“/„URL“ zeigen auf die neuen Bildschirme (v2). |
| DM-05 | Vorschau „So läuft's heute“ rechnet mit denselben Regeln wie der TV (für jedes Datum). |
| DM-06 | Sonderlayouts: Tage ändern, pausieren, Reihenfolge ändern – ohne neu hochzuladen. |
| DM-07 | „Bilder optimieren“ verkleinert große Bilder (max. 1920 px, JPG), lädt sie neu hoch und stellt die Bildschirme um; Originale bleiben. |
