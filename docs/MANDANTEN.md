# Mandantenfähigkeit – Plan

Stand: 25.10.2026 · **vorbereitet und lokal getestet, noch nicht auf die echte Datenbank angewendet**

## Warum

- Heute darf **jeder**, der die Seite kennt, ohne Login TV-Inhalte ändern und Bilder löschen (der Anon-Schlüssel steht
  zwangsläufig im Quellcode – das ist normal, aber dann müssen die Datenbank-Regeln schützen; die fehlen).
- Für eine zweite Metzgerei muss sichergestellt sein, dass sie **nur ihre eigenen** Daten sieht und ändert.
- Neue Kunden sollen per Datenbank-Eintrag angelegt werden – **kein** neues Supabase-Projekt, **keine** Zusatzkosten.

## Stufe 1 – Rechte (fertig vorbereitet)

Dateien: `supabase/mandanten.sql` (anwenden) · `supabase/mandanten_rueckgaengig.sql` (Rückweg) ·
Test: `tests/regeln/mandanten_test.sh` (frische lokale Postgres-DB mit Supabase-Nachbau).

| Wer | Darf |
|---|---|
| Fernseher (ohne Login) | alles **lesen**, nichts ändern, nichts hochladen |
| Metzgerei (eingeloggt) | eigene Daten lesen/ändern, Bilder nur im eigenen Ordner `screen-assets/<kunde_id>/` |
| fremde Metzgerei | Daten anderer nicht ändern/löschen, nicht in fremde Ordner hochladen |
| Plattform-Admin (Lukas) | alles, auch neue Kunden anlegen |

Neu in der Datenbank: `kunden` (eine Zeile pro Metzgerei), `kunden_mitglieder` (welcher Login gehört zu welcher
Metzgerei), `plattform_admins`, Prüf-Funktionen `mp_darf(kunde_id)` und `mp_ist_admin()`.
Nebeneffekt: Das Speichern der Druck-Positionen im Generator (`generator_configs`) funktioniert damit endlich.

Lokaler Test (23 Fälle, alle OK): TV liest/ändert nicht · Kunde ändert eigene Daten, lädt in eigenen Ordner, nicht in
fremde, löscht keine Altdaten-Bilder, kann sich nicht selbst zum Admin machen · fremde Metzgerei kann nichts ändern ·
Admin darf alles. Rückweg stellt den alten Zustand wieder her.

### Anwenden (gemeinsam, an einem ruhigen Tag, ~30 Minuten)

1. Vorher: Bildschirme laufen auf den v2-Versionen (lesen nur → nicht betroffen).
2. Supabase → SQL-Editor → Inhalt von `supabase/mandanten.sql` ausführen.
3. Direkt testen (eingeloggt als Kunde **und** als Admin):
   Angebot speichern · Woche im Generator speichern · Display Manager: Sonderlayout pausieren, Bild hochladen ·
   Positionen-Editor speichern · alle drei TVs zeigen weiter Inhalte.
4. Wenn etwas hakt: `supabase/mandanten_rueckgaengig.sql` ausführen → sofort alter Zustand.

## Stufe 2 – Kunden aus dem Code (nächster Schritt)

- `shared/supabase.js`: `getAktiveKundeId()` liest die Zuordnung aus `kunden_mitglieder` statt aus der Login-ID
  (für Sorg & Seitz identisch, für neue Kunden nötig); Admin-Kundenauswahl aus der Tabelle `kunden`.
- `modules/mittagstisch/config.js`: Kundendaten (Name, Farben, Gerichte-Vorlagen) schrittweise in die Datenbank.
- Kunden-Anlage im Admin-Bereich: Formular „Neue Metzgerei“ → `kunden` + Einladung per E-Mail → `kunden_mitglieder`.
- Danach Altdaten `057b6a13` umziehen (Bilder in den Kundenordner kopieren, Verweise umstellen) und aufräumen.

## Was es kostet

Nichts zusätzlich: alles im bestehenden Supabase-Projekt (Pro-Plan, ein Projekt für alle Kunden).
