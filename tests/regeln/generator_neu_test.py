"""Neuer Mittagstisch-Generator (generator.html) + Gerichte-Bibliothek (gerichte.html) – Mock-Datenbank.
Prüft GE-04 … GE-12 (siehe docs/REGELN.md). Ausgabe: Zeilen 'OK …' / 'FEHLER …'."""
import os, json, datetime, re
HIER = os.path.dirname(os.path.abspath(__file__)); UI = os.path.join(HIER, '..', 'angebote', 'ui_test.py')
exec(open(UI).read().split('SEED=')[0].replace('__file__', repr(UI)))
from playwright.sync_api import sync_playwright
OUT = os.path.join(HIER, 'out'); os.makedirs(OUT, exist_ok=True)
FOTO = os.path.join(REPO, 'modules', 'mittagstisch', 'Gerichte', 'backfisch.jpg')

ergebnis = []
def pruefe(id_, ok, text):
    ergebnis.append(ok); print(('OK     ' if ok else 'FEHLER ') + id_ + ' ' + text)

heute = datetime.date.today(); mo = heute - datetime.timedelta(days=heute.weekday()); mo2 = mo + datetime.timedelta(days=7)
f = lambda d: d.strftime('%d.%m.%Y')
LABEL2 = f(mo2 + datetime.timedelta(days=1)) + ' - ' + f(mo2 + datetime.timedelta(days=4))
AB2 = (mo2 + datetime.timedelta(days=1)).isoformat()

def db(pg): return pg.evaluate("()=>JSON.parse(localStorage.getItem('__mockdb'))")

