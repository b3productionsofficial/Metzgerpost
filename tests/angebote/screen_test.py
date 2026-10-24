import os, json
from playwright.sync_api import sync_playwright
exec(open(os.path.dirname(os.path.abspath(__file__))+'/ui_test.py').read().split('SEED=')[0])
G='/modules/mittagstisch/Gerichte/'
def ang(i,k,von,bis,status='aktiv',screens=['screen3'],url=None):
    return {"id":i,"kunde_id":k,"titel":i,"gueltig_von":von,"gueltig_bis":bis,"status":status,"screens":screens,"render_tv_url":url or G+'lende.jpg',"updated_at":"t"}
SEED={"angebots_produkte":[],"uploads":{},
 "screen3_config":[{"kunde_id":"k1","timer_sekunden":4,"aktive_layouts":[{"id":"x","bild":G+"gulasch.jpg"},{"id":"y","bild":G+"gyros.jpg"}]}],
 "angebote":[ang('rinderlende','k1','2026-10-26','2026-10-31'), ang('schaeufele','k1','2026-10-20','2026-10-31'),
  ang('entwurf','k1','2026-10-20','2026-10-31','entwurf'), ang('beendet','k1','2026-10-20','2026-10-31','beendet'),
  ang('nur_screen1','k1','2026-10-20','2026-10-31',screens=['screen1']), ang('anderer_kunde','k2','2026-10-20','2026-10-31'),
  ang('kaputtes_bild','k1','2026-11-02','2026-11-07',url='/gibts/nicht.jpg')]}
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':720}); ctx.route('**/*', route)
    pg=ctx.new_page(); pg.on('pageerror', lambda e: print('PAGEERROR',e))
    pg.goto('http://t.local/shared/style.css'); pg.evaluate("s=>localStorage.setItem('__mockdb',s)", json.dumps(SEED))
    for d in ['2026-10-25','2026-10-26','2026-10-31','2026-11-01','2026-11-03']:
        pg.goto(f'http://t.local/modules/display/screen3-v2.html?kunde=k1&datum={d}&debug=1'); pg.wait_for_timeout(1200)
        srcs=pg.eval_on_selector_all('.slide img','els=>els.map(e=>e.getAttribute("src").split("/").pop())')
        print(d, srcs, '| leer' if 'show' in (pg.get_attribute('#no-content','class') or '') else '')
    # Rotation + Live-Änderung
    pg.goto('http://t.local/modules/display/screen3-v2.html?kunde=k1&datum=2026-10-26&debug=1'); pg.wait_for_timeout(1200)
    a1=pg.eval_on_selector('.slide.active img','e=>e.src.split("/").pop()'); pg.wait_for_timeout(4300)
    a2=pg.eval_on_selector('.slide.active img','e=>e.src.split("/").pop()')
    print('rotation:', a1, '->', a2)
    pg.screenshot(path=U+'/out/10_screen3.png')
    # Angebot beenden und Sync auslösen (wie Realtime/Intervall)
    pg.evaluate("""()=>{const db=__mock.load();db.angebote.find(a=>a.id==='schaeufele').status='beendet';__mock.save(db);document.dispatchEvent(new Event('visibilitychange'))}""")
    pg.wait_for_timeout(1200)
    print('nach beenden:', pg.eval_on_selector_all('.slide img','els=>els.map(e=>e.getAttribute("src").split("/").pop())'))
    # ohne Konfiguration und ohne Angebote
    pg.goto('http://t.local/modules/display/screen3-v2.html?kunde=leer&debug=1'); pg.wait_for_timeout(1000)
    print('leerer kunde:', pg.get_attribute('#no-content','class'))
    b.close()
