"""Vorlagen-Seite (eigene Hintergründe für Instagram/Druck) + Generator nutzt sie (VL-01 … VL-09). Mock-Datenbank."""
import os, json
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
from PIL import Image
OUT = os.path.join(HIER, 'out'); os.makedirs(OUT, exist_ok=True)
TMP = os.path.join(OUT, 'vorlagen_dateien'); os.makedirs(TMP, exist_ok=True)
T = os.path.join(REPO, 'modules', 'mittagstisch', 'templates')
erg = []
def pruefe(i, ok, t): erg.append(ok); print(('OK     ' if ok else 'FEHLER ') + i + ' ' + t)

# Testbilder: rot eingefärbte Originale (gut erkennbar), halbe Größe, falsches Format
def rot(src, ziel, groesse=None, fmt='JPEG'):
    im = Image.open(src).convert('RGB')
    if groesse: im = im.resize(groesse)
    r, g, b = im.split(); im = Image.merge('RGB', (r, g.point(lambda v: v * 0.3), b.point(lambda v: v * 0.3)))
    im.save(ziel, fmt, quality=92) if fmt == 'JPEG' else im.save(ziel, fmt)
FRONT = os.path.join(TMP, 'front_rot.jpg'); rot(os.path.join(T, 'mittagstisch-print-front.jpg'), FRONT)
FRONT2 = os.path.join(TMP, 'front_halb.jpg'); rot(os.path.join(T, 'mittagstisch-print-front.jpg'), FRONT2, (1754, 1240))
STORY = os.path.join(TMP, 'story_rot.png'); rot(os.path.join(T, 'klassisch-story.jpg'), STORY, fmt='PNG')
QUADRAT = os.path.join(TMP, 'quadrat.jpg'); Image.new('RGB', (1080, 1080), (200, 30, 30)).save(QUADRAT)

def route2(r):
    u = r.request.url
    if u.startswith('https://mock.supabase.co/storage/'):
        datei = FRONT2 if 'zweite' in u else (FRONT if '-front-' in u else STORY)
        return r.fulfill(path=datei, content_type='image/jpeg', headers={'Access-Control-Allow-Origin': '*'})
    return route(r)

