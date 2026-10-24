import os, json, sys
from playwright.sync_api import sync_playwright
REPO=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')); U=os.path.dirname(os.path.abspath(__file__))
F=os.path.join(os.path.dirname(os.path.abspath(__file__)),'node_modules','@fontsource')
FONTCSS='''@font-face{font-family:"Montserrat";font-weight:700;src:url(http://t.local/__f/montserrat/montserrat-latin-700-normal.woff2)}
@font-face{font-family:"Montserrat";font-weight:800;src:url(http://t.local/__f/montserrat/montserrat-latin-800-normal.woff2)}
@font-face{font-family:"IBM Plex Serif";font-weight:700;src:url(http://t.local/__f/ibm-plex-serif/ibm-plex-serif-latin-700-normal.woff2)}'''
errors=[]
def route(r):
    u=r.request.url
    if 'cdn.jsdelivr.net/npm/@supabase' in u: return r.fulfill(path=U+'/mock-supabase.js', content_type='application/javascript')
    if 'fonts.googleapis.com' in u: return r.fulfill(body=FONTCSS, content_type='text/css')
    if u.startswith('http://t.local/__f/'):
        d,f=u.split('/__f/')[1].split('/'); return r.fulfill(path=f'{F}/{d}/files/{f}', content_type='font/woff2')
    if u.startswith('http://t.local/'):
        p=REPO+'/'+u.split('http://t.local/')[1].split('?')[0].split('#')[0]
        if p.endswith('/'): p+='index.html'
        return r.fulfill(path=p) if os.path.isfile(p) else r.fulfill(status=404, body='nf')
    return r.fulfill(status=404, body='')
