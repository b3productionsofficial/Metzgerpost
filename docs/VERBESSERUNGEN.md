# Verbesserungsliste MetzgerPost

Gesammelt beim Review und beim Bau des Angebote-Moduls (24./25.10.2026).
Nichts davon wurde an der Live-App verändert – das sind Empfehlungen.

## 🔴 Dringend (Sicherheit / Funktion)

1. **Realtime kommt bei den TVs nie an.** In der Supabase-Publikation `supabase_realtime` war *keine einzige Tabelle*
   eingetragen. Screen 1, 2 und 3 abonnieren zwar Änderungen, bekommen aber nie eine Nachricht – sie aktualisieren sich
   nur beim Neuladen (Screen 1 einmal täglich um Mitternacht). Das erklärt verspätete Änderungen am TV.
   *Lösung:* `displays`, `display_configs`, `screen2_config`, `screen3_config` zur Publikation hinzufügen **und**
   in den Screens ein Polling als Sicherheitsnetz einbauen (wie in `screen3-v2`). Vorsicht: Screen 2 lädt bei jeder
   Änderung die ganze Seite neu – vorher prüfen.
2. **Jeder kann die TV-Inhalte ändern.** RLS ist aus bei `wochen`, `screen2_config`, `screen3_config`, `packages`;
   `displays` und `display_configs` erlauben allen alles; im Storage-Bucket `screen-assets` darf jeder (auch ohne Login)
   Dateien hochladen, überschreiben und **löschen**. Der Anon-Key steht öffentlich im Quellcode.
   *Lösung:* RLS an, Lesen öffentlich, Schreiben nur eingeloggt (wie bei den neuen Angebots-Tabellen) –
   an einem Abend mit temporärem Supabase-Branch testen, Rückgängig-SQL bereithalten.
3. **Layout-Positionen des Druck-Layouts werden nie gespeichert.** `generator_configs` hat RLS an, aber *keine Policy* –
   jedes Speichern wird still abgelehnt (daher „savePositionsToSupabase funktioniert nicht“).
   *Lösung:* Policies für `generator_configs` anlegen.
4. **Tabellen fehlen, Code fällt still auf localStorage zurück:** `gerichte`, `kunden`, `wochenplaene` existieren nicht.
   Gerichte und Wochenpläne sind dadurch nur im jeweiligen Browser gespeichert.
5. **Alte Admin-Daten (`057b6a13`) nicht löschen:** Der Live-Screen 3 und die Sonderlayouts von Screen 1 zeigen noch
   Bilder aus diesem Ordner. Erst umziehen, dann aufräumen.

## 🟠 Wichtig (Kosten / Stabilität / Verkaufbarkeit)

6. **Bilder sind 6–7 MB groß.** Für TVs reichen 300–500 KB. Beim Upload im Display Manager komprimieren
   (wie im Angebote-Modul: `MPAngebote.komprimiereFoto`). Bestehende Bilder einmal neu speichern.
7. **Screen 1 lädt Sonderbilder mit Cache-Buster neu** (~40× am Tag à 6,5 MB). Cache-Buster nur bei Änderung setzen.
8. **Keine Zuordnung Login → Kunde in der Datenbank.** Dadurch ist echte Mandantentrennung (Kunde A sieht nie Daten von
   Kunde B) per RLS nicht möglich; aktuell verlässt sich alles auf den Browser. Für den Verkauf an weitere Metzgereien
   nötig: Tabelle `kunden` (user_id ↔ kunde_id, Plan, Rolle) und darauf aufbauende Policies.
9. **Kunden stehen fest in `config.js`.** Neuer Kunde = Code-Deploy. In die Datenbank verlagern.
10. **Screens haben keinen Resync/Reconnect** (außer `screen3-v2`). Eine gemeinsame `screen-runtime.js` für alle Screens
    (Laden, Realtime mit Wiederverbindung, Polling, nächtlicher Neustart, Bild-Vorladen) würde Doppelcode entfernen.
11. **Supabase-Zugangsdaten stehen in jeder Screen-Datei einzeln.** Zentral in einer Datei ablegen.
12. **Screen 3 alt verzerrt Bilder** (`object-fit: fill`). In `screen3-v2` behoben (`cover`).
13. **Display Manager:** viele Sonderregeln (Automatik, Sonderlayouts, Mittagstisch-Tage) – vereinheitlichen; Hinweis
    „+ X Angebote laufen mit“ bei Screen 3 ergänzen; Angebote auch auf Screen 1/2 anbieten.
14. **Supabase Auth:** „Leaked Password Protection“ ist aus – im Supabase-Dashboard einschalten (ein Schalter).

## 🟡 Später (Qualität / Design)

15. **Navigation ist auf dem Handy zu breit** (seitliches Scrollen). Im Angebote-Modul lokal behoben, global in
    `shared/style.css` übernehmen.
16. **Weiße Schrift auf orangen Buttons** hat zu wenig Kontrast (ca. 2,6:1). Im Angebote-Modul dunkle Schrift.
17. **Design der anderen Module** an das Angebote-Modul angleichen (nummerierte Schritte, Live-Vorschau, große Klickflächen).
18. **`script.js`:** `downloadBack` und `downloadPrint` sind doppelt definiert (die zweite überschreibt die erste).
19. **Altlasten:** `tv.html`, `tv1–3.html` vermutlich unbenutzt; `screen3.html` referenziert einen nicht vorhandenen
    Vollbild-Button (JS-Fehler beim Verlassen des Vollbilds).
