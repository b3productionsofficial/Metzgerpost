"""Display Manager 2.0 – Oberflächentest mit Mock-Datenbank.
Aufruf: python3 tests/regeln/dm_test.py   (Screenshots: tests/bildschirme/out/dm_*.png)"""
import os, json, datetime
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
OUT = os.path.join(HIER, '..', 'bildschirme', 'out'); os.makedirs(OUT, exist_ok=True)
K = '6544d8e6'
G = '/modules/mittagstisch/Gerichte/'
def gericht(n, b): return [{"name": n, "bild": G + b, "preis": "6,80 €"}]
KW44 = {"dienstag": gericht("Schlachtschüssel", "schlachtschuessel.jpg"), "mittwoch": gericht("Schaschliktopf", "schaschliktopf.jpg"),
        "donnerstag": gericht("Lende mit Spätzle", "lende.jpg"), "freitag": gericht("Fleischteller", "fleischteller.jpg")}
def seed(wochen=True):
    return {"wochen": [{"id": "w44", "kunde_id": K, "gueltig_ab": "2026-10-27", "woche_label": "27.10.2026 - 30.10.2026", "kw": 44, "jahr": 2026, "gerichte": KW44}] if wochen else [],
      "displays": [{"kunde_id": K, "screen_id": "mt_settings", "content": {"tage": [0, 1, 2, 3, 4, 5, 6]}},
                   {"kunde_id": K, "screen_id": "screen1", "content": {"type": "mittagstisch", "woche": "", "gerichte": {}}},
                   {"kunde_id": K, "screen_id": "sonder_configs", "content": {"layouts": [
                      {"id": "wt", "label": "Warme Theke", "bild": G + "gyros.jpg", "type": "wochentage", "wochentage": [0, 1, 2, 3, 4, 5, 6]},
                      {"id": "20", "label": "20", "bild": G + "kotelett.jpg", "type": "wochentage", "wochentage": [1, 2, 3, 4, 5, 6]}]}}],
      "angebote": [{"id": "a1", "kunde_id": K, "titel": "Frische Rinderlende", "status": "aktiv", "gueltig_von": "2026-10-26", "gueltig_bis": "2026-10-31",
                    "screens": ["screen1", "screen3"], "render_tv_url": "/tests/angebote/out/01_rinderlende_tv.jpg", "updated_at": "t"}],
      "screen2_config": [{"kunde_id": K, "timer_sekunden": 8, "slides": [
          {"label": "Sortiment", "bild": "/modules/display/assets/Bildschirm_1_Dienstag.png", "sektionen": []},
          {"label": "Fertiggerichte", "bild": G + "lasagne.jpg", "sektionen": []}]}],
      "screen3_config": [{"kunde_id": K, "timer_sekunden": 12, "aktive_layouts": [{"id": "g", "label": "Grillsaison", "bild": G + "gulasch.jpg"}]}]}

def db(pg): return pg.evaluate("()=>JSON.parse(localStorage.getItem('__mockdb'))")
def ablauf(pg): return pg.eval_on_selector_all('#ablauf .dm-folie', 'els=>els.map(e=>e.querySelector(".dm-typ").textContent[0]+":"+e.querySelector(".dm-folie-titel").textContent.split(" ")[0])')

errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); ctx.route('**/*', route)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.set_fixed_time(datetime.datetime(2026, 10, 28, 10, 0))
    def oeffne(daten, extra=''):
        pg.goto('http://t.local/shared/style.css')
        pg.evaluate("s=>{localStorage.setItem('__mockdb',s);localStorage.setItem('mp_admin_selected_kunde','sorgundseitz');localStorage.removeItem('mp_dm_screen')}", json.dumps(daten))
        pg.goto('http://t.local/modules/display/index.html' + extra); pg.wait_for_timeout(1500)

    oeffne(seed(wochen=False))
    print('DM-01 ohne Woche, Karte:', 'kein Mittagstisch' in pg.inner_text('#screens'), '| Warnung im Ablauf:', pg.is_visible('.dm-warn'))
    oeffne(seed())
    print('DM-01 mit Woche, Warnung:', pg.query_selector('.dm-warn') is not None)
    print('Karten:', ' || '.join(pg.inner_text('#screens').split('\n')))
    print('DM-05 Ablauf S1 Mi:', ablauf(pg))
    print('DM-04 Live-Vorschau:', pg.get_attribute('a[href*="screen-v2.html"]', 'href'))
    pg.screenshot(path=OUT + '/dm_s1.png', full_page=True)

    # Vorschau für anderes Datum (Sonntag)
    pg.fill('#ablauf-datum', '2026-11-01'); pg.dispatch_event('#ablauf-datum', 'change'); pg.wait_for_timeout(300)
    print('DM-05 Ablauf S1 So 01.11.:', ablauf(pg))
    pg.click('.ag-chips [data-tag="2026-10-28"]'); pg.wait_for_timeout(200)

    # Sonderlayout „20“ pausieren
    pg.click('#sonder-liste .dm-row[data-i="1"] .dm-switch'); pg.wait_for_timeout(400)
    l = db(pg)['displays'][2]['content']['layouts']
    print('DM-06 pausiert gespeichert:', l[1].get('aktiv'), '| Ablauf:', ablauf(pg))
    # wieder aktivieren, Sonntag dazu, nach vorne
    pg.click('#sonder-liste .dm-row[data-i="1"] .dm-switch'); pg.wait_for_timeout(400)
    pg.click('#sonder-liste .dm-row[data-i="1"] [data-sonder-tag="0"]'); pg.wait_for_timeout(400)
    pg.click('#sonder-liste .dm-row[data-i="1"] [data-aktion="hoch"]'); pg.wait_for_timeout(400)
    l = db(pg)['displays'][2]['content']['layouts']
    print('DM-06 Reihenfolge/Tage:', [x['label'] for x in l], l[0]['wochentage'], 'aktiv' in l[0])
    # umbenennen
    pg.fill('#sonder-liste .dm-row[data-i="0"] .dm-name', 'Gruppenbild'); pg.dispatch_event('#sonder-liste .dm-row[data-i="0"] .dm-name', 'change'); pg.wait_for_timeout(400)
    print('DM-06 Name:', db(pg)['displays'][2]['content']['layouts'][0]['label'])
    # Datum statt Wochentage
    pg.click('#sonder-liste .dm-row[data-i="0"] [data-wann="datum"]'); pg.wait_for_timeout(400)
    l0 = db(pg)['displays'][2]['content']['layouts'][0]
    print('DM-06 Datum:', l0['type'], l0.get('datum'), '| Ablauf:', ablauf(pg))
    pg.click('#sonder-liste .dm-row[data-i="0"] [data-wann="wochentage"]'); pg.wait_for_timeout(400)

    # Mittagstisch-Tage: Mittwoch abwählen
    pg.click('[data-mt-tag="3"]'); pg.wait_for_timeout(400)
    print('S1-01 MT-Tage ohne Mi:', db(pg)['displays'][0]['content']['tage'], '| Ablauf:', ablauf(pg))
    pg.click('[data-mt-tag="3"]'); pg.wait_for_timeout(400)

    # Manueller Modus: Donnerstag nur heute
    pg.click('#manuell-tag [data-tag="4"]'); pg.wait_for_timeout(200)
    pg.click('[data-aktion="manuell-an"]'); pg.wait_for_timeout(400)
    s1 = db(pg)['displays'][1]['content']
    print('S1-07 manuell:', s1.get('manualDay'), '| Ablauf:', ablauf(pg), '| Karte manuell:', 'manuell' in pg.inner_text('#screens'))
    pg.click('[data-aktion="manuell-aus"]'); pg.wait_for_timeout(400)
    print('S1-07 zurück:', 'manualDay' in db(pg)['displays'][1]['content'])

    # Bildschirm 2
    pg.click('[data-screen="s2"]'); pg.wait_for_timeout(400)
    print('DM-05 Ablauf S2:', ablauf(pg))
    pg.click('#bild-liste .dm-row[data-i="1"] .dm-switch'); pg.wait_for_timeout(400)
    print('S2-01 pausiert:', [s.get('aktiv') for s in db(pg)['screen2_config'][0]['slides']], '| Ablauf:', ablauf(pg))
    pg.eval_on_selector('[data-takt="s2"]', 'e=>{e.value=12;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}))}'); pg.wait_for_timeout(400)
    print('S2-03 Takt:', db(pg)['screen2_config'][0]['timer_sekunden'], '| Text:', pg.inner_text('.dm-ablauf-sum'))
    pg.screenshot(path=OUT + '/dm_s2.png', full_page=True)

    # Bilder optimieren (großes PNG im Screen 2)
    pg.click('[data-aktion="opt-pruefen"]'); pg.wait_for_timeout(2500)
    print('DM-07 prüfen:', pg.inner_text('#opt-box').split('\n')[0])
    pg.click('[data-aktion="opt-los"]'); pg.wait_for_timeout(6000)
    s2 = db(pg)['screen2_config'][0]['slides'][0]
    ups = {k: v for k, v in db(pg)['uploads'].items() if '/optimiert/' in k}
    print('DM-07 Ergebnis:', pg.inner_text('#opt-box').split('\n')[0], '| neu:', s2['bild'].split('/optimiert/')[-1][:30], '| Original gemerkt:', s2.get('original'), '| Upload KB:', [round(v / 1024) for v in ups.values()])

    # Bildschirm 3
    pg.click('[data-screen="s3"]'); pg.wait_for_timeout(400)
    print('DM-05 Ablauf S3:', ablauf(pg))
    pg.screenshot(path=OUT + '/dm_s3.png', full_page=True)

    # Handy
    m = b.new_context(viewport={'width': 390, 'height': 844}); m.route('**/*', route); mp = m.new_page(); mp.on('pageerror', lambda e: errs.append(str(e)))
    mp.clock.set_fixed_time(datetime.datetime(2026, 10, 28, 10, 0))
    mp.goto('http://t.local/shared/style.css'); mp.evaluate("s=>{localStorage.setItem('__mockdb',s);localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')}", json.dumps(seed()))
    mp.goto('http://t.local/modules/display/index.html'); mp.wait_for_timeout(1500)
    print('Handy scrollWidth:', mp.evaluate('document.documentElement.scrollWidth'))
    mp.screenshot(path=OUT + '/dm_handy.png', full_page=True)
    b.close()
print('errors', errs)
