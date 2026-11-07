// Minimaler In-Memory-Ersatz für supabase-js (nur für lokale UI-Tests)
(function(){
  const KEY='__mockdb'
  const load=()=>Object.assign({uploads:{}},JSON.parse(localStorage.getItem(KEY)||'{"angebots_produkte":[],"angebote":[],"screen3_config":[]}'))
  const save=db=>localStorage.setItem(KEY,JSON.stringify(db))
  window.__mock={load,save,log:[]}
  function uuid(){return 'm'+Math.random().toString(16).slice(2)+Date.now().toString(16)}
  class Q{
    constructor(t){this.t=t;this.f=[];this.o=[];this.op='select';this.payload=null;this.one=false;this.maybe=false;this.lim=null}
    select(){if(this.op==='select')this.op='select';this.ret=true;return this}
    eq(k,v){this.f.push(r=>String(r[k])===String(v));return this}
    lte(k,v){this.f.push(r=>r[k]<=v);return this}
    in(k,arr){this.f.push(r=>arr.map(String).includes(String(r[k])));return this}
    gte(k,v){this.f.push(r=>r[k]>=v);return this}
    contains(k,v){this.f.push(r=>v.every(x=>(r[k]||[]).includes(x)));return this}
    order(k,o){this.o.push([k,o&&o.ascending===false?-1:1]);return this}
    limit(n){this.lim=n;return this}
    single(){this.one=true;return this}
    maybeSingle(){this.maybe=true;return this}
    insert(p){this.op='insert';this.payload=p;return this}
    update(p){this.op='update';this.payload=p;return this}
    upsert(p,o){this.op='upsert';this.payload=p;this.conflict=o&&o.onConflict?o.onConflict.split(',').map(x=>x.trim()):null;return this}
    delete(){this.op='delete';return this}
    then(res,rej){return new Promise((ok,no)=>{try{ok(this.run())}catch(e){no(e)}}).then(res,rej)}
    catch(rej){return this.then(null,rej)}
    run(){
      const db=load(); db[this.t]=db[this.t]||[]; let rows=db[this.t]; let out
      const now=new Date().toISOString()
      const match=r=>this.f.every(f=>f(r))
      window.__mock.log.push(this.op+' '+this.t)
      if(this.op==='insert'||this.op==='upsert'){
        const arr=(Array.isArray(this.payload)?this.payload:[this.payload]).map(p=>{
          const ex=(p.id&&rows.find(r=>r.id===p.id))||(this.conflict&&rows.find(r=>this.conflict.every(c=>String(r[c])===String(p[c]))))
          if(ex){Object.assign(ex,p,{updated_at:now});return ex}
          const r=Object.assign({id:uuid(),created_at:now,updated_at:now,aktiv:true,status:'aktiv'},p);rows.push(r);return r})
        out=arr
      }else if(this.op==='update'){out=rows.filter(match);out.forEach(r=>Object.assign(r,this.payload,{updated_at:now}))}
      else if(this.op==='delete'){out=rows.filter(match);db[this.t]=rows.filter(r=>!match(r))}
      else{out=rows.filter(match);for(const [k,d] of this.o.slice().reverse())out.sort((a,b)=>(a[k]>b[k]?1:a[k]<b[k]?-1:0)*d);if(this.lim)out=out.slice(0,this.lim)}
      save(db)
      out=JSON.parse(JSON.stringify(out))
      if(this.one)return {data:out[0]||null,error:out[0]?null:{message:'not found'}}
      if(this.maybe)return {data:out[0]||null,error:null}
      return {data:out,error:null}
    }
  }
  const user=JSON.parse(localStorage.getItem('__mockuser')||'null')||{id:'adminxxx-0000-0000-0000-000000000000',email:'lukas@test.de',user_metadata:{plan:'admin',betrieb_name:'Lukas'}}
  window.supabase={createClient(){return{
    auth:{getSession:async()=>({data:{session:window.__noSession?null:{user}}}),signOut:async()=>({})},
    from:t=>new Q(t),
    rpc:async(name,args)=>{
      window.__mock.log.push('rpc '+name)
      if(name!=='mp_einladung_annehmen')return{data:null,error:{message:'unbekannte Funktion'}}
      const db=load();db.kunden=db.kunden||[];db.kunden_mitglieder=db.kunden_mitglieder||[]
      const k=db.kunden.find(x=>x.einladungscode&&x.einladungscode===String(args.code||'').trim().toUpperCase())
      if(!k)return{data:null,error:{message:'Code ungültig oder abgelaufen.'}}
      db.kunden_mitglieder.push({user_id:user.id,kunde_id:k.kunde_id,rolle:'inhaber'});k.einladungscode=null;save(db)
      return{data:k.kunde_id,error:null}
    },
    storage:{from:()=>({
      upload:async(p,blob)=>{const db=load();db.uploads[p]=blob.size;save(db);window.__mock.log.push('upload '+p+' '+blob.size);return{error:null}},
      getPublicUrl:p=>({data:{publicUrl:'https://mock.supabase.co/storage/v1/object/public/screen-assets/'+p}}),
      remove:async ps=>{const db=load();ps.forEach(p=>delete db.uploads[p]);save(db);window.__mock.log.push('remove '+ps.join(','));return{error:null}},
      list:async()=>({data:[]})
    })},
    channel:(name,cfg)=>{
      // Presence-Nachbau: Zustand in localStorage, Benachrichtigung per BroadcastChannel (über Tabs hinweg)
      const key=cfg&&cfg.config&&cfg.config.presence&&cfg.config.presence.key, LS='__presence_'+name
      const lies=()=>JSON.parse(localStorage.getItem(LS)||'{}')
      const bc=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(LS):null, hoerer=[]
      const melde=()=>hoerer.forEach(f=>f())
      if(bc)bc.onmessage=melde
      const c={on(typ,filter,cb){if(typ==='presence')hoerer.push(cb);return c},
        subscribe(cb){setTimeout(()=>{cb&&cb('SUBSCRIBED');melde()},10);return c},
        track(d){window.__mock&&window.__mock.log.push('track');if(window.__mockPresenceAus)return Promise.resolve('error');const st=lies();st[key]=[d];localStorage.setItem(LS,JSON.stringify(st));melde();bc&&bc.postMessage(1);return Promise.resolve('ok')},
        presenceState(){return lies()}}
      return c},
    removeChannel(){}
  }}}
})()
