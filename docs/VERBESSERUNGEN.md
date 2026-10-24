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
