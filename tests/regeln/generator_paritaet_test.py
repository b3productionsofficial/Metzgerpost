"""Pixelvergleich: neuer Renderer (render.js) gegen alte Generator-Seite (script.js).
Gleiche Eingaben → Story, Feed, Druck vorne/hinten müssen pixelgleich sein (GE-03)."""
import os, json
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright

FAELLE = [
  ('mittagstisch_instagram', 'story', dict(woche='27.10.2026 - 30.10.2026', tage=['schlachtschuessel', 'saschliktopf', 'lende', 'fleischteller'])),
  ('mittagstisch_instagram', 'feed',  dict(woche='03.11.2026 - 06.11.2026', tage=['currywurst', 'cordonbleu', 'gulasch', 'lasagne'])),
  ('mittagstisch_druck', 'front', dict(woche='27.10.2026 - 30.10.2026', tage=['currywurst', 'cordonbleu', 'gulasch', 'lasagne'])),
  ('mittagstisch_druck', 'back',  dict(woche='27.10.2026 - 30.10.2026', tage=['schaeufele', 'gyros', 'rouladen', 'feiertag'],
                                       rechts='03.11.2026 - 06.11.2026', tage2=['kotelett', 'backfisch', 'zwiebelrostbraten', 'spareribs'])),
]
TAGE = ['dienstag', 'mittwoch', 'donnerstag', 'freitag']
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1200, 'height': 900}); ctx.route('**/*', route)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://t.local/shared/style.css'); pg.evaluate("()=>{localStorage.clear();localStorage.setItem('__mockdb','{}')}")
    pg.goto('http://t.local/modules/mittagstisch/index.html?kunde=sorgundseitz'); pg.wait_for_timeout(2500)
    pg.add_script_tag(url='http://t.local/modules/mittagstisch/render.js'); pg.wait_for_timeout(300)
    pg.evaluate("()=>Promise.all([document.fonts.load(\"700 60px 'IBM Plex Serif'\"),document.fonts.load(\"500 30px 'Raleway'\"),document.fonts.load(\"600 30px 'Raleway'\")])")
    for layout, fmt, f in FAELLE:
        res = pg.evaluate("""async ([layout, fmt, f, TAGE]) => {
          const sel = document.getElementById('vorlage'); sel.value = layout; handleVorlageChange();
          await new Promise(r => setTimeout(r, 300));
          for (const id of ['woche','druck-front-datum','druck-woche-links']) document.getElementById(id).value = f.woche;
          document.getElementById('druck-woche-rechts').value = f.rechts || '';
          TAGE.forEach((t, i) => { document.getElementById(t).value = f.tage[i]; document.getElementById('druck-' + t).value = f.tage[i];
                                   document.getElementById(t + '2').value = (f.tage2 || f.tage)[i] })
          const alt = document.createElement('canvas'); await renderToCanvas(alt, fmt)
          const g = k => ({ text: gerichte[k].text, preis: gerichte[k].preis, bild: gerichte[k].bild })
          const zustand = { kunde: 'sorgundseitz', layout, woche: f.woche, tage: {}, druck: { frontDatum: f.woche, wocheLinks: f.woche, wocheRechts: f.rechts || '', rechts: {} } }
          TAGE.forEach((t, i) => { zustand.tage[t] = g(f.tage[i]); zustand.druck.rechts[t] = g((f.tage2 || f.tage)[i]) })
          const neu = document.createElement('canvas'); await MPMittagRender.render(neu, fmt, zustand, getLayoutOverrides())
          const a = alt.getContext('2d').getImageData(0, 0, alt.width, alt.height).data, n = neu.getContext('2d').getImageData(0, 0, neu.width, neu.height).data
          let diff = 0; for (let i = 0; i < a.length; i++) if (a[i] !== n[i]) diff++
          return [alt.width + 'x' + alt.height, neu.width + 'x' + neu.height, diff]
        }""", [layout, fmt, f, TAGE])
        print(f'GE-03 {fmt:6} alt {res[0]} neu {res[1]} abweichende Werte: {res[2]}', 'PIXELGLEICH' if res[2] == 0 and res[0] == res[1] else 'UNTERSCHIED')
    b.close()
print('errors', errs)
