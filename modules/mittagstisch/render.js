/* ══════════════════════════════════════════════════════════════
   MetzgerPost – Mittagstisch-Renderer (ohne Formular-Abhängigkeit)

   Zeichnet Story, Feed, Druck-Vorder- und -Rückseite aus einem Zustand statt
   aus Formularfeldern. Zeichen-Logik 1:1 aus script.js übernommen
   (Test: pixelgleich zur alten Seite, tests/regeln/generator_neu_test.py).

   Zustand:
   { kunde: 'sorgundseitz', layout: 'mittagstisch_instagram',
     woche: '27.10.2026 - 30.10.2026',
     tage:   { dienstag: {text, preis, bild}, mittwoch: …, donnerstag: …, freitag: … },
     druck:  { frontDatum, wocheLinks, wocheRechts, rechts: { dienstag: {…}, … } } }
══════════════════════════════════════════════════════════════ */
(function () {
  var TAGE = ['dienstag', 'mittwoch', 'donnerstag', 'freitag']
  var bildCache = {}

  function ladeBild (src) {
    if (!src) return Promise.reject(new Error('Kein Bild angegeben'))
    if (!bildCache[src]) {
      bildCache[src] = new Promise(function (resolve, reject) {
        var img = new Image()
        // Bilder aus Supabase (eigene Vorlagen, Gerichtfotos aus der Bibliothek) liegen auf einer anderen Adresse:
        // ohne crossOrigin wäre das Canvas danach „verunreinigt“ und Download/Vorschau-Kopie würden scheitern.
        if (/^https?:/.test(src) && src.indexOf(location.origin) !== 0) img.crossOrigin = 'anonymous'
        img.onload = function () { resolve(img) }
        img.onerror = function () { delete bildCache[src]; reject(new Error('Bild konnte nicht geladen werden: ' + src)) }
        img.src = src
      })
    }
    return bildCache[src]
  }

  var schriftenGeladen = null
  function schriften () {
    if (!schriftenGeladen) {
      schriftenGeladen = document.fonts && document.fonts.load
        ? Promise.all([
            document.fonts.load("700 60px 'IBM Plex Serif'"),
            document.fonts.load("500 30px 'Raleway'"),
            document.fonts.load("600 30px 'Raleway'")
          ]).catch(function () {})
        : Promise.resolve()
    }
    return schriftenGeladen
  }

  /* ── 1:1 aus script.js ── */
  function drawWrappedText (ctx, text, x, y, maxWidth, lineHeight) {
    var words = String(text || '').split(' ')
    var line = ''
    var lines = []
    for (var i = 0; i < words.length; i++) {
      var testLine = line + words[i] + ' '
      var testWidth = ctx.measureText(testLine).width
      if (testWidth > maxWidth && i > 0) { lines.push(line.trim()); line = words[i] + ' ' }
      else line = testLine
    }
    lines.push(line.trim())
    lines.forEach(function (entry, index) { ctx.fillText(entry, x, y + index * lineHeight) })
  }

  function drawImageCover (ctx, img, cx, cy, radius) {
    var diameter = radius * 2
    var imgRatio = img.width / img.height
    var drawWidth, drawHeight
    if (imgRatio > 1) { drawHeight = diameter; drawWidth = diameter * imgRatio }
    else { drawWidth = diameter; drawHeight = diameter / imgRatio }
    ctx.drawImage(img, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight)
  }

  function drawMeal (ctx, meal, config) {
    if (!meal || !meal.bild) return Promise.resolve()  // leerer Tag: nichts zeichnen (alte Seite brach ab)
    return ladeBild(meal.bild).then(function (img) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(config.imageX, config.imageY, config.imageRadius, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      drawImageCover(ctx, img, config.imageX, config.imageY, config.imageRadius)
      ctx.restore()

      ctx.textAlign = 'center'
      ctx.fillStyle = '#2f2f2f'
      ctx.font = '500 ' + config.textFontSize + "px 'Raleway', Arial, sans-serif"
      drawWrappedText(ctx, meal.text, config.textX, config.textY, config.textMaxWidth, config.textLineHeight)

      ctx.textAlign = 'center'
      ctx.fillStyle = config.priceColor || '#2f2f2f'
      ctx.font = '600 ' + config.priceFontSize + "px 'Raleway', Arial, sans-serif"
      ctx.fillText(meal.preis || '', config.priceX, config.priceY)
    })
  }

  /* Positionen aus dem Admin-Editor (Overrides) über das Standard-Layout legen – wie getFinalLayout() */
  function finalesLayout (kunde, layoutName, formatName, overrides) {
    var layoutsFuerKunde = window.kundenLayouts && window.kundenLayouts[kunde] || (typeof kundenLayouts !== 'undefined' ? kundenLayouts[kunde] : null)
    if (!layoutsFuerKunde || !layoutsFuerKunde[layoutName] || !layoutsFuerKunde[layoutName][formatName]) {
      throw new Error('Kein Layout „' + layoutName + '/' + formatName + '“ für Kunde „' + kunde + '“.')
    }
    var standard = JSON.parse(JSON.stringify(layoutsFuerKunde[layoutName][formatName]))
    var fo = (overrides && overrides[layoutName] && overrides[layoutName][formatName]) || {}
    function merge (ziel, quelle) { Object.keys(quelle || {}).forEach(function (k) { if (ziel[k]) ziel[k] = Object.assign({}, ziel[k], quelle[k]) }) }
    if (standard.meals) { merge(standard.meals, fo.meals); if (fo.woche) standard.woche = Object.assign({}, standard.woche, fo.woche) }
    if (standard.datum && fo.datum) standard.datum = Object.assign({}, standard.datum, fo.datum)
    ;['links', 'rechts'].forEach(function (seite) {
      if (!standard[seite]) return
      var so = fo[seite] || {}
      if (so.woche) standard[seite].woche = Object.assign({}, standard[seite].woche, so.woche)
      if (standard[seite].meals) merge(standard[seite].meals, so.meals)
    })
    if (standard.tage) merge(standard.tage, fo.tage)
    // eigene Hintergrund-Vorlage (Seite „Vorlagen“): ersetzt nur das Bild, Größe bleibt gleich
    if (fo.template) standard.template = fo.template
    return standard
  }

  function render (canvas, formatName, zustand, overrides) {
    var layout = finalesLayout(zustand.kunde, zustand.layout, formatName, overrides)
    if (!layout.template) throw new Error('Im Layout fehlt template.')
    return schriften().then(function () { return ladeBild(layout.template) }).then(function (template) {
      canvas.width = layout.width
      canvas.height = layout.height
      var ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(template, 0, 0, canvas.width, canvas.height)
      var d = zustand.druck || {}

      if (formatName === 'front') {
        ctx.textAlign = 'center'
        ctx.fillStyle = '#111111'
        ctx.font = '700 ' + layout.datum.fontSize + "px 'IBM Plex Serif', Georgia, serif"
        ctx.fillText(d.frontDatum != null ? d.frontDatum : (zustand.woche || ''), layout.datum.x, layout.datum.y)
        return canvas
      }
      if (formatName === 'back') {
        ctx.textAlign = 'center'
        ctx.fillStyle = '#111111'
        ctx.font = '700 ' + layout.links.woche.fontSize + "px 'IBM Plex Serif', Georgia, serif"
        ctx.fillText(d.wocheLinks != null ? d.wocheLinks : (zustand.woche || ''), layout.links.woche.x, layout.links.woche.y)
        ctx.font = '700 ' + layout.rechts.woche.fontSize + "px 'IBM Plex Serif', Georgia, serif"
        ctx.fillText(d.wocheRechts || '', layout.rechts.woche.x, layout.rechts.woche.y)
        var kette = Promise.resolve()
        TAGE.forEach(function (t) { kette = kette.then(function () { return drawMeal(ctx, (zustand.tage || {})[t], layout.links.meals[t]) }) })
        TAGE.forEach(function (t) { kette = kette.then(function () { return drawMeal(ctx, (d.rechts || {})[t], layout.rechts.meals[t]) }) })
        return kette.then(function () { return canvas })
      }
      if (!layout.woche || !layout.meals) throw new Error('Layout „' + zustand.layout + '“ (' + formatName + ') ist nicht für den Mittagstisch vorbereitet.')
      ctx.textAlign = 'center'
      ctx.fillStyle = '#111111'
      ctx.font = '700 ' + layout.woche.fontSize + "px 'IBM Plex Serif', Georgia, serif"
      ctx.fillText(zustand.woche || '', layout.woche.x, layout.woche.y)
      var k = Promise.resolve()
      TAGE.forEach(function (t) { k = k.then(function () { return drawMeal(ctx, (zustand.tage || {})[t], layout.meals[t]) }) })
      return k.then(function () { return canvas })
    })
  }

  /* Instagram-Text – identisch zu generateCaption() */
  function caption (zustand) {
    var t = zustand.tage || {}
    var n = function (k) { return (t[k] && t[k].text) || '' }
    return 'Unser Mittagstisch diese Woche 🍽️\n\n' + (zustand.woche || '') + '\n\nDienstag\n' + n('dienstag') + '\n\nMittwoch\n' + n('mittwoch') +
      '\n\nDonnerstag\n' + n('donnerstag') + '\n\nFreitag\n' + n('freitag') + '\n\nWir freuen uns auf euren Besuch!\n\n#mittagstisch #metzgerei #regional'
  }

  window.MPMittagRender = { render: render, caption: caption, finalesLayout: finalesLayout, ladeBild: ladeBild, TAGE: TAGE }
})()
