/* ══════════════════════════════════════════════
   MetzgerPost — Angebote Renderer
   Zeichnet eine Angebotsfolie (TV / Feed / Story) auf ein Canvas.
   Positionen kommen aus der Vorlage (vorlagen/<kunde>/<vorlage>.json),
   die Inhalte aus dem Angebot. Keine Abhängigkeiten.
══════════════════════════════════════════════ */
(function () {
  'use strict'

  const EINHEITEN = { kg: 'kg', '100g': '100 g', stueck: 'Stück' }
  const MONATE = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

  /* ── Formatierung ── */
  function formatPreis(wert) {
    if (wert === null || wert === undefined || wert === '') return ''
    const n = typeof wert === 'number' ? wert : parseFloat(String(wert).replace(',', '.'))
    if (!isFinite(n)) return ''
    return n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  function einheitText(einheit) {
    return '€ pro ' + (EINHEITEN[einheit] || 'kg')
  }

  // ISO-Datum (YYYY-MM-DD) als lokales Datum lesen, ohne Zeitzonen-Verschiebung
  function parseDatum(iso) {
    if (iso instanceof Date) return iso
    const [j, m, t] = String(iso).slice(0, 10).split('-').map(Number)
    return new Date(j, m - 1, t)
  }

  function formatZeitraum(von, bis) {
    if (!von || !bis) return ''
    const a = parseDatum(von), b = parseDatum(bis)
    const tag = d => String(d.getDate()).padStart(2, '0') + '. ' + MONATE[d.getMonth()]
    if (a.getFullYear() !== b.getFullYear()) {
      return 'vom ' + tag(a) + ' ' + a.getFullYear() + ' - ' + tag(b) + ' ' + b.getFullYear()
    }
    return 'vom ' + tag(a) + ' - ' + tag(b) + ' ' + b.getFullYear()
  }

  /* ── Bilder ── */
  const _cache = new Map()
  function ladeBild(src) {
    if (!src) return Promise.resolve(null)
    if (_cache.has(src)) return _cache.get(src)
    const p = new Promise(resolve => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => { _cache.delete(src); resolve(null) }
      img.src = src
    })
    _cache.set(src, p)
    return p
  }

  /* ── Schriften ── */
  async function ladeSchriften(vorlage) {
    if (!document.fonts || !document.fonts.load) return
    const s = vorlage.schriften || {}
    try {
      await Promise.all([
        document.fonts.load('800 100px "' + (s.preis || 'Montserrat') + '"'),
        document.fonts.load('700 100px "' + (s.preis || 'Montserrat') + '"'),
        document.fonts.load('700 100px "' + (s.text || 'IBM Plex Serif') + '"')
      ])
    } catch (e) { /* Fallback-Schrift wird verwendet */ }
  }

  /* ── Zeichen-Helfer ── */
  function kreis(ctx, k, farbe, deckkraft) {
    ctx.save()
    if (deckkraft !== undefined) ctx.globalAlpha = deckkraft
    ctx.fillStyle = farbe
    ctx.beginPath()
    ctx.arc(k.x + k.d / 2, k.y + k.d / 2, k.d / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function font(gewicht, groesse, familie) {
    return gewicht + ' ' + groesse + 'px "' + familie + '", sans-serif'
  }

  // Schriftgröße so weit verkleinern, bis der Text in maxW passt
  function passendeGroesse(ctx, text, gewicht, start, familie, maxW, minimum) {
    let g = start
    ctx.font = font(gewicht, g, familie)
    while (g > (minimum || 10) && ctx.measureText(text).width > maxW) {
      g -= 2
      ctx.font = font(gewicht, g, familie)
    }
    return g
  }

  function textZentriert(ctx, text, box, gewicht, groesse, familie, farbe, durchgestrichen) {
    ctx.save()
    ctx.font = font(gewicht, groesse, familie)
    ctx.fillStyle = farbe
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    const cx = box.x + box.w / 2
    ctx.fillText(text, cx, box.y)
    if (durchgestrichen) {
      const w = ctx.measureText(text).width
      const y = box.y + groesse * 0.52
      ctx.strokeStyle = farbe
      ctx.lineWidth = Math.max(2, groesse * 0.07)
      ctx.beginPath()
      ctx.moveTo(cx - w / 2, y)
      ctx.lineTo(cx + w / 2, y)
      ctx.stroke()
    }
    ctx.restore()
  }

  // Zeilenumbruch nach Wörtern; liefert Zeilen
  function umbrechen(ctx, text, maxW) {
    const woerter = String(text).trim().split(/\s+/)
    const zeilen = []
    let zeile = ''
    for (const w of woerter) {
      const test = zeile ? zeile + ' ' + w : w
      if (ctx.measureText(test).width <= maxW || !zeile) zeile = test
      else { zeilen.push(zeile); zeile = w }
    }
    if (zeile) zeilen.push(zeile)
    return zeilen
  }

  // Text mit max. Zeilen; verkleinert die Schrift, bis es passt.
  // reserve: Platz, der darunter noch frei bleiben muss (z. B. für den Zeitraum),
  // box.maxUnten: unterste erlaubte Kante des ganzen Blocks.
  function textBlock(ctx, text, box, familie, farbe, reserve) {
    let g = box.groesse
    const maxZ = box.maxZeilen || 2
    const zh = box.zeilenhoehe || 1.4
    let zeilen
    // Zuerst versuchen, den Text einzeilig zu halten (bis box.einzeiligMin), erst dann umbrechen
    if (box.einzeiligMin) {
      for (let e = box.groesse; e >= box.einzeiligMin; e -= 2) {
        ctx.font = font(700, e, familie)
        if (ctx.measureText(String(text).trim()).width <= box.w) { g = e; zeilen = [String(text).trim()]; break }
      }
    }
    if (!zeilen) for (;;) {
      ctx.font = font(700, g, familie)
      zeilen = umbrechen(ctx, text, box.w)
      const zuBreit = zeilen.some(z => ctx.measureText(z).width > box.w)
      const zuHoch = box.maxUnten !== undefined &&
        box.y + zeilen.length * g * zh + (reserve || 0) > box.maxUnten
      if ((zeilen.length <= maxZ && !zuBreit && !zuHoch) || g <= (box.minGroesse || 24)) break
      g -= 2
    }
    if (zeilen.length > maxZ) {
      zeilen = zeilen.slice(0, maxZ)
      let letzte = zeilen[maxZ - 1]
      while (letzte.length > 1 && ctx.measureText(letzte + '…').width > box.w) letzte = letzte.slice(0, -1)
      zeilen[maxZ - 1] = letzte.replace(/[\s,]+$/, '') + '…'
    }
    const lh = g * (box.zeilenhoehe || 1.4)
    ctx.save()
    ctx.fillStyle = farbe
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    // Canva setzt die erste Zeile mit halbem Zeilenabstand oben
    const oben = (lh - g) / 2
    zeilen.forEach((z, i) => ctx.fillText(z, box.x, box.y + oben + i * lh))
    ctx.restore()
    return box.y + zeilen.length * lh
  }

  function foto(ctx, img, f) {
    const cx = f.x + f.d / 2, cy = f.y + f.d / 2, r = f.d / 2
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    if (img) {
      // "cover": Bild füllt den Kreis, mittig zugeschnitten
      const s = Math.max(f.d / img.width, f.d / img.height)
      const w = img.width * s, h = img.height * s
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
    } else {
      ctx.fillStyle = '#d9d4cc'
      ctx.fillRect(f.x, f.y, f.d, f.d)
      ctx.fillStyle = '#8a8070'
      ctx.font = font(700, Math.round(f.d / 14), 'IBM Plex Serif')
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Kein Foto', cx, cy)
    }
    ctx.restore()
    if (f.rand) {
      ctx.save()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = f.rand
      ctx.beginPath()
      ctx.arc(cx, cy, r - f.rand / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  /* ── Hauptfunktion ──
     canvas:  HTMLCanvasElement
     vorlage: geparste preis-angebot.json
     format:  'tv' | 'feed' | 'story'
     angebot: { titel, preis, einheit, streichpreis, gueltig_von, gueltig_bis, bild_url }
     basis:   URL-Ordner der Vorlage (für den Hintergrund), z. B. 'vorlagen/sorgundseitz/' */
  async function render(canvas, vorlage, format, angebot, basis) {
    const L = vorlage.formate[format]
    if (!L) throw new Error('Unbekanntes Format: ' + format)
    const F = vorlage.farben
    const S = vorlage.schriften
    canvas.width = L.breite
    canvas.height = L.hoehe
    const ctx = canvas.getContext('2d')

    const [bg, bild] = await Promise.all([
      ladeBild((basis || '') + L.hintergrund),
      ladeBild(angebot.bild_url),
      ladeSchriften(vorlage)
    ])

    // 1. Hintergrund
    if (bg) ctx.drawImage(bg, 0, 0, L.breite, L.hoehe)
    else { ctx.fillStyle = '#e8e6e1'; ctx.fillRect(0, 0, L.breite, L.hoehe) }

    // 2. Produktfoto
    foto(ctx, bild, L.foto)

    // 3. Großer Kreis mit Preis
    kreis(ctx, L.grosserKreis, F.kreis)
    const preisText = formatPreis(angebot.preis)
    if (preisText) {
      const g = passendeGroesse(ctx, preisText, L.preis.gewicht, L.preis.groesse, S.preis, L.preis.maxW, 40)
      // bei verkleinerter Schrift vertikal nachzentrieren
      const versatz = (L.preis.groesse - g) / 2
      textZentriert(ctx, preisText, { x: L.preis.x, y: L.preis.y + versatz, w: L.preis.w },
        L.preis.gewicht, g, S.preis, F.dunkelgruen)
    }
    textZentriert(ctx, einheitText(angebot.einheit), L.einheit, L.einheit.gewicht,
      passendeGroesse(ctx, einheitText(angebot.einheit), L.einheit.gewicht, L.einheit.groesse, S.preis, L.grosserKreis.d * 0.7, 20),
      S.preis, F.weiss)

    // 4. Kleiner Kreis mit Streichpreis – nur wenn vorhanden
    const alt = formatPreis(angebot.streichpreis)
    if (alt) {
      kreis(ctx, L.kleinerSchatten, F.schatten, L.kleinerSchatten.deckkraft)
      kreis(ctx, L.kleinerKreis, F.kreis)
      textZentriert(ctx, 'statt', L.statt, L.statt.gewicht, L.statt.groesse, S.preis, F.weiss)
      const altText = alt + ' €'
      const g = passendeGroesse(ctx, altText, L.alterPreis.gewicht, L.alterPreis.groesse, S.preis, L.alterPreis.maxW, 20)
      textZentriert(ctx, altText, { x: L.alterPreis.x, y: L.alterPreis.y + (L.alterPreis.groesse - g) / 2, w: L.alterPreis.w },
        L.alterPreis.gewicht, g, S.preis, F.dunkelgruen, true)
    }

    // 5. Produktname + Zeitraum
    const zr = formatZeitraum(angebot.gueltig_von, angebot.gueltig_bis)
    const reserve = zr ? (L.zeitraum.abstand || 0) + L.zeitraum.groesse * (L.zeitraum.zeilenhoehe || 1.4) : 0
    const nameEnde = textBlock(ctx, angebot.titel || '', L.name, S.text, F.text, reserve)
    if (zr) {
      textBlock(ctx, zr, {
        x: L.zeitraum.x, y: nameEnde + (L.zeitraum.abstand || 0), w: L.zeitraum.w,
        groesse: L.zeitraum.groesse, zeilenhoehe: L.zeitraum.zeilenhoehe,
        maxZeilen: L.zeitraum.maxZeilen || 1, minGroesse: Math.round(L.zeitraum.groesse * 0.75)
      }, S.text, F.text)
    }
    return canvas
  }

  function alsBlob(canvas, typ, qualitaet) {
    return new Promise(resolve => canvas.toBlob(resolve, typ || 'image/jpeg', qualitaet || 0.95))
  }

  window.MPAngebotRenderer = { render, alsBlob, formatPreis, formatZeitraum, einheitText, parseDatum, ladeBild }
})()
