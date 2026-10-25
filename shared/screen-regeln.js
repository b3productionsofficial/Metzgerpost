/* ══════════════════════════════════════════════════════════════
   MetzgerPost – Regeln der Bildschirme (eine Quelle für alle)

   Reine Funktionen ohne Netzwerk/DOM: Die TV-Bildschirme (screen*-v2.html)
   und die Vorschau im Display Manager rechnen damit – dadurch zeigt die
   Vorschau garantiert dasselbe wie der Fernseher.
   Regel-Nummern (S1-xx, S2-xx …) siehe docs/REGELN.md; Tests: tests/regeln/.

   Läuft im Browser (window.MPRegeln) und in Node (module.exports).
══════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  else root.MPRegeln = api
})(typeof self !== 'undefined' ? self : this, function () {
  var TAGE    = ['dienstag', 'mittwoch', 'donnerstag', 'freitag']
  var DAY_MAP = { 2: 'dienstag', 3: 'mittwoch', 4: 'donnerstag', 5: 'freitag' }
  var MT_TAGE_STANDARD = [1, 2, 3, 4, 5]   // wenn im Display Manager nichts gespeichert ist
  var TAKT_SCREEN1 = 10

  /* ── Datum ── */
  function pad (n) { return (n < 10 ? '0' : '') + n }
  function isoAus (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  function ausIso (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12) }
  function ohneZeit (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12) }
  function montagVon (d) { var x = ohneZeit(d); var w = x.getDay(); x.setDate(x.getDate() - (w === 0 ? 6 : w - 1)); return x }
  function plusTage (d, n) { var x = ohneZeit(d); x.setDate(x.getDate() + n); return x }
  function kwVon (d) {
    var dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7))
    var y1 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1))
    return { kw: Math.ceil((((dt - y1) / 86400000) + 1) / 7), jahr: dt.getUTCFullYear() }
  }

  /* ── S1-02: Woche, die zu einem Montag gehört (gueltig_ab in dieser Woche, sonst KW/Jahr) ── */
  function wocheFuer (wochen, montag) {
    var ziel = isoAus(montag)
    for (var i = 0; i < wochen.length; i++) {
      var w = wochen[i]
      if (w && w.gueltig_ab && isoAus(montagVon(ausIso(w.gueltig_ab))) === ziel) return w
    }
    var k = kwVon(montag)
    for (var j = 0; j < wochen.length; j++) {
      var x = wochen[j]
      if (x && !x.gueltig_ab && x.kw === k.kw && x.jahr === k.jahr) return x
    }
    return null
  }

  /* ── S1-02/03/04: Welche Woche gilt heute? Mo–Fr diese, Sa/So nächste (falls vorhanden) ── */
  function aktiveWoche (wochen, heute) {
    wochen = wochen || []
    var mo = montagVon(heute), tag = heute.getDay()
    if (tag === 6 || tag === 0) {
      var n = wocheFuer(wochen, plusTage(mo, 7))
      if (n) return { woche: n, naechste: true }
    }
    var w = wocheFuer(wochen, mo)
    return w ? { woche: w, naechste: false } : null
  }

  /* ── S1-05: Welcher Tag ist groß? Heute (Di–Fr), sonst der erste Tag mit Gericht ── */
  function layoutTag (gerichte, tag, naechste) {
    gerichte = gerichte || {}
    var key = naechste ? null : DAY_MAP[tag]
    if (key && gerichte[key] && gerichte[key][0]) return key
    for (var i = 0; i < TAGE.length; i++) if (gerichte[TAGE[i]] && gerichte[TAGE[i]][0]) return TAGE[i]
    return 'dienstag'
  }

  /* ── S1-08: Sonderlayouts für heute (Datum zuerst, dann Wochentage; pausierte nie) ── */
  function sonderHeute (layouts, heute) {
    var iso = isoAus(heute), tag = heute.getDay(), datum = [], wochentage = []
    ;(layouts || []).forEach(function (l) {
      if (!l || !l.bild || l.aktiv === false) return
      if (l.type === 'datum' && l.datum === iso) datum.push(l)
      else if (l.type === 'wochentage' && l.wochentage && l.wochentage.indexOf(tag) >= 0) wochentage.push(l)
    })
    return datum.concat(wochentage)
  }

  /* ── S1-09/S2-02/S3-02: Gilt ein Angebot heute auf diesem Bildschirm? ── */
  function angebotGilt (a, screen, heuteIso) {
    return !!(a && a.status === 'aktiv' && a.render_tv_url && (a.screens || []).indexOf(screen) >= 0 &&
      a.gueltig_von <= heuteIso && a.gueltig_bis >= heuteIso)
  }

  /* ── S1-10/S2-02: Basis-Folien und Angebote mischen: B1, A1, B2, A2, B3, A1 … ── */
  function mische (basis, angebote) {
    if (!angebote.length) return basis.slice()
    if (!basis.length) return angebote.slice()
    var liste = []
    for (var i = 0; i < basis.length; i++) { liste.push(basis[i]); liste.push(angebote[i % angebote.length]) }
    for (var k = basis.length; k < angebote.length; k++) liste.push(angebote[k])
    return liste
  }

  function angebotFolie (a) { return { art: 'bild', typ: 'angebot', key: 'a:' + a.id + ':' + a.updated_at, src: a.render_tv_url, titel: a.titel || 'Angebot' } }

  /* ══ Bildschirm 1: Mittagstisch + Sonderlayouts + Angebote ══
     d = { screen1: content der displays-Zeile 'screen1', sonder: content 'sonder_configs',
           mtSettings: content 'mt_settings', wochen: [...], angebote: [...] (dürfen ungefiltert sein) } */
  function playlistScreen1 (d, heute) {
    var tag = heute.getDay(), iso = isoAus(heute), info = [], basis = []
    var disp = d.screen1 || null

    // S1-07: Manueller Modus gilt nur am Sendetag – dann nur der Mittagstisch
    var manuell = !!(disp && disp.manualDay && disp.updatedAt && isoAus(new Date(disp.updatedAt)) === iso)
    if (manuell) {
      var mg = disp.gerichte || {}
      var mKey = DAY_MAP[disp.manualDay] || layoutTag(mg, 0, true)
      info.push({ regel: 'S1-07', text: 'Manueller Modus (heute gesendet) – nur Mittagstisch, ' + mKey })
      return { liste: [{ art: 'mt', typ: 'mittagstisch', key: 'mt:manuell:' + JSON.stringify(disp), titel: 'Mittagstisch (manuell)', mt: { layout: mKey, label: disp.woche || '', gerichte: mg } }],
        info: info, manuell: true, takt: TAKT_SCREEN1 }
    }
    if (disp && disp.manualDay) info.push({ regel: 'S1-07', text: 'Manueller Modus abgelaufen → Automatik' })

    // S1-01: nur an Mittagstisch-Tagen
    var mtTage = d.mtSettings && d.mtSettings.tage ? d.mtSettings.tage : MT_TAGE_STANDARD
    if (mtTage.indexOf(tag) >= 0) {
      var aw = aktiveWoche(d.wochen, heute)
      if (aw) {
        var g = aw.woche.gerichte || {}
        var key = layoutTag(g, tag, aw.naechste)
        basis.push({ art: 'mt', typ: 'mittagstisch', titel: 'Mittagstisch ' + (aw.woche.woche_label || ''),
          key: 'mt:' + aw.woche.id + ':' + key + ':' + JSON.stringify(g) + (aw.woche.woche_label || ''),
          mt: { layout: key, label: aw.woche.woche_label || '', gerichte: g } })
        info.push({ regel: aw.naechste ? 'S1-03' : 'S1-02', text: 'Mittagstisch ' + (aw.woche.woche_label || '') + (aw.naechste ? ' (schon die nächste Woche)' : '') + ' · groß: ' + key })
      } else info.push({ regel: 'S1-04', warnung: true, text: 'Für diese Woche ist kein Mittagstisch gespeichert → wird weggelassen' })
    } else info.push({ regel: 'S1-01', text: 'Heute ist kein Mittagstag' })

    var sonder = sonderHeute(d.sonder && d.sonder.layouts, heute)
    sonder.forEach(function (l) { basis.push({ art: 'bild', typ: 'sonder', key: 's:' + l.bild, src: l.bild, titel: l.label || 'Sonderlayout' }) })
    var pausiert = ((d.sonder && d.sonder.layouts) || []).filter(function (l) { return l && l.aktiv === false }).length
    info.push({ regel: 'S1-08', text: sonder.length + ' Sonderlayout' + (sonder.length === 1 ? '' : 's') + (pausiert ? ' (' + pausiert + ' pausiert)' : '') })

    var angebote = (d.angebote || []).filter(function (a) { return angebotGilt(a, 'screen1', iso) }).map(angebotFolie)
    info.push({ regel: 'S1-09', text: angebote.length + ' Angebot' + (angebote.length === 1 ? '' : 'e') })
    return { liste: mische(basis, angebote), info: info, manuell: false, takt: TAKT_SCREEN1 }
  }

  /* ══ Bildschirm 2 und 3: Bilder + Angebote ══
     screen: 'screen2' | 'screen3'; bilder: [{bild,label}], angeboteZuerst: Screen 3 */
  function playlistBilder (screen, bilder, angebote, heute, timer) {
    var iso = isoAus(heute)
    var b = (bilder || []).filter(function (x) { return x && x.bild && x.aktiv !== false })
      .map(function (x) { return { art: 'bild', typ: 'bild', key: 'b:' + x.bild, src: x.bild, titel: x.label || 'Bild' } })
    var a = (angebote || []).filter(function (x) { return angebotGilt(x, screen, iso) }).map(angebotFolie)
    var liste = screen === 'screen3' ? mische(a.length ? a : b, a.length ? b : []) : mische(b, a)
    var standard = screen === 'screen3' ? 10 : 8
    return { liste: liste, takt: Math.max(3, Math.min(120, timer || standard)),
      info: [{ regel: screen === 'screen3' ? 'S3-01' : 'S2-01', text: b.length + ' Bilder, ' + a.length + ' Angebote' }] }
  }

  return {
    TAGE: TAGE, DAY_MAP: DAY_MAP, MT_TAGE_STANDARD: MT_TAGE_STANDARD, TAKT_SCREEN1: TAKT_SCREEN1,
    isoAus: isoAus, ausIso: ausIso, montagVon: montagVon, plusTage: plusTage, kwVon: kwVon,
    wocheFuer: wocheFuer, aktiveWoche: aktiveWoche, layoutTag: layoutTag, sonderHeute: sonderHeute,
    angebotGilt: angebotGilt, mische: mische, playlistScreen1: playlistScreen1, playlistBilder: playlistBilder
  }
})
