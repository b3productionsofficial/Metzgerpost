"""Mandanten Stufe 2 im Browser (Mock-DB): ausgeschaltet = alles wie bisher; eingeschaltet (nur Test) = neue Metzgerei per Code (MA-01 … MA-05)."""
import os, json
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
OUT = os.path.join(HIER, 'out'); os.makedirs(OUT, exist_ok=True)
erg = []
def pruefe(i, ok, t): erg.append(ok); print(('OK     ' if ok else 'FEHLER ') + i + ' ' + t)
DB = {'wochen': [], 'angebote': [], 'kunden': [
    {'kunde_id': '6544d8e6', 'name': 'Metzgerei Sorg & Seitz', 'config_key': 'sorgundseitz', 'plan': 'gruender', 'aktiv': True},
    {'kunde_id': 'test0001', 'name': 'Testkunde', 'config_key': None, 'plan': 'test', 'aktiv': True}], 'kunden_mitglieder': []}
NEU = {'id': '77777777-0000-0000-0000-000000000000', 'email': 'neu@test.de', 'user_metadata': {'betrieb_name': 'Metzgerei Neu'}}
B = 'http://t.local/'
def db(pg): return pg.evaluate("()=>JSON.parse(localStorage.getItem('__mockdb'))")
def log(pg): return pg.evaluate("()=>window.__mock.log.join('|')")

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('**/*', route)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + 'shared/style.css')
    pg.evaluate("s=>{localStorage.clear();localStorage.setItem('__mockdb',s);localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')}", json.dumps(DB))

    # ── ausgeschaltet (Standard)
    pg.goto(B + 'modules/admin/kunden.html'); pg.wait_for_timeout(900)
    pruefe('MA-01', pg.is_visible('#aus') and pg.is_disabled('#neu') and 'kunden' not in log(pg),
           'ausgeschaltet: Hinweis, „Neue Metzgerei“ gesperrt, keine Abfrage der neuen Tabellen')
    pg.goto(B + 'dashboard.html'); pg.wait_for_timeout(900)
    pruefe('MA-01', pg.evaluate("MP.getAktiveKundeId()") == '6544d8e6' and 'kunden_mitglieder' not in log(pg) and pg.is_hidden('#einladung'),
           'ausgeschaltet: Admin arbeitet wie bisher mit Sorg & Seitz')
    pg.evaluate("u=>localStorage.setItem('__mockuser',u)", json.dumps(NEU)); pg.reload(); pg.wait_for_timeout(900)
    pruefe('MA-01', pg.evaluate("MP.getAktiveKundeId()") == '77777777' and pg.is_hidden('#einladung'),
           'ausgeschaltet: normaler Login → Kunden-ID = Anfang der Login-ID (wie bisher)')
    pg.evaluate("localStorage.removeItem('__mockuser')")

    # ── eingeschaltet (nur Test-Schalter)
    pg.evaluate("localStorage.setItem('mp_mandanten_test','1')")
    pg.goto(B + 'modules/admin/kunden.html'); pg.wait_for_timeout(900)
    pg.click('#neu'); pg.fill('#n-name', 'Metzgerei Neu'); pg.click('#n-ok'); pg.wait_for_timeout(600)
    code = pg.inner_text('#n-code'); k = [x for x in db(pg)['kunden'] if x['name'] == 'Metzgerei Neu']
    pruefe('MA-02', len(k) == 1 and k[0]['einladungscode'] == code and len(code) == 9 and len(k[0]['kunde_id']) == 8,
           f'Admin legt Metzgerei an → ID {k[0]["kunde_id"] if k else "-"}, Code {code}')
    pg.click('#n-zu'); pg.screenshot(path=OUT + '/kunden_01.png', full_page=True)
    neu_id = k[0]['kunde_id']
    pg.locator(f'[data-id="{neu_id}"] [data-aktion="waehlen"]').click(); pg.wait_for_timeout(400)
    pg.goto(B + 'modules/mittagstisch/generator.html'); pg.wait_for_timeout(1200)
    pg.click('.mt-tag[data-liste="tage"][data-tag="dienstag"] .mt-wahl'); pg.click('#mg-liste .ag-produkt-btn >> nth=0'); pg.wait_for_timeout(200)
    pg.click('#btn-speichern'); pg.wait_for_timeout(600)
    w = db(pg)['wochen']
    pruefe('MA-03', len(w) == 1 and w[0]['kunde_id'] == neu_id, f'Admin „als dieser Kunde“ → Woche landet bei {w[0]["kunde_id"] if w else "-"}')

    pg.evaluate("u=>localStorage.setItem('__mockuser',u)", json.dumps(NEU))
    pg.goto(B + 'dashboard.html'); pg.wait_for_timeout(900)
    box = pg.is_visible('#einladung')
    pg.fill('#code', 'FALSCH-00'); pg.click('#code-ok'); pg.wait_for_timeout(300); fehler = pg.inner_text('#code-info')
    pg.fill('#code', code.lower()); pg.click('#code-ok'); pg.wait_for_timeout(1500)
    m = db(pg)['kunden_mitglieder']
    pruefe('MA-04', box and 'ungültig' in fehler and m == [{'user_id': NEU['id'], 'kunde_id': neu_id, 'rolle': 'inhaber'}],
           'neue Metzgerei: Code-Feld, falscher Code abgelehnt, richtiger verbindet')
    pruefe('MA-05', pg.evaluate("MP.getAktiveKundeId()") == neu_id and pg.is_hidden('#einladung'),
           'nach dem Einlösen arbeitet sie mit ihrer eigenen Kunden-ID, Code-Feld weg')
    b.close()
pruefe('MA-00', not errs, 'keine Skriptfehler ' + str(errs[:3]))
print('ERGEBNIS', sum(erg), '/', len(erg))
