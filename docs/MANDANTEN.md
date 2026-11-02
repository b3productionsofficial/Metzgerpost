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

## Stufe 2 – Neue Metzgerei per Einladungscode (fertig vorbereitet, ausgeschaltet)

Stand 02.11.2026. Dateien: `supabase/mandanten_stufe2.sql` (nach Stufe 1 anwenden) · Code in `shared/supabase.js`
(Schalter `MP_MANDANTEN_AKTIV = false`) · Admin-Seite `modules/admin/kunden.html` · Code-Feld auf der Übersicht.

Ablauf:
1. Admin → Übersicht → Admin → **Kunden verwalten** → „+ Neue Metzgerei“ → Name, Paket → Einladungscode (14 Tage gültig).
2. Die Metzgerei registriert sich und gibt den Code auf ihrer Übersicht ein → sie ist mit „ihrer“ Metzgerei verbunden.
3. Admin kann bei jedem Kunden „Bearbeiten als dieser Kunde“ wählen (Generator, Angebote, Display Manager arbeiten dann mit dessen ID).

Solange der Schalter aus ist, fragt die App die neuen Tabellen **nicht** ab – alles verhält sich wie bisher
(Kunden-ID = Anfang der Login-ID; für Sorg & Seitz ist das dieselbe ID wie in der neuen Tabelle).

Tests: `tests/regeln/mandanten_test.sh` (Datenbank: 25 Rechte-Fälle Stufe 1 + 10 Fälle Stufe 2) ·
`tests/regeln/mandanten_ui_test.py` (Browser: aus = wie bisher; an = anlegen, Code einlösen, eigene ID).

### Einschalten (gemeinsam, nach Stufe 1)
1. `supabase/mandanten_stufe2.sql` im SQL-Editor ausführen.
2. In `shared/supabase.js` `MP_MANDANTEN_AKTIV = true` setzen → `staging` → testen → `main`.
3. Testlauf: Testmetzgerei anlegen, mit zweitem Login Code einlösen, Woche speichern, prüfen dass Sorg & Seitz unverändert ist.

### Noch offen (Stufe 3)
- Eigene Vorlagen/Layouts für neue Kunden (bisher fest in `config.js`; ohne eigene Vorlage nutzt ein neuer Kunde die von Sorg & Seitz).
- Altdaten `057b6a13` umziehen und aufräumen.

## Was es kostet

Nichts zusätzlich: alles im bestehenden Supabase-Projekt (Pro-Plan, ein Projekt für alle Kunden).
