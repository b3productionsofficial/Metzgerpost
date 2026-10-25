import os, json, datetime
HIER=os.path.dirname(os.path.abspath(__file__)); UI=os.path.join(HIER,'..','angebote','ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
K='6544d8e6'
def seed(wochen):
    return {"wochen":wochen,"displays":[{"kunde_id":K,"screen_id":"mt_settings","content":{"tage":[2,3,4,5]}}],
      "angebote":[{"id":"a1","kunde_id":K,"status":"aktiv","gueltig_von":"2026-10-20","gueltig_bis":"2026-10-31","screens":["screen1","screen3"]},
                  {"id":"a2","kunde_id":K,"status":"aktiv","gueltig_von":"2026-10-20","gueltig_bis":"2026-10-31","screens":["screen3"]}],
      "screen2_config":[],"screen3_config":[]}
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(viewport={'width':1280,'height':900}); ctx.route('**/*', route)
    pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.clock.set_fixed_time(datetime.datetime(2026,10,28,10,0))
    for name,w in [('mit Woche',[{"id":"w","kunde_id":K,"gueltig_ab":"2026-10-27","woche_label":"27.10.2026 - 30.10.2026","kw":44,"jahr":2026,"gerichte":{}}]),('ohne Woche',[])]:
        pg.goto('http://t.local/shared/style.css'); pg.evaluate("s=>{localStorage.setItem('__mockdb',s);localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')}", json.dumps(seed(w)))
        pg.goto('http://t.local/modules/display/index.html'); pg.wait_for_timeout(2000)
        print(name, '| Warnung sichtbar:', pg.is_visible('#woche-warnung'), '| Karten:', [pg.inner_text('#card-s%d .screen-body'%i).replace('\n',' / ')[:110] for i in (1,3)])
    pg.screenshot(path=os.path.join(HIER,'..','bildschirme','out','display_manager.png'), full_page=True)
    # B12: manuelle Tag-Knöpfe dürfen Mittagstisch-Tage nicht abwählen
    pg.evaluate("()=>{const t=document.getElementById('auto-toggle');t.checked=false;t.dispatchEvent(new Event('change'))}"); pg.wait_for_timeout(300)
    vor=pg.eval_on_selector_all('#mt-tage-wrap .day-btn.active','e=>e.length')
    pg.click('#manual-controls .day-btn >> nth=2'); pg.wait_for_timeout(200)
    print('MT-Tage aktiv vorher/nachher:', vor, pg.eval_on_selector_all('#mt-tage-wrap .day-btn.active','e=>e.length'))
    print('errors', errs)
    b.close()
