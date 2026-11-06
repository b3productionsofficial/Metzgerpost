"""Bildschirm 1: lange Gerichtnamen bleiben über dem Preis (S1-12), kurze behalten ihre Schriftgröße (S1-13).
Echte Positionen von Sorg & Seitz (display_config_sorgundseitz.json), alle vier Tages-Layouts."""
import os, json
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
OUT = os.path.join(HIER, 'out'); os.makedirs(OUT, exist_ok=True)
CFG = json.load(open(os.path.join(HIER, 'display_config_sorgundseitz.json')))
DAT = {'dienstag': '2026-11-03', 'mittwoch': '2026-11-04', 'donnerstag': '2026-11-05', 'freitag': '2026-11-06'}
erg = []
def pruefe(i, ok, t): erg.append(ok); print(('OK     ' if ok else 'FEHLER ') + i + ' ' + t)

def db(name, preis):
    g = {t: [{'name': name, 'preis': preis, 'bild': '/modules/mittagstisch/Gerichte/fleischteller.jpg'}] for t in DAT}
    return {'display_configs': [{'kunde_id': '6544d8e6', 'screen_id': 'screen1', 'config': CFG}],
            'displays': [{'kunde_id': '6544d8e6', 'screen_id': 'mt_settings', 'content': {'tage': [0, 1, 2, 3, 4, 5, 6]}}],
            'wochen': [{'id': 'w', 'kunde_id': '6544d8e6', 'woche_label': '03.11.2026 - 06.11.2026', 'gueltig_ab': '2026-11-03', 'gerichte': g}], 'angebote': []}

MESS = """()=>{const H=document.getElementById('screen').offsetHeight;return [...document.querySelectorAll('.day-text')].map(t=>{
  const r=t.getBoundingClientRect();return {unten:r.bottom/H*100, groesse:parseFloat(t.style.fontSize)}})}"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1920, 'height': 1080}); ctx.route('**/*', route)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    for name, preis, art in [('Schnitzel, Bratwürste, Frikadelle und Fleischkäse mit Kartoffelsalat', '€ pro 100g', 'lang'), ('Lasagne', '6,80 €', 'kurz')]:
        for tag, dat in DAT.items():
            pg.goto('http://t.local/shared/style.css'); pg.evaluate("s=>{localStorage.clear();localStorage.setItem('__mockdb',s)}", json.dumps(db(name, preis)))
            pg.goto('http://t.local/modules/display/screen-v2.html?kunde=6544d8e6&screen=screen1&datum=' + dat); pg.wait_for_timeout(2000)
            m = pg.evaluate(MESS); lay = CFG[tag]
            tage = ['dienstag', 'mittwoch', 'donnerstag', 'freitag']
            if art == 'lang':
                ok = all(x['unten'] <= lay[t]['preis']['y'] - 4.5 + 0.3 for x, t in zip(m, tage))
                pruefe('S1-12', ok and len(m) == 4, f'Layout {tag}: langer Name endet über dem Preis ' + str([round(lay[t]['preis']['y'] - x['unten'], 1) for x, t in zip(m, tage)]))
                if tag == 'freitag': pg.screenshot(path=OUT + '/textpassung_freitag.png')
            else:
                ok = all(abs(x['groesse'] - lay[t]['text']['size']) < 0.001 for x, t in zip(m, tage))
                pruefe('S1-13', ok, f'Layout {tag}: kurzer Name behält Schriftgröße')
    b.close()
pruefe('S1-00', not errs, 'keine Skriptfehler ' + str(errs[:3]))
print('ERGEBNIS', sum(erg), '/', len(erg))
