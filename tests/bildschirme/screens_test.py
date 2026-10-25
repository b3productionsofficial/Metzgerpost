"""Tests für Screen 1 v2 und Screen 2 v2 (lokal, Mock-Supabase, kein Internet nötig).
Aufruf: python3 tests/bildschirme/screens_test.py   → Screenshots in tests/bildschirme/out/"""
import os, json, datetime
from playwright.sync_api import sync_playwright
HIER = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HIER, '..', 'angebote', 'ui_test.py')).read().split('SEED=')[0])
U = os.path.join(HIER, '..', 'angebote'); F = os.path.join(U, 'node_modules', '@fontsource')
OUT = os.path.join(HIER, 'out'); os.makedirs(OUT, exist_ok=True)
G = '/modules/mittagstisch/Gerichte/'
A = '/tests/angebote/out/'
def gericht(name, bild, preis): return [{"name": name, "bild": G + bild, "preis": preis}]
KW44 = {"dienstag": gericht("Schlachtschüssel", "schlachtschuessel.jpg", "ab 5,00 €"),
        "mittwoch": gericht("Schaschliktopf mit Semmel", "schaschliktopf.jpg", "6,80 €"),
        "donnerstag": gericht("Lende mit Rahmsauce und Spätzle", "lende.jpg", "8,50 €"),
        "freitag": gericht("Schnitzel, Bratwürste, Frikadelle und Fleischkäse mit Kartoffelsalat", "fleischteller.jpg", "€ pro 100g")}
KW45 = {"dienstag": gericht("Schäufele mit Kloß", "schaeufele.jpg", "8,50 €"),
        "mittwoch": gericht("Gulasch mit Spätzle", "gulasch.jpg", "6,80 €")}
def ang(i, scr, url, von='2026-10-26', bis='2026-10-31'):
    return {"id": i, "kunde_id": "k1", "titel": i, "gueltig_von": von, "gueltig_bis": bis, "status": "aktiv",
            "screens": scr, "render_tv_url": A + url, "updated_at": "t"}
SEED = {"angebots_produkte": [], "uploads": {}, "screen3_config": [],
  "wochen": [{"id": "w44", "kunde_id": "k1", "kw": 44, "jahr": 2026, "gueltig_ab": "2026-10-27", "woche_label": "27.10.2026 - 30.10.2026", "gerichte": KW44},
             {"id": "w45", "kunde_id": "k1", "kw": 45, "jahr": 2026, "gueltig_ab": "2026-11-03", "woche_label": "03.11.2026 - 06.11.2026", "gerichte": KW45},
             {"id": "fremd", "kunde_id": "k2", "kw": 46, "jahr": 2026, "gueltig_ab": "2026-11-10", "woche_label": "fremd", "gerichte": KW44}],
  "displays": [{"kunde_id": "k1", "screen_id": "mt_settings", "content": {"tage": [0, 1, 2, 3, 4, 5, 6]}},
               {"kunde_id": "k1", "screen_id": "sonder_configs", "content": {"layouts": [
                  {"id": "wt", "bild": G + "gyros.jpg", "type": "wochentage", "label": "Warme Theke", "wochentage": [0, 1, 2, 3, 4, 5, 6]},
                  {"id": "20", "bild": G + "kotelett.jpg", "type": "wochentage", "label": "20", "wochentage": [1, 2, 3, 4, 5, 6]},
                  {"id": "eroeffnung", "bild": G + "backschinken.jpg", "type": "datum", "label": "Eröffnung", "datum": "2026-10-30"}]}},
               {"kunde_id": "k1", "screen_id": "screen1", "content": {"type": "mittagstisch", "woche": "", "gerichte": {}}}],
  "display_configs": [{"kunde_id": "k1", "screen_id": "screen1", "config": json.load(open(os.path.join(HIER, 'display_config_sorgundseitz.json')))}],
  "screen2_config": [{"kunde_id": "k1", "timer_sekunden": 3, "slides": [{"label": "Sortiment", "bild": G + "kotelett.jpg", "sektionen": []},
                                                                         {"label": "Grill", "bild": G + "gyros.jpg", "sektionen": []}]}],
  "angebote": [ang("lende", ["screen1", "screen2", "screen3"], "01_rinderlende_tv.jpg"),
               ang("leber", ["screen3"], "01b_rinderleber_tv.jpg"),
               ang("nur2", ["screen2"], "02_ohne_streichpreis_tv.jpg", '2026-10-20', '2026-11-05')]}

def kurz(pg):
    return pg.evaluate("""()=>playlist.map(x=>x.art==='mt'?'MT['+x.mt.layout.slice(0,2)+(x.mt.label?' '+x.mt.label.slice(0,5):'')+']':
        x.key.startsWith('a:')?'A:'+x.key.split(':')[1]:'S:'+x.src.split('/').pop().split('.')[0])""")

