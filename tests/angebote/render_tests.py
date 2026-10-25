import base64, json, os, sys
from playwright.sync_api import sync_playwright
REPO=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')); S=os.path.dirname(os.path.abspath(__file__))
FONTS=S+'/node_modules/@fontsource'
def handler(route):
    url=route.request.url.split('http://t.local')[1].split('?')[0]
    if url=='/__harness': return route.fulfill(path=S+'/harness.html', content_type='text/html')
    if url.startswith('/__fonts/'):
        f=url.split('/')[-1]; d='montserrat' if 'montserrat' in f else 'ibm-plex-serif'
        return route.fulfill(path=f'{FONTS}/{d}/files/{f}', content_type='font/woff2')
    p=REPO+url
    if os.path.isfile(p): return route.fulfill(path=p)
    return route.fulfill(status=404, body='nf')
CASES=json.load(open(S+'/cases.json'))
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page()
    pg.route('http://t.local/**', handler)
    pg.goto('http://t.local/__harness')
    res=pg.evaluate("""async (cases)=>{
      const v=await (await fetch('/modules/angebote/vorlagen/sorgundseitz/preis-angebot.json')).json();
      const out={};
      for(const c of cases){ for(const f of (c.formate||['tv','feed','story'])){
        const cv=document.createElement('canvas');
        await MPAngebotRenderer.render(cv,v,f,c.angebot,'/modules/angebote/vorlagen/sorgundseitz/');
        out[c.name+'_'+f]=cv.toDataURL('image/jpeg',0.95);
      }}
      return out}""", CASES)
    for k,v in res.items():
        open(f'{S}/out/{k}.jpg','wb').write(base64.b64decode(v.split(',')[1]))
    print('rendered',len(res))
    b.close()
