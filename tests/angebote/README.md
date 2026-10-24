# Tests Modul Angebote

Laufen lokal mit Playwright (Chromium), **ohne** echte Datenbank: Supabase wird durch `mock-supabase.js` ersetzt,
Google Fonts durch lokale Kopien.

```bash
cd tests/angebote
npm i @fontsource/montserrat @fontsource/ibm-plex-serif   # einmalig, Schriften für die Renderings
pip install playwright && playwright install chromium       # einmalig
mkdir -p out
python3 render_tests.py   # rendert alle Fälle aus cases.json nach out/ (TV, Feed, Story)
python3 ui_test.py        # klickt Übersicht, Editor, Produktbibliothek durch, prüft Speichern/Validierung/Handy-Breite
python3 screen_test.py    # prüft screen3-v2: richtige Angebote an richtigen Tagen, Rotation, Live-Änderung
```

`node_modules/` und `out/` werden nicht eingecheckt.
