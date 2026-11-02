"""Übersicht (dashboard.html): Status Mittagstisch diese/nächste Woche + Angebote, Links mit Kunde (DB-01 … DB-04)."""
import os, json, datetime
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
OUT = os.path.join(HIER, 'out'); os.makedirs(OUT, exist_ok=True)
erg = []
def pruefe(i, ok, t): erg.append(ok); print(('OK     ' if ok else 'FEHLER ') + i + ' ' + t)

h = datetime.date.today(); mo = h - datetime.timedelta(days=h.weekday())
f = lambda d: d.strftime('%d.%m.%Y')
def woche(m, gericht): return {'id': 'w' + m.isoformat(), 'kunde_id': '6544d8e6', 'woche_label': f(m + datetime.timedelta(1)) + ' - ' + f(m + datetime.timedelta(4)),
    'gueltig_ab': (m + datetime.timedelta(1)).isoformat(), 'created_at': '2026-10-30T10:00:00Z', 'gerichte': {'dienstag': [{'name': gericht, 'preis': '6,80 €', 'bild': None}]}}
SEED1 = {'wochen': [woche(mo, 'Gulasch mit Spätzle')], 'angebote': [
    {'id': 'a', 'kunde_id': '6544d8e6', 'titel': 'Rinderlende', 'status': 'aktiv', 'gueltig_von': (h - datetime.timedelta(1)).isoformat(), 'gueltig_bis': (h + datetime.timedelta(3)).isoformat(), 'screens': ['screen1']},
    {'id': 'b', 'kunde_id': 'test0001', 'titel': 'FREMD', 'status': 'aktiv', 'gueltig_von': '2026-01-01', 'gueltig_bis': '2027-01-01', 'screens': []}]}
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('**/*', route)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://t.local/shared/style.css')
    pg.evaluate("s=>{localStorage.clear();localStorage.setItem('__mockdb',s);localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')}", json.dumps(SEED1))
    pg.goto('http://t.local/dashboard.html'); pg.wait_for_timeout(1200)
    d = pg.inner_text('#k-diese'); n = pg.inner_text('#k-naechste'); a = pg.inner_text('#k-angebote')
    pruefe('DB-01', 'Gulasch' in d and 'db-ok' in pg.get_attribute('#k-diese', 'class'), 'diese Woche gespeichert → grün mit Gerichten')
    pruefe('DB-02', 'noch nicht gespeichert' in n, 'nächste Woche fehlt → Hinweis (' + n.splitlines()[-1] + ')')
    pruefe('DB-03', 'Rinderlende' in a and 'FREMD' not in a, 'Angebote: nur eigene, laufende gezählt')
    href = pg.get_attribute('.db-schnell a', 'href')
    pruefe('DB-04', href.endswith('generator.html?kunde=sorgundseitz') and pg.is_visible('#admin-modul'), 'Mittagstisch-Link mit Kunde → ' + href)
    pg.screenshot(path=OUT + '/dash_01.png', full_page=True)
    seed2 = dict(SEED1); seed2['wochen'] = [woche(mo + datetime.timedelta(7), 'Schäufele')]
    pg.evaluate("s=>localStorage.setItem('__mockdb',s)", json.dumps(seed2)); pg.reload(); pg.wait_for_timeout(1200)
    pruefe('DB-01', 'nicht gespeichert' in pg.inner_text('#k-diese') and 'db-warn' in pg.get_attribute('#k-diese', 'class') and 'Schäufele' in pg.inner_text('#k-naechste'),
           'nur nächste Woche gespeichert → diese Woche gelb, nächste grün')
    m = ctx.new_page(); m.set_viewport_size({'width': 390, 'height': 844}); m.goto('http://t.local/dashboard.html'); m.wait_for_timeout(1000)
    w = m.evaluate('document.documentElement.scrollWidth'); pruefe('DB-05', w <= 390, f'Handy ohne Querscrollen ({w})')
    m.screenshot(path=OUT + '/dash_02_handy.png', full_page=True)
    b.close()
pruefe('DB-00', not errs, 'keine Skriptfehler ' + str(errs[:3]))
print('ERGEBNIS', sum(erg), '/', len(erg))