20. **`CLAUDE_CONTEXT.md` ist veraltet/widersprüchlich** (z. B. Admin-Erkennung) – nach jeder Session aktualisieren.
21. **`supabase-schema.sql` entspricht nicht der echten Datenbank** – aus der Datenbank neu erzeugen.

## 📺 Bildschirme – Analyse vom 25.10.2026 (Screen 1/2/3, Display Manager, Mittagstisch)

Echter Stand Sorg & Seitz: Screen 1 rotiert alle 10 s zwischen Mittagstisch, „Warme Theke“ (So–Sa) und „20“ (Mo–Sa);
Mittagstisch-Tage = alle 7 Tage; Screen 2 = 3 Bilder, Screen 3 = 3 Bilder (alle 12 s); genau eine gespeicherte Woche (KW 44).

**Warum Änderungen „nicht ankommen“**
- B1. Screen 1/2/3 bekommen Änderungen nur beim Neuladen bzw. Screen 1 kurz nach Mitternacht – Realtime ist tot, kein Polling.
- B2. **Achtung, versteckte Falle:** Würde man Realtime einfach einschalten, rendert Screen 1 *jede* Änderung in `displays`
  (auch „Mittagstisch-Tage speichern“ oder Sonderlayouts) als Gerichte → Gerichte verschwinden; Screen 2 lädt bei jeder
  Änderung an Bildschirm 1 komplett neu. Deshalb Realtime nur zusammen mit neuen Screens aktivieren.
- B3. Mittagstisch-Generator speichert die Woche unter der **ID des eingeloggten Users**, nicht unter dem gewählten Kunden.
  Speichert Lukas (Admin) eine Woche für Sorg & Seitz, landet sie bei `057b6a13` → TV zeigt sie nie (4 solche Wochen aus Mai).
- B4. Woche wird jedes Mal **neu angelegt** (insert). Wird dieselbe Woche korrigiert und nochmal gespeichert, gibt es zwei
  Einträge mit gleichem Datum – welcher am TV läuft, ist Zufall (es gibt keine Spalte „erstellt am“).
- B5. Gibt es keine Woche für „diese Woche“, zeigt Screen 1 einfach die **neueste** – das kann eine alte oder schon die nächste sein.

**Stabilität**
- B6. Kurzer WLAN-Aussetzer beim Start oder um Mitternacht → „Heute kein Mittagstisch“ bis zum nächsten Rotationsschritt;
  lädt die Supabase-Bibliothek beim Start nicht, bleibt der Screen dauerhaft so stehen (JS-Fehler in `showDemo`, kein Retry).
- B7. Kein nächtlicher Neustart, kein Wiederverbinden (nur `screen3-v2` hat das).
- B8. Screen 3 (alt) verzerrt Bilder (`object-fit: fill`); Screen 1/2 ebenso, wenn ein Bild nicht exakt 16:9 ist.

**Regeln / Bedienung**
- B9. Mittagstisch-Tage stehen auf Mo–So, Gerichte gibt es nur Di–Fr → Mo/Sa/So wird das Dienstag-Layout gezeigt
  (Dienstag groß hervorgehoben).
- B10. „Manueller Modus“ bleibt für immer aktiv, bis jemand wieder auf Automatik schaltet – keine Rückkehr am nächsten Tag.
- B11. „Auf Bildschirm 1 senden“ hat im Automatik-Modus keine sichtbare Wirkung (Screen 1 liest die Wochen direkt).
- B12. Display Manager: Die Tag-Knöpfe im manuellen Modus löschen optisch die Markierung der Mittagstisch-Tage (gleiche CSS-Klasse).
- B13. Screen 2: Die im Display Manager eingetippten Preislisten (Sektionen/Zeilen) werden am TV **gar nicht angezeigt** –
  der Screen zeigt nur die Hintergrundbilder.
- B14. Screen 3 im Display Manager: Bilder aus dem alten Admin-Ordner (`057b6a13`) lassen sich nicht wirklich löschen
  (falscher Pfad), neue Uploads landen im Kundenordner.

**Empfehlung:** wie bei `screen3-v2` neue Dateien `screen-v2.html` (Screen 1) und `screen2-v2.html` mit gemeinsamer
Laufzeit (`shared/screen-runtime.js`: Laden, Polling 5 Min, Realtime mit Reconnect, Mitternacht, nächtlicher Neustart,
Bild-Vorladen, Retry) + Angebote eingemischt. Alte Screens bleiben unverändert → Umstellen/Zurück per URL.
Dazu kleine Fixes im Generator (B3, B4) und Display Manager (B10–B12) auf `staging`.

## Angebote-Modul – nächste Ausbaustufen

- Rabatt-Aktion als zweiter Folientyp („-20 % auf …“, 1–3 Fotos)
- Echte Produktfotos (Fotoshooting) statt Stock/KI; optional „Bild generieren“ (fal.ai) mit Freigabe
- KI-Eingabefeld: „ab Montag Rinderlende 39,90 statt 46,20“ → füllt das Formular
- Instagram-Auto-Posting, WhatsApp als Eingabe
- Schrift der Preiszahl ggf. anpassen (aktuell Montserrat)

## Aufräumen in Canva (Testdateien von heute)

„MetzgerPost – Angebot Vorschau (Preis-Angebot)“ (ohne 1:1), „MetzgerPost – Angebot Vorschau (Preis-Angebot, 1:1)“,
eine doppelte „MetzgerPost – Angebot Vorlage (Hintergrund)“ und die ältere „Angebot KW44 – Rinderlende (26.–31.10.2026)“
können gelöscht werden. Behalten: „… TV (Layout Folie 24)“, „… Instagram Feed“, „… Instagram Story“ und die drei
„MetzgerPost – Hintergrund Preis-Angebot …“.
