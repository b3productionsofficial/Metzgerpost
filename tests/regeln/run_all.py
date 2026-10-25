"""Alle Regeltests auf einmal – nach jeder Änderung laufen lassen.
Aufruf: python3 tests/regeln/run_all.py      (ca. 3–4 Minuten, kein Internet nötig)
Prüft jede Regel aus docs/REGELN.md anhand der Ausgaben der Einzeltests."""
import subprocess, os, re, sys, time
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

def lauf(cmd, cwd=REPO, timeout=400):
    t = time.time()
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        out = r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        out = 'TIMEOUT'
    return out, time.time() - t

# (Regel, Beschreibung, Test, Muster das in der Ausgabe vorkommen MUSS)
PRUEFUNGEN = {
  'regeln': (['node', 'tests/regeln/regeln_test.js'], [
    ('S1-01..S3-03', 'Regel-Logik (Node, alle Fälle)', r'\n\d+ OK, 0 FEHLER'),
  ]),
  'bildschirme': (['python3', 'tests/bildschirme/screens_test.py'], [
    ('S1-03', 'Sonntag zeigt nächste Woche', r"2026-10-25 .*\['MT\[di 27\.10\]', 'S:gyros'\]"),
    ('S1-05', 'Mittwoch groß', r"2026-10-28 .*'MT\[mi 27\.10\]'"),
    ('S1-08', 'Datum-Sonderlayout zuerst', r"2026-10-30 .*'MT\[fr 27\.10\]', 'A:lende', 'S:backschinken'"),
    ('S1-03', 'Samstag schon nächste Woche', r"2026-10-31 .*'MT\[di 03\.11\]'"),
    ('S1-04', 'ohne Woche kein Mittagstisch', r"2026-11-10 .*\['S:gyros', 'S:kotelett'\]"),
    ('S1-10', 'Angebot im Wechsel (Folie 2 = Angebot)', r'Folie 2 aktiv: a:lende'),
    ('S1-07', 'manuell am Sendetag', r"manuell 2026-10-28 \['MT\[do 27\.10\]'\]"),
    ('S1-07', 'manuell abgelaufen', r'manuell 2026-10-29 .*Automatik'),
    ('LZ-04', 'neue Woche ohne Neuladen sichtbar', r"neue Woche: \['S:gyros', 'S:kotelett'\] -> \['MT\[di 10\.11\]'"),
    ('S1-13', 'leerer Kunde → Hinweis', r'leerer Kunde: show'),
    ('S2-02', 'Screen 2 mit Angeboten', r"2026-10-28 \['S:kotelett', 'A:nur2', 'S:gyros', 'A:lende'\]"),
    ('S2-01', 'Screen 2 Rotation', r'rotation: kotelett\.jpg -> gyros\.jpg'),
    ('S1-06', 'keine JS-Fehler', r'FEHLER: \[\]'),
  ]),
  'screen3': (['python3', 'screen_test.py'], [
    ('S3-02', 'Angebot läuft ab Montag', r"2026-10-26 \['lende\.jpg', 'gulasch\.jpg', 'lende\.jpg', 'gyros\.jpg'\]"),
    ('S3-01', 'nach Ende nur Bilder', r"2026-11-03 \['gulasch\.jpg', 'gyros\.jpg'\]"),
    ('LZ-04', 'beendetes Angebot verschwindet', r"nach beenden: \['lende\.jpg', 'gulasch\.jpg', 'gyros\.jpg'\]"),
    ('S1-13', 'leer → Hinweis', r'leerer kunde: show'),
  ]),
  'angebote_render': (['python3', 'render_tests.py'], [
    ('AN-01..06', 'alle Folien gerendert', r'rendered 16'),
  ]),
  'angebote_ui': (['python3', 'ui_test.py'], [
    ('AN-07..11', 'Oberfläche ohne Fehler', r'FEHLER: \[\]'),
  ]),
  'display_manager': (['python3', 'tests/regeln/dm_test.py'], [
    ('DM-01', 'Warnung ohne Woche (Karte + Ablauf)', r'DM-01 ohne Woche, Karte: True \| Warnung im Ablauf: True'),
    ('DM-01', 'keine Warnung mit Woche', r'DM-01 mit Woche, Warnung: False'),
    ('DM-02', 'Angebote an den Karten', r'Mittagstisch \|\| Heute: 6 Folien · Runde 1 min · 1 Angebot'),
    ('DM-04', 'Live-Vorschau zeigt auf v2', r'DM-04 Live-Vorschau: screen-v2\.html\?kunde=6544d8e6'),
    ('DM-05', 'Ablauf = TV-Regeln (Mi)', r"DM-05 Ablauf S1 Mi: \['M:Mittwoch', 'A:Frische', 'S:Warme', 'A:Frische', 'S:20', 'A:Frische'\]"),
    ('DM-05', 'Ablauf für anderes Datum (So)', r"DM-05 Ablauf S1 So 01\.11\.: \['M:Dienstag', 'S:Warme'\]"),
    ('DM-06', 'Pausieren nimmt aus der Runde', r"DM-06 pausiert gespeichert: False \| Ablauf: \['M:Mittwoch', 'A:Frische', 'S:Warme', 'A:Frische'\]"),
    ('DM-06', 'Reihenfolge + Tage ändern', r"DM-06 Reihenfolge/Tage: \['20', 'Warme Theke'\] \[0, 1, 2, 3, 4, 5, 6\] False"),
    ('DM-06', 'Umbenennen', r'DM-06 Name: Gruppenbild'),
    ('DM-06', 'Datum statt Wochentage', r'DM-06 Datum: datum 2026-10-28'),
    ('S1-01', 'Mittagstisch-Tage ändern wirkt', r"S1-01 MT-Tage ohne Mi: \[0, 1, 2, 4, 5, 6\] \| Ablauf: \['S:Gruppenbild'"),
    ('S1-07', 'manuell nur heute + zurück', r"S1-07 manuell: 4 \| Ablauf: \['M:Donnerstag'\] \| Karte manuell: True"),
    ('S1-07', 'Zurück zur Automatik', r'S1-07 zurück: False'),
    ('S2-01', 'Bild pausieren (Screen 2)', r"S2-01 pausiert: \[None, False\] \| Ablauf: \['B:Sortiment'\]"),
    ('S2-03', 'Takt speichern', r'S2-03 Takt: 12'),
    ('DM-07', 'Bilder optimieren: verkleinert, Original gemerkt', r'DM-07 Ergebnis: ✅ 1 Bild optimiert: .* Original gemerkt: /modules/display/assets/Bildschirm_1_Dienstag\.png'),
    ('S3-02', 'Ablauf Screen 3', r"DM-05 Ablauf S3: \['A:Frische', 'B:Grillsaison'\]"),
    ('DM', 'Handy ohne seitliches Scrollen', r'Handy scrollWidth: 390'),
    ('DM', 'keine JS-Fehler', r'errors \[\]'),
  ]),
  'generator': (['python3', 'tests/regeln/generator_test.py'], [
    ('GE-01', 'Woche beim gewählten Kunden', r"nach Speichern 1 \[\['6544d8e6'"),
    ('GE-02', 'gleiche Woche aktualisiert (1 Eintrag)', r"nach Speichern 2 \[\['6544d8e6', '2026-02-18', '[^']*', 'Cordon"),
  ]),
}
CWD = {'screen3': os.path.join(REPO, 'tests', 'angebote'), 'angebote_render': os.path.join(REPO, 'tests', 'angebote'),
       'angebote_ui': os.path.join(REPO, 'tests', 'angebote')}

nur = sys.argv[1:]
gesamt_ok = gesamt_fehler = 0
for name, (cmd, checks) in PRUEFUNGEN.items():
    if nur and name not in nur: continue
    out, dauer = lauf(cmd, cwd=CWD.get(name, REPO))
    print(f'\n── {name} ({dauer:.0f} s)')
    for regel, text, muster in checks:
        if re.search(muster, out):
            gesamt_ok += 1; print(f'  OK    {regel:10} {text}')
        else:
            gesamt_fehler += 1; print(f'  FEHLT {regel:10} {text}')
    if name == 'regeln':
        for z in out.splitlines():
            if z.startswith('FAIL') or z.startswith('       '): print('        ' + z)
    if any(not re.search(m, out) for _, _, m in checks) and name != 'regeln':
        print('  ── Ausgabe (Ende):'); print('\n'.join('     ' + z for z in out.strip().splitlines()[-12:]))
print(f'\nERGEBNIS: {gesamt_ok} OK, {gesamt_fehler} FEHLT')
sys.exit(1 if gesamt_fehler else 0)