def waehle(pg, liste, tag, suche):
    pg.click(f'.mt-tag[data-liste="{liste}"][data-tag="{tag}"] .mt-wahl')
    pg.fill('#mg-suche', suche); pg.wait_for_timeout(100)
    pg.click('#mg-liste .ag-produkt-btn >> nth=0'); pg.wait_for_timeout(150)

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1440, 'height': 1000}, accept_downloads=True); ctx.route('**/*', route)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://t.local/shared/style.css')
    pg.evaluate("()=>{localStorage.clear();localStorage.setItem('__mockdb',JSON.stringify({wochen:[],mittag_gerichte:[]}));localStorage.setItem('mp_admin_selected_kunde','sorgundseitz')}")
    SEITE = 'http://t.local/modules/mittagstisch/generator.html?kunde=sorgundseitz'
    pg.goto(SEITE); pg.wait_for_timeout(1500)

    anzahl = pg.evaluate("()=>Object.keys(standardGerichte).length")
    hinweis = pg.inner_text('#quelle-hinweis')
    pruefe('GE-04', 'Standardgerichte' in hinweis, f'ohne Bibliothek → Standardgerichte ({anzahl}), Hinweis „{hinweis[:40]}…“')

    pg.click('#woche-chips >> text=Nächste Woche'); pg.wait_for_timeout(200)
    lab = pg.input_value('#woche-label')
    pruefe('GE-05', lab == LABEL2, f'„Nächste Woche“ → Label Di–Fr {lab} (erwartet {LABEL2})')

    for t, s in [('dienstag', 'gulasch'), ('mittwoch', 'cordon'), ('donnerstag', 'lasagne'), ('freitag', 'schäufele')]: waehle(pg, 'tage', t, s)
    pg.fill('.mt-tag[data-tag="dienstag"][data-liste="tage"] .mt-preis', '7,20 €'); pg.wait_for_timeout(900)
    v = pg.evaluate("""()=>{const c=document.getElementById('vorschau');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4000)if(d[i]||d[i+1]||d[i+2])n++;return [c.width,c.height,n]}""")
    pruefe('GE-06', v[0] == 1080 and v[1] == 1920 and v[2] > 100, f'Live-Vorschau Story {v[0]}x{v[1]}, gezeichnet')
    # Vorschau == Renderer mit gleichem Zustand (Feed)
    pg.click('#vorschau-tabs >> text=Beitrag'); pg.wait_for_timeout(900)
    gleich = pg.evaluate("""async()=>{const c=document.createElement('canvas');
      const z=JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('mp_mt_entwurf_'))));
      const tage={};['dienstag','mittwoch','donnerstag','freitag'].forEach(t=>tage[t]=z.tage[t]);
      await MPMittagRender.render(c,'feed',{kunde:'sorgundseitz',layout:'mittagstisch_instagram',woche:z.woche,tage},{});
      const v=document.getElementById('vorschau');const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data,b=v.getContext('2d').getImageData(0,0,v.width,v.height).data;
      if(a.length!==b.length)return 'groesse';let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])d++;return d}""")
    pruefe('GE-06', gleich == 0, f'Vorschau Feed = Renderer (abweichend: {gleich})')
    cap = pg.input_value('#caption')
    pruefe('GE-07', 'Gulasch' in cap and lab in cap, 'Instagram-Text enthält Woche und Gerichte')
    pg.screenshot(path=OUT + '/gen_01_instagram.png', full_page=True)

    with pg.expect_download() as dl: pg.click('[data-download="story"]')
    d = dl.value; p = d.path(); groesse = os.path.getsize(p)
    pruefe('GE-08', re.match(r'klassisch-story-\d+\.png', d.suggested_filename) and open(p, 'rb').read(4) == b'\x89PNG' and groesse > 100000,
           f'Download {d.suggested_filename} ({groesse // 1024} KB)')

    pg.click('#btn-speichern'); pg.wait_for_timeout(600)
    w = db(pg)['wochen']
    ok = len(w) == 1 and w[0]['kunde_id'] == '6544d8e6' and w[0]['gueltig_ab'] == AB2 and w[0]['woche_label'] == LABEL2 \
        and w[0]['gerichte']['dienstag'][0]['preis'] == '7,20 €' and w[0]['gerichte']['dienstag'][0]['bild'].startswith('/modules/mittagstisch/Gerichte/')
    pruefe('GE-09', ok, f'Speichern → wochen: Kunde {w[0]["kunde_id"] if w else "-"}, ab {w[0]["gueltig_ab"] if w else "-"}, Preis/Bild im alten Format')
    waehle(pg, 'tage', 'freitag', 'lende'); pg.click('#btn-speichern'); pg.wait_for_timeout(600)
    w = db(pg)['wochen']
    pruefe('GE-09', len(w) == 1 and 'Lende' in w[0]['gerichte']['freitag'][0]['name'] and 'aktualisiert' in pg.inner_text('#speicher-status'),
           f'gleiche Woche nochmal → aktualisiert, keine zweite Zeile ({len(w)})')
    # Bildschirm 1 findet die Woche (gleiche Regel wie TV)
    pg.add_script_tag(url='http://t.local/shared/screen-regeln.js')
    tvw = pg.evaluate("([w,d])=>{const r=MPRegeln.aktiveWoche(w,new Date(d+'T10:00'));return r&&r.woche.woche_label}", [w, (mo2 + datetime.timedelta(days=2)).isoformat()])
    pruefe('GE-09', tvw == LABEL2, f'Bildschirm-1-Regel wählt die gespeicherte Woche am Mittwoch ({tvw})')

    # Gespeicherte Woche öffnen (frischer Entwurf)
    pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.startsWith('mp_mt_entwurf_')).forEach(k=>localStorage.removeItem(k))")
    pg.goto(SEITE); pg.wait_for_timeout(1200)
    leer = pg.evaluate("()=>document.querySelectorAll('#tage .mt-wahl.leer').length")
    pg.select_option('#woche-laden', index=1); pg.wait_for_timeout(300)
    namen = pg.evaluate("()=>[...document.querySelectorAll('#tage .mt-wahl span:last-child')].map(s=>s.textContent)")
    preis = pg.input_value('.mt-tag[data-tag="dienstag"][data-liste="tage"] .mt-preis')
    pruefe('GE-10', leer == 4 and 'Lende' in namen[3] and preis == '7,20 €' and pg.input_value('#woche-label') == LABEL2,
           f'gespeicherte Woche öffnen → {namen}, Preis Di {preis}')

    # Druck
    pg.click('#format-seg >> text=Druck'); pg.wait_for_timeout(200)
    for t, s in [('dienstag', 'currywurst'), ('mittwoch', 'gyros')]: waehle(pg, 'tage2', t, s)
    pg.wait_for_timeout(1500)
    vs = pg.evaluate("()=>{const c=document.getElementById('vorschau');return c.width+'x'+c.height}")
    pg.click('#vorschau-tabs >> text=Rückseite'); pg.wait_for_timeout(2000)
    vb = pg.evaluate("()=>{const c=document.getElementById('vorschau');return c.width+'x'+c.height}")
    LABEL3 = f(mo2 + datetime.timedelta(days=8)) + ' - ' + f(mo2 + datetime.timedelta(days=11))
    pruefe('GE-11', vs == '3508x2480' and vb == '3508x2480' and pg.is_hidden('#caption-feld') and pg.input_value('#zweite-label') == LABEL3, f'Druck: Vorderseite {vs}, Rückseite {vb}, zweite Woche {pg.input_value("#zweite-label")}')
    # Druck: beide Wochen auf einmal für Bildschirm 1
    t_beide = pg.inner_text('#btn-speichern')
    pg.click('#btn-speichern'); pg.wait_for_timeout(900)
    w = sorted(db(pg)['wochen'], key=lambda x: x['gueltig_ab'])
    AB3 = (mo2 + datetime.timedelta(days=8)).isoformat()
    ok = t_beide.startswith('Beide Wochen') and len(w) == 2 and w[0]['gueltig_ab'] == AB2 and w[1]['gueltig_ab'] == AB3 \
        and w[1]['woche_label'] == LABEL3 and sorted(w[1]['gerichte']) == ['dienstag', 'mittwoch'] and 'Currywurst' in w[1]['gerichte']['dienstag'][0]['name']
    pg.uncheck('#zweite-an'); pg.wait_for_timeout(200); t_eine = pg.inner_text('#btn-speichern'); pg.check('#zweite-an'); pg.wait_for_timeout(200)
    pruefe('GE-14', ok and t_eine == 'Für Bildschirm 1 speichern', f'Druck: „{t_beide}“ → {len(w)} Wochen ({", ".join(x["gueltig_ab"] for x in w)}); ohne zweite Woche wieder „{t_eine}“')
    pg.screenshot(path=OUT + '/gen_02_druck.png', full_page=True)
    # Deckblatt-Datum: beide Wochen zusammen, ohne zweite Woche wie Woche 1, eigener Text bleibt
    FRONT2 = (mo2 + datetime.timedelta(days=1)).strftime('%d.%m.') + ' - ' + f(mo2 + datetime.timedelta(days=11))
    f1 = pg.input_value('#front-text')
    pg.uncheck('#zweite-an'); pg.wait_for_timeout(200); f2 = pg.input_value('#front-text')
    pg.check('#zweite-an'); pg.wait_for_timeout(200); f3 = pg.input_value('#front-text')
    pg.fill('#front-text', 'Martini-Wochen'); pg.click('#woche-chips >> text=Übernächste'); pg.wait_for_timeout(300); f4 = pg.input_value('#front-text')
    pg.click('#front-auto'); pg.wait_for_timeout(300); f5 = pg.input_value('#front-text')
    pruefe('GE-13', f1 == FRONT2 and f2 == LABEL2 and f3 == FRONT2 and f4 == 'Martini-Wochen' and f5 != 'Martini-Wochen' and f5.endswith(f(mo2 + datetime.timedelta(days=18))),
           f'Deckblatt: beide Wochen „{f1}“, nur eine „{f2}“, eigener Text bleibt „{f4}“, zurück auf automatisch „{f5}“')
    pg.click('#woche-chips >> text=Nächste Woche'); pg.wait_for_timeout(1500)
    pg.click('#vorschau-tabs >> text=Vorderseite'); pg.wait_for_timeout(2500)
    pg.screenshot(path=OUT + '/gen_05_deckblatt.png')

    # Handy
    m = ctx.new_page(); m.set_viewport_size({'width': 390, 'height': 844}); m.goto(SEITE); m.wait_for_timeout(1200)
    breit = m.evaluate("()=>document.documentElement.scrollWidth")
    pruefe('GE-12', breit <= 390, f'Handy 390 px: keine Querscroll-Leiste (Breite {breit})')
    m.screenshot(path=OUT + '/gen_03_handy.png', full_page=True); m.close()

    # Bibliothek
    pg.goto('http://t.local/modules/mittagstisch/gerichte.html?kunde=sorgundseitz'); pg.wait_for_timeout(1200)
    banner = pg.is_visible('#banner')
    pg.click('#btn-uebernehmen'); pg.wait_for_timeout(800)
    g = [x for x in db(pg)['mittag_gerichte'] if x['kunde_id'] == '6544d8e6']
    pruefe('GE-04', banner and len(g) == anzahl and not pg.is_visible('#banner'), f'Übernehmen → {len(g)} Gerichte in der Bibliothek')
    pg.click('#neu'); pg.fill('#g-text', 'Backfisch mit Remoulade'); pg.fill('#g-preis', '9,50 €')
    pg.click('#g-speichern'); pg.wait_for_timeout(200); fehl = pg.inner_text('#g-fehler')
    pg.set_input_files('#g-foto', FOTO); pg.wait_for_timeout(500); pg.click('#g-speichern'); pg.wait_for_timeout(800)
    d0 = db(pg); neu = [x for x in d0['mittag_gerichte'] if x['text'] == 'Backfisch mit Remoulade']
    up = [k for k in d0['uploads'] if k.startswith('6544d8e6/gerichte/')]
    pruefe('GE-04', 'Foto' in fehl and len(neu) == 1 and neu[0]['schluessel'] == 'backfisch-mit-remoulade' and len(up) == 1,
           f'neues Gericht: ohne Foto abgelehnt, mit Foto → {up}')
    pg.screenshot(path=OUT + '/gen_04_bibliothek.png', full_page=True)
    karte = pg.locator('.ag-pcard', has_text='Gulasch').first
    karte.locator('[data-aktion="bearbeiten"]').click(); pg.fill('#g-preis', '7,50 €'); pg.click('#g-speichern'); pg.wait_for_timeout(500)
    karte = pg.locator('.ag-pcard', has_text='Lasagne').first
    karte.locator('[data-aktion="bearbeiten"]').click(); pg.click('#g-entfernen'); pg.wait_for_timeout(200)
    pg.click('.mp-modal-overlay.open .mp-btn-primary, .mp-modal-overlay.open .mp-btn-danger >> nth=-1'); pg.wait_for_timeout(600)
    d0 = db(pg)['mittag_gerichte']
    gul = [x for x in d0 if x['schluessel'] == 'gulasch'][0]; las = [x for x in d0 if x['schluessel'] == 'lasagne'][0]
    pruefe('GE-04', gul['preis'] == '7,50 €' and las['aktiv'] is False, f'bearbeiten Preis {gul["preis"]}, entfernen → aktiv={las["aktiv"]} (bleibt in der DB)')
    pg.goto(SEITE); pg.wait_for_timeout(1200)
    pg.click('.mt-tag[data-liste="tage"][data-tag="dienstag"] .mt-wahl'); pg.fill('#mg-suche', ''); pg.wait_for_timeout(100)
    n = pg.evaluate("()=>document.querySelectorAll('#mg-liste .ag-produkt-btn').length"); txt = pg.inner_text('#mg-liste')
    pruefe('GE-04', n == anzahl and 'Backfisch mit Remoulade' in txt and 'Lasagne' not in txt and pg.is_hidden('#quelle-hinweis'),
           f'Generator nutzt jetzt die Bibliothek ({n} Gerichte, neues dabei, entferntes nicht)')
    # GE-15: Wochenpreis als festen Preis speichern (kleiner Knopf im Preisfeld)
    pg.evaluate("()=>{localStorage.setItem('__mockdb',JSON.stringify({wochen:[],mittag_gerichte:[]}));Object.keys(localStorage).filter(k=>k.startsWith('mp_mt_entwurf_')).forEach(k=>localStorage.removeItem(k))}")
    pg.goto(SEITE); pg.wait_for_timeout(1200)
    waehle(pg, 'tage', 'dienstag', 'gulasch')
    knopf = '.mt-tag[data-liste="tage"][data-tag="dienstag"] [data-aktion="standard"]'
    vorher = pg.is_hidden(knopf)
    pg.fill('.mt-tag[data-liste="tage"][data-tag="dienstag"] .mt-preis', '7,40 €'); pg.wait_for_timeout(100)
    sichtbar = pg.is_visible(knopf)
    pg.screenshot(path=OUT + '/gen_06_preis_merken.png', clip={'x': 0, 'y': 0, 'width': 1440, 'height': 1000}, full_page=True)
    pg.click(knopf); pg.wait_for_timeout(1000)
    g = [x for x in db(pg)['mittag_gerichte'] if x['kunde_id'] == '6544d8e6']
    gul = [x for x in g if x['schluessel'] == 'gulasch']
    nachher = pg.is_hidden(knopf)
    pg.fill('.mt-tag[data-liste="tage"][data-tag="dienstag"] .mt-preis', '6,80 €'); pg.wait_for_timeout(100)
    wieder = pg.is_visible(knopf)
    pg.reload(); pg.wait_for_timeout(1200); waehle(pg, 'tage', 'mittwoch', 'gulasch')
    neu_preis = pg.input_value('.mt-tag[data-liste="tage"][data-tag="mittwoch"] .mt-preis')
    pruefe('GE-15', vorher and sichtbar and nachher and wieder and len(g) == anzahl and gul and gul[0]['preis'] == '7,40 €' and neu_preis == '7,40 €',
           f'Knopf nur bei geändertem Preis; Klick → Bibliothek angelegt ({len(g)}), Gulasch fest {gul[0]["preis"] if gul else "-"}, nächste Auswahl {neu_preis}')
    b.close()

pruefe('GE-00', not errs, 'keine Skriptfehler ' + str(errs[:3]))
print('ERGEBNIS', sum(ergebnis), '/', len(ergebnis))
