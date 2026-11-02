"""Online-Status der Fernseher im Display Manager (TV-01 … TV-03) – Mock mit Presence-Nachbau."""
import os, json
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
OUT = os.path.join(HIER, 'out'); os.makedirs(OUT, exist_ok=True)
erg = []
def pruefe(i, ok, t): erg.append(ok); print(('OK     ' if ok else 'FEHLER ') + i + ' ' + t)
B = 'http://t.local/modules/display/'
DB = {'screen2_config': [{'kunde_id': 'test0001', 'slides': [{'bild': '/modules/mittagstisch/Gerichte/lende.jpg', 'label': 'Lende'}], 'timer_sekunden': 8}],
      'screen3_config': [], 'displays': [], 'wochen': [], 'angebote': [], 'display_configs': []}
def karte(pg, s): return pg.inner_text(f'[data-screen="{s}"] .dm-tv')

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('**/*', route)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://t.local/shared/style.css')
    pg.evaluate("s=>{localStorage.clear();localStorage.setItem('__mockdb',s)}", json.dumps(DB))
    pg.goto(B + 'index.html?kunde=test0001'); pg.wait_for_timeout(5000)
    pruefe('TV-01', all('keine Meldung' in karte(pg, s) for s in ['s1', 's2', 's3']), 'kein Fernseher an → „keine Meldung“ bei allen drei')

    tv = ctx.new_page(); tv.on('pageerror', lambda e: errs.append('tv: ' + str(e)))
    tv.goto(B + 'screen2-v2.html?kunde=test0001'); tv.wait_for_timeout(1500)
    test = ctx.new_page(); test.goto(B + 'screen3-v2.html?kunde=test0001&datum=2026-11-03&debug=1'); test.wait_for_timeout(1500)
    pg.wait_for_timeout(500)
    s2, s3 = karte(pg, 's2'), karte(pg, 's3')
    pruefe('TV-02', 'online' in s2 and 'abgeglichen' in s2 and 'fehlen' not in s2, 'Bildschirm 2 läuft → ' + s2)
    pruefe('TV-03', 'keine Meldung' in s3, 'Test-Vorschau (?datum=/debug) zählt nicht als Fernseher → ' + s3)
    pg.screenshot(path=OUT + '/tv_status.png')
    zeigt = tv.evaluate("()=>!!document.querySelector('.slide.active')")
    pruefe('TV-04', zeigt, 'Bildschirm zeigt weiter seine Folie (Meldung stört die Anzeige nicht)')
    b.close()
pruefe('TV-00', not errs, 'keine Skriptfehler ' + str(errs[:3]))
print('ERGEBNIS', sum(erg), '/', len(erg))