SEED={"angebots_produkte":[
 {"id":"p1","kunde_id":"test0001","name":"Frische Rinderlende","einheit":"kg","bild_url":"/modules/mittagstisch/Gerichte/lende.jpg","sortierung":1,"aktiv":True},
 {"id":"p2","kunde_id":"test0001","name":"Schweinekotelett","einheit":"100g","bild_url":"/modules/mittagstisch/Gerichte/kotelett.jpg","sortierung":2,"aktiv":True},
 {"id":"p3","kunde_id":"test0001","name":"Hausmacher Leberwurst","einheit":"100g","bild_url":None,"sortierung":3,"aktiv":True}],
 "angebote":[
 {"id":"a1","kunde_id":"test0001","titel":"Fränkisches Schäufele","preis":12.9,"einheit":"stueck","streichpreis":None,"streichpreis_bestaetigt":False,"gueltig_von":"2026-10-20","gueltig_bis":"2026-10-31","screens":["screen3"],"status":"aktiv","bild_url":"/modules/mittagstisch/Gerichte/schaeufele.jpg","render_tv_url":None},
 {"id":"a2","kunde_id":"test0001","titel":"Schweinekotelett","preis":2.49,"einheit":"100g","streichpreis":None,"streichpreis_bestaetigt":False,"gueltig_von":"2026-11-02","gueltig_bis":"2026-11-07","screens":["screen3"],"status":"aktiv","bild_url":"/modules/mittagstisch/Gerichte/kotelett.jpg"},
 {"id":"a3","kunde_id":"6544d8e6","titel":"ECHTER KUNDE – darf nicht erscheinen","preis":1,"einheit":"kg","gueltig_von":"2026-10-20","gueltig_bis":"2026-10-31","screens":["screen3"],"status":"aktiv"}],
 "screen3_config":[],"uploads":{}}
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':1000})
    ctx.route('**/*', route)
    pg=ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('pageerror: '+str(e)))
    pg.on('console', lambda m: errors.append('console.'+m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.goto('http://t.local/shared/style.css')
    pg.evaluate("s=>localStorage.setItem('__mockdb',s)", json.dumps(SEED))
    pg.evaluate("localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')")
    # 1 Übersicht
    pg.goto('http://t.local/modules/angebote/index.html?kunde=test0001'); pg.wait_for_selector('.ag-item'); pg.wait_for_timeout(400)
    titles=pg.eval_on_selector_all('.ag-item-title','els=>els.map(e=>e.textContent)')
    print('index laeuft:',titles)
    pg.screenshot(path=U+'/out/01_index.png', full_page=True)
    # 2 Neues Angebot
    pg.click('text=+ Neues Angebot'); pg.wait_for_selector('.ag-produkt-btn'); pg.wait_for_timeout(300)
    pg.click('#btn-speichern'); pg.wait_for_timeout(200)
    print('validierung leer:', pg.inner_text('#fehler').replace('\n',' | '))
    pg.click('.ag-produkt-btn >> text=Frische Rinderlende')
    pg.fill('#preis','39,90'); pg.fill('#streichpreis','46,20')
    pg.click('#btn-speichern'); pg.wait_for_timeout(200)
    print('validierung ohne haken:', pg.inner_text('#fehler'))
    pg.check('#bestaetigt')
    pg.wait_for_timeout(900)
    print('zeit-info:', pg.inner_text('#zeit-info'), '| von/bis', pg.input_value('#von'), pg.input_value('#bis'))
    pg.screenshot(path=U+'/out/02_bearbeiten.png', full_page=True)
    pg.locator('#vorschau').screenshot(path=U+'/out/03_vorschau_tv.png')
    pg.click('#format-tabs >> text=Story'); pg.wait_for_timeout(800)
    pg.locator('#canvas-wrap').screenshot(path=U+'/out/04_vorschau_story.png')
    pg.click('#zeit-chips >> text=Diese Woche'); pg.wait_for_timeout(200)
    print('diese woche:', pg.input_value('#von'), pg.input_value('#bis'))
    pg.click('#zeit-chips >> text=Nächste Woche')
    with pg.expect_navigation(timeout=20000): pg.click('#btn-speichern')
    pg.wait_for_selector('.ag-item'); pg.wait_for_timeout(400)
    db=pg.evaluate("JSON.parse(localStorage.getItem('__mockdb'))")
    neu=[a for a in db['angebote'] if a['titel']=='Frische Rinderlende'][0]
    print('gespeichert:', {k:neu.get(k) for k in ['kunde_id','preis','einheit','streichpreis','streichpreis_bestaetigt','gueltig_von','gueltig_bis','screens','status']})
    print('uploads:', {k:v for k,v in db['uploads'].items()})
    pg.click('#filter >> text=Geplant'); pg.wait_for_timeout(300)
    pg.screenshot(path=U+'/out/05_index_geplant.png', full_page=True)
    # 3 Bearbeiten + erneut speichern (alte Dateien sollen gelöscht werden)
    pg.click('.ag-item:has-text("Frische Rinderlende") >> text=Bearbeiten'); pg.wait_for_selector('#produkt-gewaehlt:not([hidden])')
    pg.wait_for_timeout(300)
    print('edit preis:', pg.input_value('#preis'), 'streich:', pg.input_value('#streichpreis'), 'haken:', pg.is_checked('#bestaetigt'))
    pg.fill('#streichpreis','')
    pg.wait_for_timeout(500)
    pg.locator('#vorschau').screenshot(path=U+'/out/06_ohne_streichpreis.png')
    with pg.expect_navigation(timeout=20000): pg.click('#btn-speichern')
    pg.wait_for_timeout(400)
    db=pg.evaluate("JSON.parse(localStorage.getItem('__mockdb'))")
    neu=[a for a in db['angebote'] if a['titel']=='Frische Rinderlende'][0]
    print('nach edit streich:', neu['streichpreis'], 'bestaetigt:', neu['streichpreis_bestaetigt'], 'uploads jetzt:', len(db['uploads']))
    # 4 Duplizieren
    pg.click('#filter >> text=Geplant'); pg.wait_for_timeout(200)
    pg.click('.ag-item:has-text("Frische Rinderlende") >> text=Duplizieren'); pg.wait_for_selector('#produkt-gewaehlt:not([hidden])'); pg.wait_for_timeout(300)
    print('dup titel:', pg.inner_text('#seiten-titel'), pg.input_value('#von'), pg.input_value('#bis'))
    # 5 Produkte
    pg.goto('http://t.local/modules/angebote/produkte.html?kunde=test0001'); pg.wait_for_selector('.ag-pcard'); pg.wait_for_timeout(300)
    pg.click('#neu'); pg.fill('#p-name','Rinderhackfleisch'); pg.click('#p-einheit >> text=100 g')
    pg.set_input_files('#p-foto', REPO+'/modules/mittagstisch/Gerichte/hackbraten.jpg'); pg.wait_for_timeout(600)
    pg.screenshot(path=U+'/out/07_produkt_modal.png')
    pg.click('#p-speichern'); pg.wait_for_timeout(500)
    print('produkte:', pg.eval_on_selector_all('.ag-pcard-name','els=>els.map(e=>e.textContent)'))
    pg.screenshot(path=U+'/out/08_produkte.png', full_page=True)
    # 6 Handy
    pg.set_viewport_size({'width':390,'height':844})
    pg.goto('http://t.local/modules/angebote/bearbeiten.html?kunde=test0001&produkt=p1'); pg.wait_for_selector('#produkt-gewaehlt:not([hidden])'); pg.wait_for_timeout(900)
    pg.screenshot(path=U+'/out/09_handy.png', full_page=True)
    sw=pg.evaluate('document.documentElement.scrollWidth')
    print('handy scrollWidth:', sw)
    # 7 Dashboard Link
    pg.set_viewport_size({'width':1440,'height':900})
    pg.goto('http://t.local/dashboard.html'); pg.wait_for_timeout(500)
    print('dashboard angebote href:', pg.get_attribute('a.mp-module-card:has-text("Angebote")','href'))
    b.close()
print('FEHLER:' , [e for e in errors if 'favicon' not in e and 'mock.supabase' not in e and '404' not in e][:20])
