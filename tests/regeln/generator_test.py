import os, json

HIER=os.path.dirname(os.path.abspath(__file__)); UI=os.path.join(HIER,'..','angebote','ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b=pw.chromium.launch(); ctx=b.new_context(); ctx.route('**/*', route)
    pg=ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://t.local/shared/style.css'); pg.evaluate("()=>{localStorage.setItem('__mockdb',JSON.stringify({wochen:[]}));localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')}")
    pg.goto('http://t.local/modules/mittagstisch/index.html'); pg.wait_for_timeout(2500)
    wl=pg.evaluate("()=>{const e=[...document.querySelectorAll('input,div,span')].find(x=>/\\d{2}\\.\\d{2}\\.\\s*-/.test(x.value||''));return e?e.id+'='+e.value:null}")
    print('label feld:', wl)
    for i in range(2):
        pg.evaluate("""()=>{for(const d of ['dienstag','mittwoch']){const s=document.getElementById(d);if(s&&s.options.length>1){s.selectedIndex=1+%d;s.dispatchEvent(new Event('change'))}}}""" % i)
        pg.evaluate("saveWocheToSupabase()"); pg.wait_for_timeout(800)
        db=pg.evaluate("()=>JSON.parse(localStorage.getItem('__mockdb')).wochen.map(w=>[w.kunde_id,w.gueltig_ab,w.woche_label,Object.values(w.gerichte).map(g=>g[0].name).join('/')])")
        print('nach Speichern', i+1, db)
    pass
    print('errors', errs)
    b.close()
