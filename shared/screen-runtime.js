/* ══════════════════════════════════════════════════════════════
   MetzgerPost – gemeinsame Laufzeit für alle TV-Bildschirme
   (Screen 1 v2, Screen 2 v2; Screen 3 v2 folgt)

   Kümmert sich um alles, was jeder Bildschirm braucht:
   - Verbindung zu Supabase (mit Wiederholung, falls die Bibliothek nicht lädt)
   - Abgleich: beim Start, alle 5 Minuten, per Realtime, nach Mitternacht,
     wenn das Gerät wieder online ist und wenn die Seite sichtbar wird
   - Realtime mit automatischer Wiederverbindung
   - nächtlicher Neustart (nur wenn online)
   - Bilder vorladen (jedes Bild nur einmal)
   - Test-Parameter: &datum=YYYY-MM-DD, &debug=1
   - Doppelklick = Vollbild, Mauszeiger ausblenden

   Nutzung:
     MPScreen.start({
       name: 'screen2',
       tabellen: ['screen2_config', 'angebote'],     // Realtime-Tabellen (Filter kunde_id)
       holeDaten: function (sb, ctx) { return Promise },
       signatur:  function (daten) { return 'string' }, // gleiche Signatur = nichts tun
       anzeigen:  function (daten, ctx) { return Promise|undefined },
       debugText: function (daten, ctx) { return 'string' }
     })
══════════════════════════════════════════════════════════════ */
(function () {
  var SUPABASE_URL  = 'https://jfrqbchgrpixwlecerax.supabase.co'
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnFiY2hncnBpeHdsZWNlcmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODk5NDksImV4cCI6MjA5MDE2NTk0OX0.AnSqi2rJ46PN8dm6zMUgRDNMdXlwRRaES4JQ4Fozn10'
  var RESYNC_MS     = 5 * 60 * 1000
  var RELOAD_STUNDE = 3

  var params     = new URLSearchParams(location.search)
  var KUNDE_ID   = params.get('kunde') || 'demo'
  var TEST_DATUM = /^\d{4}-\d{2}-\d{2}$/.test(params.get('datum') || '') ? params.get('datum') : null
  var DEBUG      = params.get('debug') === '1'

  function pad (n) { return (n < 10 ? '0' : '') + n }
  function isoAus (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  /* „Heute“ als lokales Datum (mit Test-Datum überschreibbar) */
  function heute () {
    if (TEST_DATUM) { var p = TEST_DATUM.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0) }
    return new Date()
  }
  function heuteIso () { return isoAus(heute()) }

  /* ── Bilder vorladen: jedes Bild nur einmal, Fehler werden später erneut versucht ── */
  var bildCache = {}
  function vorladen (src) {
    if (!src) return Promise.resolve(false)
    if (!bildCache[src]) {
      bildCache[src] = new Promise(function (resolve) {
        var img = new Image()
        img.onload = function () { resolve(true) }
        img.onerror = function () { delete bildCache[src]; resolve(false) }
        img.src = src
      })
    }
    return bildCache[src]
  }

  function debugAnzeigen (text) {
    if (!DEBUG) return
    var el = document.getElementById('mp-debug')
    if (!el) {
      el = document.createElement('div')
      el.id = 'mp-debug'
      el.style.cssText = 'position:fixed;top:8px;left:8px;z-index:99999;background:rgba(0,0,0,.75);color:#fff;font:12px/1.4 monospace;padding:6px 8px;border-radius:4px;white-space:pre;pointer-events:none'
      document.body.appendChild(el)
    }
    el.textContent = text
  }

  /* Mauszeiger nach 3 s ausblenden, Doppelklick = Vollbild */
  function bedienung () {
    var t
    function zeige () {
      document.body.style.cursor = ''
      clearTimeout(t)
      t = setTimeout(function () { document.body.style.cursor = 'none' }, 3000)
    }
    document.addEventListener('mousemove', zeige)
    zeige()
    document.addEventListener('dblclick', function () {
      var el = document.documentElement
      if (el.requestFullscreen) el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    })
  }

  function start (opt) {
    var sb = null
    var signatur = null
    var syncLaeuft = false
    var nochmal = false
    var letzterSync = null
    var letzterGrund = ''
    var letzteDaten = null
    var kanal = null
    var reconnectVersuch = 0
    var ctx = { kundeId: KUNDE_ID, heute: heute, heuteIso: heuteIso, isoAus: isoAus, vorladen: vorladen, debug: DEBUG, testDatum: TEST_DATUM }

    function zeigeDebug (fehler) {
      if (!DEBUG) return
      var zeilen = [opt.name + '  kunde ' + KUNDE_ID + '  datum ' + heuteIso() + (TEST_DATUM ? ' (Test)' : '')]
      if (letzteDaten && opt.debugText) zeilen.push(opt.debugText(letzteDaten, ctx))
      zeilen.push('letzter Abgleich ' + (letzterSync ? letzterSync.toLocaleTimeString('de-DE') : '–') + ' (' + letzterGrund + ')')
      if (fehler) zeilen.push('⚠ ' + fehler)
      debugAnzeigen(zeilen.join('\n'))
    }

    function sync (grund) {
      if (!sb) return
      if (syncLaeuft) { nochmal = true; return }
      syncLaeuft = true
      letzterGrund = grund
      Promise.resolve()
        .then(function () { return opt.holeDaten(sb, ctx) })
        .then(function (daten) {
          letzterSync = new Date()
          var neu = opt.signatur(daten)
          if (neu === signatur) return
          letzteDaten = daten
          return Promise.resolve(opt.anzeigen(daten, ctx)).then(function (vollstaendig) {
            // false = nicht alles geladen (z. B. ein Bild fehlte) → beim nächsten Abgleich erneut
            signatur = vollstaendig === false ? null : neu
          })
        })
        .then(function () { zeigeDebug() }, function (e) {
          // offline o. ä.: aktuelle Anzeige einfach weiterlaufen lassen
          if (window.console) console.warn('[' + opt.name + '] Abgleich fehlgeschlagen (' + grund + '):', e && e.message)
          if (opt.fehler) opt.fehler(e)
          zeigeDebug(e && e.message)
        })
        .then(function () {
          syncLaeuft = false
          if (nochmal) { nochmal = false; sync('nachgeholt') }
        })
    }

    function verbindeRealtime () {
      if (!sb || !opt.tabellen || !opt.tabellen.length) return
      try {
        if (kanal) sb.removeChannel(kanal)
        kanal = sb.channel(opt.name + '-' + KUNDE_ID + '-' + Date.now())
        opt.tabellen.forEach(function (tab) {
          kanal = kanal.on('postgres_changes', { event: '*', schema: 'public', table: tab, filter: 'kunde_id=eq.' + KUNDE_ID },
            function () { sync('realtime ' + tab) })
        })
        kanal.subscribe(function (status) {
          if (status === 'SUBSCRIBED') { reconnectVersuch = 0; return }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            reconnectVersuch++
            setTimeout(verbindeRealtime, Math.min(300, 5 * Math.pow(2, reconnectVersuch)) * 1000)
          }
        })
      } catch (e) { /* Polling übernimmt */ }
    }

    function planeTageswechsel () {
      var jetzt = new Date()
      var mitternacht = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + 1, 0, 0, 30)
      setTimeout(function () { sync('mitternacht'); planeTageswechsel() }, mitternacht - jetzt)
    }
    function planeNeustart () {
      var jetzt = new Date()
      var ziel = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() + (jetzt.getHours() >= RELOAD_STUNDE ? 1 : 0),
        RELOAD_STUNDE, Math.floor(Math.random() * 20), 0)
      setTimeout(function () {
        if (navigator.onLine === false) { setTimeout(planeNeustart, 60 * 60 * 1000); return } // offline: leerer Bildschirm vermeiden
        location.reload()
      }, ziel - jetzt)
    }

    function los () {
      bedienung()
      if (!window.supabase || !window.supabase.createClient) {
        // Bibliothek nicht geladen (z. B. kurz kein Internet beim Einschalten): in 1 Minute neu versuchen
        if (opt.fehler) opt.fehler(new Error('Supabase nicht geladen'))
        debugAnzeigen('Supabase-Bibliothek nicht geladen – neuer Versuch in 60 s')
        setTimeout(function () { location.reload() }, 60000)
        return
      }
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
      ctx.sb = sb
      sync('start')
      verbindeRealtime()
      setInterval(function () { sync('intervall') }, RESYNC_MS)
      window.addEventListener('online', function () { sync('wieder online'); verbindeRealtime() })
      document.addEventListener('visibilitychange', function () { if (!document.hidden) sync('sichtbar') })
      planeTageswechsel()
      planeNeustart()
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los)
    else los()

    return { sync: sync, ctx: ctx }
  }

  /* Angebote (heute gültig, aktiv, für diesen Bildschirm) – Fehler stoppen den Bildschirm nie */
  function holeAngebote (sb, screen) {
    var h = heuteIso()
    return Promise.resolve(sb.from('angebote')
      .select('id,titel,render_tv_url,gueltig_von,gueltig_bis,updated_at')
      .eq('kunde_id', KUNDE_ID).eq('status', 'aktiv')
      .contains('screens', [screen])
      .lte('gueltig_von', h).gte('gueltig_bis', h)
      .order('gueltig_von', { ascending: true }))
      .then(function (r) { return r.error ? [] : (r.data || []).filter(function (a) { return a.render_tv_url }) },
            function () { return [] })
  }

  /* Basis-Folien und Angebote mischen: B1, A1, B2, A2, B3, A1 … (Angebote wiederholen sich) */
  function mische (basis, angebote) {
    if (!angebote.length) return basis.slice()
    if (!basis.length) return angebote.slice()
    var liste = []
    for (var i = 0; i < basis.length; i++) {
      liste.push(basis[i])
      liste.push(angebote[i % angebote.length])
    }
    // jedes Angebot mindestens einmal pro Runde
    for (var k = basis.length; k < angebote.length; k++) liste.push(angebote[k])
    return liste
  }

  window.MPScreen = {
    start: start, holeAngebote: holeAngebote, mische: mische, vorladen: vorladen,
    heute: heute, heuteIso: heuteIso, isoAus: isoAus, kundeId: KUNDE_ID, debug: DEBUG
  }
})()