fehler = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 720}); ctx.route('**/*', route)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: fehler.append(str(e))); pg.on('response', lambda r: r.status >= 400 and fehler.append('HTTP %d %s' % (r.status, r.url)))
    def seed(db):
        pg.goto('http://t.local/shared/style.css'); pg.evaluate("s=>localStorage.setItem('__mockdb',s)", json.dumps(db))
    seed(SEED)
    print('── Screen 1 v2 ──')
    erwartet = {
      '2026-10-25': "So: nächste Woche (KW44) im Dienstag-Layout",
      '2026-10-26': "Mo: diese Woche, Dienstag-Layout",
      '2026-10-28': "Mi: Mittwoch groß",
      '2026-10-30': "Fr: Freitag + Datum-Sonderlayout zuerst",
      '2026-10-31': "Sa: schon KW45",
      '2026-11-10': "Di KW46: keine Woche → kein Mittagstisch"}
    for d, txt in erwartet.items():
        pg.goto(f'http://t.local/modules/display/screen-v2.html?kunde=k1&datum={d}&debug=1'); pg.wait_for_timeout(1500)
        dbg = pg.inner_text('#mp-debug').split('\n') if pg.query_selector('#mp-debug') else ['kein debug']
        print(d, txt.ljust(44), kurz(pg), '|', ' / '.join(dbg[1:]))
    # Screenshot Mittagstisch (Mittwoch) – erste Folie ist der Mittagstisch
    pg.goto('http://t.local/modules/display/screen-v2.html?kunde=k1&datum=2026-10-28'); pg.wait_for_timeout(2000)
    pg.screenshot(path=OUT + '/s1_mittwoch_mt.png')
    pg.wait_for_timeout(10500); pg.screenshot(path=OUT + '/s1_mittwoch_folie2.png')
    print('Folie 2 aktiv:', pg.evaluate("()=>{var a=document.querySelector('#bilder .bild.active');return a?a.getAttribute('data-key'):'MT'}"))

    # Manueller Modus: gilt nur am Sendetag
    db = json.loads(json.dumps(SEED))
    db['displays'][2]['content'] = {"type": "mittagstisch", "woche": "27.10.2026 - 30.10.2026", "gerichte": KW44, "manualDay": 4, "updatedAt": "2026-10-28T09:00:00Z"}
    seed(db)
    for d in ['2026-10-28', '2026-10-29']:
        pg.goto(f'http://t.local/modules/display/screen-v2.html?kunde=k1&datum={d}&debug=1'); pg.wait_for_timeout(1500)
        print('manuell', d, kurz(pg), '|', pg.inner_text('#mp-debug').split('\n')[1])

    # Live-Änderung: neue Woche gespeichert → nach Abgleich sichtbar
    seed(SEED)
    pg.goto('http://t.local/modules/display/screen-v2.html?kunde=k1&datum=2026-11-10&debug=1'); pg.wait_for_timeout(1500)
    vor = kurz(pg)
    pg.evaluate("""()=>{const db=__mock.load();db.wochen.push({id:'w46',kunde_id:'k1',kw:46,jahr:2026,gueltig_ab:'2026-11-10',woche_label:'10.11.2026 - 13.11.2026',gerichte:db.wochen[0].gerichte});__mock.save(db);document.dispatchEvent(new Event('visibilitychange'))}""")
    pg.wait_for_timeout(1500)
    print('neue Woche:', vor, '->', kurz(pg))

    # ohne Daten
    pg.goto('http://t.local/modules/display/screen-v2.html?kunde=leer&debug=1'); pg.wait_for_timeout(1200)
    print('leerer Kunde:', pg.get_attribute('#no-content', 'class'))

    print('── Screen 2 v2 ──')
    for d in ['2026-10-25', '2026-10-28', '2026-11-04', '2026-11-10']:
        pg.goto(f'http://t.local/modules/display/screen2-v2.html?kunde=k1&datum={d}&debug=1'); pg.wait_for_timeout(1300)
        print(d, kurz(pg))
    a1 = pg.eval_on_selector('.slide.active img', 'e=>e.src.split("/").pop()'); pg.wait_for_timeout(3300)
    print('rotation:', a1, '->', pg.eval_on_selector('.slide.active img', 'e=>e.src.split("/").pop()'))

    # Vergleich alt/neu: gleiche Darstellung des Mittagstischs (Mittwoch, ohne Sonderlayouts)
    db = json.loads(json.dumps(SEED)); db['displays'][1]['content'] = {"layouts": []}; db['angebote'] = []
    seed(db)
    pg.clock.set_fixed_time(datetime.datetime(2026, 10, 28, 11, 0))
    pg.goto('http://t.local/modules/display/screen.html?kunde=k1&screen=screen1'); pg.wait_for_timeout(2500)
    pg.screenshot(path=OUT + '/vergleich_alt.png')
    pg.goto('http://t.local/modules/display/screen-v2.html?kunde=k1&screen=screen1'); pg.wait_for_timeout(2500)
    pg.screenshot(path=OUT + '/vergleich_neu.png')
    b.close()
print('FEHLER:', fehler)
