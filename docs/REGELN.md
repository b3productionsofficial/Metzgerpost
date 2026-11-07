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
| GE-03 | Neuer Generator zeichnet **pixelgleich** zum alten (Story, Feed, Druck vorne/hinten) – gleiche Vorlagen, Positionen, Schriften. |
| GE-04 | Gerichte kommen aus der Bibliothek (`mittag_gerichte`), sonst aus dem Browser (alte Verwaltung), sonst Standardgerichte. Einmal „übernehmen“ kopiert sie. Neues Gericht nur mit Foto; „entfernen“ blendet nur aus. |
| GE-05 | Wochen-Knöpfe (diese/nächste/übernächste) bzw. Datum → Text „Di – Fr“ wie bisher (`10.11.2026 - 13.11.2026`). Ab Freitag ist „nächste Woche“ vorgewählt. |
| GE-06 | Vorschau zeigt genau das Bild, das heruntergeladen wird. |
| GE-07 | Instagram-Text wie bisher (Woche + 4 Gerichte). |
| GE-08 | Downloads als PNG mit den bisherigen Dateinamen. |
| GE-09 | „Für Bildschirm 1 speichern“: gleiches Format wie die alte Seite, beim gewählten Kunden, gleiche Woche = aktualisieren; Bildschirm 1 findet sie mit seiner Regel. Preise pro Woche änderbar. |
| GE-10 | Gespeicherte Woche lässt sich wieder öffnen (Gerichte + Preise). |
| GE-11 | Druck: Vorderseite-Text frei, Rückseite links diese / rechts zweite Woche (abschaltbar). Leere Tage bleiben leer statt Fehler. |
| GE-12 | Bedienbar am Handy (keine seitliche Scroll-Leiste). |
| GE-13 | Druck-Deckblatt: mit zweiter Woche automatisch „erster Tag Woche 1 – letzter Tag Woche 2“ (z. B. `10.11. - 20.11.2026`), ohne zweite Woche wie Woche 1. Eigener Text bleibt stehen; Feld leeren oder „Wieder automatisch“ stellt zurück. |
| GE-14 | „Für Bildschirm 1 speichern“ speichert die Woche oben. Nur beim **Druck mit ausgefüllter zweiter Woche** heißt der Knopf „Beide Wochen …“ und speichert die rechte Woche zusätzlich (leere rechte Seite wird nicht gespeichert). Bildschirm 1 zeigt jede Woche erst, wenn sie dran ist. |
| GE-15 | Weicht der Preis vom festen Preis des Gerichts ab, erscheint im Preisfeld ein kleiner 💾-Knopf: speichert den Preis als festen Preis (beim ersten Mal wird dafür die Gerichte-Bibliothek angelegt). Sonst bleibt die Änderung nur für diese Woche. |

## Übersicht (Dashboard)

| Nr. | Regel |
|---|---|
| DB-01 | Karte „Mittagstisch diese Woche“ nutzt dieselbe Wochenregel wie Bildschirm 1; fehlt sie → gelb. |
| DB-02 | „Nächste Woche“ fehlt → ab Donnerstag gelb (Samstag zeigt Bildschirm 1 schon die nächste Woche). |
| DB-03 | Angebote: nur eigene, „läuft“ = heute im Zeitraum, nicht Entwurf/beendet. |
| DB-04 | Links führen zum neuen Generator mit gewähltem Kunden; alte Seiten nur über „Admin“. |
| DB-05 | Bedienbar am Handy. |

## Bildschirm 1 – Textgröße

| Nr. | Regel |
|---|---|
| S1-12 | Lange Gerichtnamen werden auf dem Fernseher automatisch kleiner (bis 75 %), bis sie über dem Preis enden – gemessen an der echten Darstellung. |
| S1-13 | Kurze Namen behalten die Schriftgröße aus dem Positions-Editor. |
| – | Breite und Lage der Texte kommen weiter aus dem Positions-Editor. **06.11.2026 korrigiert** (mit Lukas): großer Freitag Text Breite 23,5 → 20, y 57 → 58,5, Größe 1,7 → 1,6 (lief über den Kasten). Rückweg: `update display_configs set config = jsonb_set(jsonb_set(jsonb_set(config,'{freitag,freitag,text,w}','23.5'),'{freitag,freitag,text,y}','57'),'{freitag,freitag,text,size}','1.7') where kunde_id='6544d8e6' and screen_id='screen1';` |

## Online-Status der Fernseher

| Nr. | Regel |
|---|---|
| TV-01 | Kein Fernseher an → „keine Meldung“. |
| TV-02 | Laufender v2-Bildschirm meldet sich mit Zeit des letzten Abgleichs (und ob Bilder fehlen). |
| TV-03 | Test-Vorschauen mit `?datum=` oder `?debug=1` zählen nicht. |
| TV-04 | Die Meldung beeinflusst die Anzeige nie (Fehler werden ignoriert). |
| TV-05 | Display Manager zeigt heute „Jetzt am Fernseher: Folie x von n“, markiert sie und nennt die Adresse des Fernsehers. |
| TV-06 | Läuft ein Bildschirm mit anderer Kunden-ID, warnt der Display Manager (Admin) mit dessen Adresse. |
| TV-08 | Display Manager zeigt je Bildschirm die **Adresse für den Fernseher** (immer echte Seite, ohne `datum`/`debug`, mit Kopieren). Läuft der Fernseher mit anderer Adresse → Hinweis. „Live-Vorschau“ = dieselbe Seite mit Test-Zusätzen, nur zum Prüfen. |

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