def db(pg): return pg.evaluate("()=>JSON.parse(localStorage.getItem('__mockdb'))")
ROT = "id=>{const c=document.getElementById(id);const d=c.getContext('2d').getImageData(Math.floor(c.width*0.05),Math.floor(c.height*0.5),1,1).data;return [d[0],d[1],d[2]]}"
B = 'http://t.local/modules/mittagstisch/'

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True); ctx.route('**/*', route2)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://t.local/shared/style.css')
    pg.evaluate("()=>{localStorage.clear();localStorage.setItem('__mockdb',JSON.stringify({wochen:[],mittag_gerichte:[],mittag_vorlagen:[]}));localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')}")
    pg.goto(B + 'vorlagen.html?kunde=sorgundseitz'); pg.wait_for_timeout(2500)
    tabs = pg.evaluate("()=>[...document.querySelectorAll('#format-tabs .ag-tab')].map(t=>t.textContent)")
    vor = pg.evaluate("()=>{const c=document.getElementById('cv-vorher');return c.width+'x'+c.height}")
    pruefe('VL-01', sorted(tabs) == sorted(['Instagram Story', 'Instagram Beitrag', 'Druck vorne', 'Druck hinten']) and vor in ('1080x1350', '1080x1920'),
           f'4 Formate {tabs}, Vorschau der aktuellen Vorlage {vor}')

    pg.click('#format-tabs >> text=Druck vorne'); pg.wait_for_timeout(1500)
    pg.set_input_files('#datei', QUADRAT); pg.wait_for_timeout(800)
    t = pg.inner_text('#pruefung')
    pruefe('VL-02', 'Falsches Format' in t and '3508 × 2480' in t and pg.is_hidden('#aktionen'), 'falsches Seitenverhältnis wird abgelehnt (mit Sollgröße)')

    pg.set_input_files('#datei', FRONT); pg.wait_for_timeout(3000)
    t = pg.inner_text('#pruefung'); n = pg.evaluate("()=>{const c=document.getElementById('cv-nachher');return c.width+'x'+c.height}")
    rv, rn = pg.evaluate(ROT, 'cv-vorher'), pg.evaluate(ROT, 'cv-nachher')
    pruefe('VL-03', 'passt' in t and n == '3508x2480' and pg.is_visible('#aktionen') and rn[0] > rn[1] + 60 and abs(rv[0] - rv[1]) < 40,
           f'passendes Bild → Vorschau vorher/nachher ({n}), neue Vorlage sichtbar (Pixel vorher {rv}, nachher {rn})')
    pg.screenshot(path=OUT + '/vorlagen_01.png', full_page=True)

    pg.fill('#notiz', 'Test rot'); pg.click('#btn-uebernehmen'); pg.wait_for_timeout(1500)
    d = db(pg); v = [x for x in d['mittag_vorlagen'] if x['kunde_id'] == '6544d8e6']
    up = [k for k in d['uploads'] if k.startswith('6544d8e6/vorlagen/mittagstisch_druck-front-')]
    pruefe('VL-04', len(v) == 1 and v[0]['aktiv'] and v[0]['format'] == 'front' and v[0]['breite'] == 3508 and len(up) == 1 and 'übernommen' in pg.inner_text('#status')
           and '● aktiv' in pg.inner_text('#verlauf'), f'Übernehmen → gespeichert ({up}), im Verlauf aktiv')

    # Generator nutzt die neue Vorlage – inkl. Download (Bild von anderer Adresse darf das Canvas nicht sperren)
    g = ctx.new_page(); g.on('pageerror', lambda e: errs.append('gen: ' + str(e)))
    g.goto(B + 'generator.html?kunde=sorgundseitz'); g.wait_for_timeout(1500)
    g.click('#format-seg >> text=Druck'); g.wait_for_timeout(3500)
    gp = g.evaluate(ROT, 'vorschau')
    with g.expect_download() as dl: g.click('[data-download="front"]')
    p = dl.value.path(); ok_dl = open(p, 'rb').read(4) == b'\x89PNG' and os.path.getsize(p) > 200000
    pruefe('VL-05', gp[0] > gp[1] + 60 and ok_dl, f'Generator zeigt neue Vorlage (Pixel {gp}), Download klappt ({os.path.getsize(p)//1024} KB)')
    g.click('#vorschau-tabs >> text=Rückseite'); g.wait_for_timeout(3000)
    gb = g.evaluate(ROT, 'vorschau')
    pruefe('VL-06', abs(gb[0] - gb[1]) < 40, f'Rückseite unverändert Standard (Pixel {gb})')

    # zweite (kleinere) Version → Warnung, dann Verlauf: Standard wieder verwenden, dann erste Version
    pg.set_input_files('#datei', FRONT2); pg.wait_for_timeout(3000)
    t = pg.inner_text('#pruefung')
    pg.fill('#notiz', 'zweite'); pg.click('#btn-uebernehmen'); pg.wait_for_timeout(1500)
    v = sorted([x for x in db(pg)['mittag_vorlagen'] if x['kunde_id'] == '6544d8e6'], key=lambda x: x['created_at'])
    pruefe('VL-07', 'recht klein' in t and len(v) == 2 and [x['aktiv'] for x in v] == [False, True], 'kleines Bild → Hinweis, neue Version aktiv, alte bleibt im Verlauf')
    pg.click('#verlauf [data-id="standard"]'); pg.wait_for_timeout(1200)
    keine = not any(x['aktiv'] for x in db(pg)['mittag_vorlagen'])
    pg.click(f'#verlauf [data-id="{v[0]["id"]}"]'); pg.wait_for_timeout(1500)
    v2 = {x['id']: x['aktiv'] for x in db(pg)['mittag_vorlagen']}
    pruefe('VL-08', keine and v2[v[0]['id']] and not v2[v[1]['id']] and 'Aktuell: eigene Vorlage' in pg.inner_text('#lbl-vorher'),
           'zurück zur Standard-Vorlage und wieder zu einer älteren Version')
    pg.screenshot(path=OUT + '/vorlagen_02_verlauf.png', full_page=True)

    # alte Admin-Seite nur für Admins
    pg.evaluate("()=>localStorage.setItem('__mockuser',JSON.stringify({id:'77777777-0000-0000-0000-000000000000',email:'k@test.de',user_metadata:{}}))")
    pg.goto(B + 'admin.html'); pg.wait_for_timeout(1500)
    pruefe('VL-09', pg.url.endswith('/dashboard.html'), 'alte Admin-Seite (Positionen) leitet Nicht-Admins zur Übersicht um → ' + pg.url)
    b.close()
pruefe('VL-00', not errs, 'keine Skriptfehler ' + str(errs[:3]))
print('ERGEBNIS', sum(erg), '/', len(erg))
