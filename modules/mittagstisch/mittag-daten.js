/* ══════════════════════════════════════════════════════════════
   MetzgerPost – Mittagstisch: Daten (Kunde, Gerichte, Wochen)
   Für generator.html und gerichte.html. Braucht shared/supabase.js + config.js.

   Gerichte-Quelle (erste, die etwas liefert):
     1. Tabelle mittag_gerichte (pro Kunde, geräteübergreifend)
     2. Browser-Speicher gerichte_<kunde> (alte Admin-Seite)
     3. config.js (Standardgerichte)
   Wochen: gleiche Logik wie die alte Seite (gueltig_ab = erster Tag im Label,
   gleiche Woche erneut speichern = aktualisieren).
══════════════════════════════════════════════════════════════ */
(function () {
  var TAGE = ['dienstag', 'mittwoch', 'donnerstag', 'freitag']
  var TAG_NAMEN = { dienstag: 'Dienstag', mittwoch: 'Mittwoch', donnerstag: 'Donnerstag', freitag: 'Freitag' }
  var BUCKET = 'screen-assets'
  var STANDARD_KEY = 'sorgundseitz'

  function sb () { return MP.getSB() }
  function url () { return new URLSearchParams(location.search) }
  function istAdmin () { return window.MP && MP.userPlan === 'admin' }
  function kundenListe () { return typeof kunden !== 'undefined' ? kunden : {} }

  /* ── Kunde: ?kunde= darf config-Schlüssel (sorgundseitz) oder – nur Admin – eine Kunden-ID sein ── */
  function kundeKey () {
    var p = url().get('kunde'), k = kundenListe()
    if (p && k[p]) return p
    if (p && istAdmin()) { for (var key in k) if (k[key].supabaseId === p) return key }
    var a = MP.getAktiveKundeKey && MP.getAktiveKundeKey()
    return a && k[a] ? a : STANDARD_KEY
  }
  function kundeId () {
    var p = url().get('kunde'), k = kundenListe()
    if (istAdmin()) {
      if (p && k[p] && k[p].supabaseId) return k[p].supabaseId
      if (p && /^[a-z0-9]{4,32}$/i.test(p) && !k[p]) return p
    }
    return MP.getAktiveKundeId()
  }
  function kundeName () { var k = kundenListe()[kundeKey()]; return k ? k.name : kundeKey() }
  function link (datei, params) {
    var u = new URLSearchParams(params || {}), k = url().get('kunde')
    if (k && !u.has('kunde')) u.set('kunde', k)
    var q = u.toString()
    return datei + (q ? '?' + q : '')
  }

  /* ── Hilfen ── */
  function esc (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }
  function slug (s) {
    return String(s || 'gericht').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'gericht'
  }
  /* Bildpfad für die Seite (liegt in modules/mittagstisch/) */
  function bildFuerSeite (b) { return b || '' }
  /* Bildpfad für Bildschirm 1 (wie alte Seite: absolut) */
  function bildFuerWoche (b) {
    if (!b) return null
    return (b.charAt(0) === '/' || /^https?:/.test(b)) ? b : '/modules/mittagstisch/' + b
  }
  function lsLesen (key, fallback) {
    try { var v = localStorage.getItem(key); if (!v || v === 'undefined' || v === 'null') return fallback; return JSON.parse(v) } catch (e) { return fallback }
  }
  function lsSchreiben (key, wert) { try { localStorage.setItem(key, JSON.stringify(wert)) } catch (e) {} }

  function ausObjekt (obj) {
    return Object.keys(obj || {}).map(function (s, i) {
      var g = obj[s] || {}
      return { schluessel: s, text: g.text || s, preis: g.preis || '', bild: g.bild || '', sortierung: i + 1 }
    })
  }

  /* ── Gerichte ── */
  var tabelleFehlt = false
  function ladeGerichte () {
    var id = kundeId(), key = kundeKey()
    return Promise.resolve(id ? sb().from('mittag_gerichte').select('*').eq('kunde_id', id).eq('aktiv', true).order('sortierung', { ascending: true }) : { data: [] })
      .then(function (r) {
        if (r && r.error) { tabelleFehlt = true; console.warn('mittag_gerichte:', r.error.message) }
        var rows = (r && r.data) || []
        if (rows.length) {
          return { quelle: 'db', liste: rows.map(function (x) { return { id: x.id, schluessel: x.schluessel, text: x.text, preis: x.preis || '', bild: x.bild_url || '', sortierung: x.sortierung } }) }
        }
        var lokal = lsLesen('gerichte_' + key, null)
        if (lokal && Object.keys(lokal).length) return { quelle: 'browser', liste: ausObjekt(lokal) }
        var cfg = (typeof kundenGerichte !== 'undefined' && kundenGerichte[key] && Object.keys(kundenGerichte[key]).length)
          ? kundenGerichte[key] : (typeof standardGerichte !== 'undefined' ? standardGerichte : {})
        return { quelle: 'vorlage', liste: ausObjekt(cfg) }
      })
  }

  /* Vorlage/Browser-Gerichte einmalig in die Bibliothek kopieren (vorhandene bleiben unverändert) */
  function uebernehmeInBibliothek (liste) {
    var id = kundeId()
    if (!id) return Promise.reject(new Error('Kein Kunde gewählt.'))
    var rows = liste.map(function (g, i) {
      return { kunde_id: id, schluessel: g.schluessel, text: g.text, preis: g.preis || '', bild_url: g.bild || null, sortierung: g.sortierung || i + 1, aktiv: true }
    })
    return sb().from('mittag_gerichte').upsert(rows, { onConflict: 'kunde_id,schluessel', ignoreDuplicates: true })
      .then(function (r) { if (r.error) throw r.error; return rows.length })
  }

  function speichereGericht (g) {
    var id = kundeId()
    var zeile = { kunde_id: id, schluessel: g.schluessel || slug(g.text), text: g.text, preis: g.preis || '', bild_url: g.bild || null, aktiv: true }
    if (g.sortierung != null) zeile.sortierung = g.sortierung
    var q = g.id
      ? sb().from('mittag_gerichte').update(zeile).eq('id', g.id).select()
      : sb().from('mittag_gerichte').upsert(zeile, { onConflict: 'kunde_id,schluessel' }).select()
    return q.then(function (r) { if (r.error) throw r.error; return r.data && r.data[0] })
  }
  /* „Entfernen“ = ausblenden; gespeicherte Wochen behalten Name/Bild */
  function blendeAus (gid) {
    return sb().from('mittag_gerichte').update({ aktiv: false }).eq('id', gid)
      .then(function (r) { if (r.error) throw r.error })
  }
  function ladeFotoHoch (blob, name) {
    var pfad = kundeId() + '/gerichte/' + slug(name) + '-' + Date.now().toString(36) + '.jpg'
    return sb().storage.from(BUCKET).upload(pfad, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' })
      .then(function (r) { if (r.error) throw r.error; return sb().storage.from(BUCKET).getPublicUrl(pfad).data.publicUrl })
  }
  function komprimiereFoto (datei, kante) {
    kante = kante || 800
    return new Promise(function (resolve, reject) {
      var u = URL.createObjectURL(datei), img = new Image()
      img.onload = function () {
        var seite = Math.min(img.width, img.height), ziel = Math.min(kante, seite)
        var c = document.createElement('canvas'); c.width = c.height = ziel
        c.getContext('2d').drawImage(img, (img.width - seite) / 2, (img.height - seite) / 2, seite, seite, 0, 0, ziel, ziel)
        URL.revokeObjectURL(u)
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Foto konnte nicht verarbeitet werden')) }, 'image/jpeg', 0.85)
      }
      img.onerror = function () { URL.revokeObjectURL(u); reject(new Error('Datei ist kein lesbares Bild')) }
      img.src = u
    })
  }

  /* ── Datum & Woche ── */
  function zwei (n) { return (n < 10 ? '0' : '') + n }
  function dmy (d) { return zwei(d.getDate()) + '.' + zwei(d.getMonth() + 1) + '.' + d.getFullYear() }
  function iso (d) { return d.getFullYear() + '-' + zwei(d.getMonth() + 1) + '-' + zwei(d.getDate()) }
  function montagVon (d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var w = x.getDay(); x.setDate(x.getDate() - (w === 0 ? 6 : w - 1)); return x }
  function plus (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x }
  function kw (d) {
    var dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7))
    var y1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
    return { kw: Math.ceil((((dt - y1) / 86400000) + 1) / 7), jahr: dt.getUTCFullYear() }
  }
  /* Label wie bisher: Dienstag – Freitag, „27.10.2026 - 30.10.2026“ */
  function wocheAus (datum) {
    var mo = montagVon(datum), k = kw(mo)
    return { montag: mo, label: dmy(plus(mo, 1)) + ' - ' + dmy(plus(mo, 4)), kw: k.kw, jahr: k.jahr, gueltigAb: iso(plus(mo, 1)) }
  }
  /* Label → Datum des ersten Tages (wie parseDatumLabel der alten Seite) */
  function parseLabel (label) {
    var m = String(label || '').match(/(\d{1,2})\.(\d{1,2})\.?/)
    if (!m) return null
    var j = String(label).match(/(\d{4})/)
    var d = new Date(j ? +j[1] : new Date().getFullYear(), +m[2] - 1, +m[1])
    var k = kw(d)
    return { datum: d, gueltigAb: iso(d), kw: k.kw, jahr: k.jahr }
  }

  /* ── Wochen (Bildschirm 1) ── */
  function ladeWochen (anzahl) {
    return sb().from('wochen').select('*').eq('kunde_id', kundeId()).order('gueltig_ab', { ascending: false }).limit(anzahl || 12)
      .then(function (r) { if (r.error) throw r.error; return r.data || [] })
  }
  function gerichteFuerWoche (tage) {
    var g = {}
    TAGE.forEach(function (t) {
      var x = tage[t]
      if (x && x.text) g[t] = [{ name: x.text, preis: x.preis || '', bild: bildFuerWoche(x.bild) }]
    })
    return g
  }
  function speichereWoche (label, tage) {
    var gerichte = gerichteFuerWoche(tage)
    if (!Object.keys(gerichte).length) return Promise.reject(new Error('Bitte zuerst Gerichte auswählen.'))
    var id = kundeId()
    if (!id) return Promise.reject(new Error('Kein Kunde gewählt.'))
    var p = parseLabel(label) || {}
    var heute = kw(new Date())
    var zeile = { kunde_id: id, woche_label: label, kw: p.kw || heute.kw, jahr: p.jahr || heute.jahr, gueltig_ab: p.gueltigAb || null, gerichte: gerichte }
    var such = p.gueltigAb
      ? sb().from('wochen').select('id').eq('kunde_id', id).eq('gueltig_ab', p.gueltigAb).limit(1)
      : Promise.resolve({ data: [] })
    return Promise.resolve(such).then(function (r) {
      var vorhanden = r && r.data && r.data[0] ? r.data[0].id : null
      var q = vorhanden ? sb().from('wochen').update(zeile).eq('id', vorhanden) : sb().from('wochen').insert(zeile)
      return Promise.resolve(q).then(function (x) { if (x.error) throw x.error; return { aktualisiert: !!vorhanden, zeile: zeile } })
    })
  }
  /* gespeicherte Woche → Tage-Zustand (Gericht aus Bibliothek, wenn Name passt) */
  function tageAusWoche (woche, liste) {
    var tage = {}
    TAGE.forEach(function (t) {
      var e = woche.gerichte && woche.gerichte[t] && woche.gerichte[t][0]
      if (!e) { tage[t] = null; return }
      var treffer = (liste || []).filter(function (g) { return g.text === e.name })[0]
      tage[t] = treffer
        ? { schluessel: treffer.schluessel, text: treffer.text, preis: e.preis || treffer.preis, bild: treffer.bild }
        : { schluessel: '', text: e.name, preis: e.preis || '', bild: e.bild || '' }
    })
    return tage
  }

  /* Positionen aus dem Admin-Editor – wie die alte Seite: Supabase (falls lesbar) sonst Browser-Speicher */
  function ladeOverrides () {
    var key = 'layoutOverrides_' + kundeKey(), id = kundeId()
    var lokal = lsLesen(key, {})
    if (!id) return Promise.resolve(lokal)
    return Promise.resolve(sb().from('generator_configs').select('layout_positions').eq('kunde_id', id).limit(1))
      .then(function (r) {
        var p = r && r.data && r.data[0] && r.data[0].layout_positions
        if (p) { lsSchreiben(key, p); return p }
        return lokal
      }).catch(function () { return lokal })
  }

  window.MPMittagDaten = {
    ladeOverrides: ladeOverrides,
    TAGE: TAGE, TAG_NAMEN: TAG_NAMEN,
    kundeKey: kundeKey, kundeId: kundeId, kundeName: kundeName, link: link, esc: esc, slug: slug,
    ladeGerichte: ladeGerichte, uebernehmeInBibliothek: uebernehmeInBibliothek, speichereGericht: speichereGericht,
    blendeAus: blendeAus, ladeFotoHoch: ladeFotoHoch, komprimiereFoto: komprimiereFoto,
    tabelleFehlt: function () { return tabelleFehlt },
    wocheAus: wocheAus, parseLabel: parseLabel, montagVon: montagVon, plus: plus, iso: iso, dmy: dmy,
    ladeWochen: ladeWochen, speichereWoche: speichereWoche, gerichteFuerWoche: gerichteFuerWoche, tageAusWoche: tageAusWoche,
    bildFuerSeite: bildFuerSeite, bildFuerWoche: bildFuerWoche, lsLesen: lsLesen, lsSchreiben: lsSchreiben
  }
})()
