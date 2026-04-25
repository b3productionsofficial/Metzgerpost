



const basisLayoutKlassisch = {
  feed: {
    woche: { x: 1200, y: 340, fontSize: 90 },
    meals: {
      dienstag: {
        imageX: 610, imageY: 930, imageRadius: 180,
        textX: 640, textY: 1266, textMaxWidth: 520, textLineHeight: 50,
        priceX: 640, priceY: 1560, priceColor: "#ffffff",
        textFontSize: 50, priceFontSize: 52
      },
      mittwoch: {
        imageX: 1535, imageY: 930, imageRadius: 180,
        textX: 1530, textY: 1265, textMaxWidth: 520, textLineHeight: 50,
        priceX: 1535, priceY: 1560, priceColor: "#2f2f2f",
        textFontSize: 50, priceFontSize: 52
      },
      donnerstag: {
        imageX: 610, imageY: 1775, imageRadius: 180,
        textX: 640, textY: 2125, textMaxWidth: 520, textLineHeight: 50,
        priceX: 640, priceY: 2360, priceColor: "#2f2f2f",
        textFontSize: 50, priceFontSize: 52
      },
      freitag: {
        imageX: 1530, imageY: 1775, imageRadius: 180,
        textX: 1540, textY: 2125, textMaxWidth: 520, textLineHeight: 48,
        priceX: 1535, priceY: 2360, priceColor: "#ffffff",
        textFontSize: 50, priceFontSize: 52
      }
    }
  },

  story: {
    woche: { x: 540, y: 355, fontSize: 38 },
    meals: {
      dienstag: {
        imageX: 270, imageY: 755, imageRadius: 120,
        textX: 270, textY: 845, textMaxWidth: 240, textLineHeight: 30,
        priceX: 270, priceY: 965, priceColor: "#ffffff",
        textFontSize: 22, priceFontSize: 24
      },
      mittwoch: {
        imageX: 810, imageY: 755, imageRadius: 120,
        textX: 810, textY: 845, textMaxWidth: 240, textLineHeight: 30,
        priceX: 810, priceY: 965, priceColor: "#2f2f2f",
        textFontSize: 22, priceFontSize: 24
      },
      donnerstag: {
        imageX: 270, imageY: 1265, imageRadius: 120,
        textX: 270, textY: 1355, textMaxWidth: 240, textLineHeight: 30,
        priceX: 270, priceY: 1475, priceColor: "#2f2f2f",
        textFontSize: 22, priceFontSize: 24
      },
      freitag: {
        imageX: 810, imageY: 1265, imageRadius: 120,
        textX: 810, textY: 1355, textMaxWidth: 240, textLineHeight: 30,
        priceX: 810, priceY: 1475, priceColor: "#ffffff",
        textFontSize: 22, priceFontSize: 24
      }
    }
  }
}



function getAktuellerKunde() {
  const params = new URLSearchParams(window.location.search)
  const kundeAusUrl = params.get("kunde")

  if (kundeAusUrl && kunden[kundeAusUrl]) {
    localStorage.setItem("aktuellerKunde", kundeAusUrl)
    return kundeAusUrl
  }

  const select = document.getElementById("kunde")
  if (select?.value) return select.value

  return localStorage.getItem("aktuellerKunde") || "sorgundseitz"
}

function setAktuellerKunde(kunde) {
  localStorage.setItem("aktuellerKunde", kunde)
}

function getStorageKey(baseKey) {
  return `${baseKey}_${getAktuellerKunde()}`
}

function renderLayoutAuswahl() {
  const select = document.getElementById("layout-auswahl")
  if (!select) return

  const kunde = getAktuellerKunde()
  const layoutsFuerKunde = kundenLayouts[kunde] || {}

  select.innerHTML = ""

  const keys = Object.keys(layoutsFuerKunde)

  if (keys.length === 0) {
    const option = document.createElement("option")
    option.value = ""
    option.textContent = "Keine Layouts verfügbar"
    select.appendChild(option)
    return
  }

  keys.forEach((key) => {
    const option = document.createElement("option")
    option.value = key

    if (key === "mittagstisch_instagram") {
      option.textContent = "Mittagstisch Instagram"
    } else if (key === "mittagstisch_druck") {
      option.textContent = "Mittagstisch Druck"
    } else {
      option.textContent = key
    }

    select.appendChild(option)
  })

  select.value = keys[0]
}

function safeParseStorage(key, fallback) {
  const gespeichert = localStorage.getItem(key)

  if (!gespeichert || gespeichert === "undefined" || gespeichert === "null") {
    return fallback
  }

  try {
    return JSON.parse(gespeichert)
  } catch (error) {
    console.warn(`localStorage Eintrag "${key}" ist kaputt:`, gespeichert)
    return fallback
  }
}

function renderKundenDropdown() {
  const select = document.getElementById("kunde")
  if (!select) return

  const aktuellerKunde = getAktuellerKunde()
  select.innerHTML = ""

  Object.entries(kunden).forEach(([key, config]) => {
    const option = document.createElement("option")
    option.value = key
    option.textContent = config.name
    select.appendChild(option)
  })

  if (kunden[aktuellerKunde]) {
    select.value = aktuellerKunde
  }
}

function getGerichte() {
  const kunde = getAktuellerKunde()

  const fallbackGerichte =
    kundenGerichte[kunde] && Object.keys(kundenGerichte[kunde]).length > 0
      ? structuredClone(kundenGerichte[kunde])
      : structuredClone(standardGerichte)

  return safeParseStorage(getStorageKey("gerichte"), fallbackGerichte)
}

function updateFormatAuswahl() {
  const layoutSelect = document.getElementById("layout-auswahl")
  const formatSelect = document.getElementById("format-auswahl")
  const kunde = getAktuellerKunde()

  if (!layoutSelect || !formatSelect) return

  const layout = layoutSelect.value
  const layoutsFuerKunde = kundenLayouts[kunde] || {}
  const layoutConfig = layoutsFuerKunde[layout]

  console.log("updateFormatAuswahl()", {
    kunde,
    layout,
    layoutsFuerKunde,
    layoutConfig
  })

  formatSelect.innerHTML = ""

  if (!layoutConfig || typeof layoutConfig !== "object") {
    const option = document.createElement("option")
    option.value = ""
    option.textContent = "Keine Formate verfügbar"
    formatSelect.appendChild(option)
    return
  }

  const formate = Object.keys(layoutConfig)

  formate.forEach((format) => {
    const option = document.createElement("option")
    option.value = format

    if (format === "feed") option.textContent = "Feed"
    else if (format === "story") option.textContent = "Story"
    else if (format === "front") option.textContent = "Vorderseite"
    else if (format === "back") option.textContent = "Rückseite"
    else option.textContent = format

    formatSelect.appendChild(option)
  })

  if (formate.length > 0) {
    formatSelect.value = formate[0]
  }
}

function getLayoutOverrides() {
  return safeParseStorage(getStorageKey("layoutOverrides"), {})
}

function saveLayoutOverrides(data) {
  localStorage.setItem(getStorageKey("layoutOverrides"), JSON.stringify(data))
}

function updateAdminEditorUI() {
  const layout = document.getElementById("layout-auswahl")?.value
  const format = document.getElementById("format-auswahl")?.value

  const bereichWrap = document.getElementById("bereich-wrap")
  const tagWrap = document.getElementById("tag-wrap")
  const lineWrap = document.getElementById("line-wrap")
  const mealFieldsWrap = document.getElementById("meal-fields-wrap")
  const weekFieldsWrap = document.getElementById("week-fields-wrap")

  const istInstagram = format === "feed" || format === "story"
  const istFront = format === "front"
  const istBack = format === "back"
  const istGoetzText = layout === "tagesgerichte_feed_text" && format === "feed"

  if (bereichWrap) {
    bereichWrap.style.display = istBack ? "block" : "none"
  }

  if (tagWrap) {
    tagWrap.style.display = (istInstagram || istBack || istGoetzText) ? "block" : "none"
  }

  if (lineWrap) {
    lineWrap.style.display = istGoetzText ? "block" : "none"
  }

  if (mealFieldsWrap) {
    mealFieldsWrap.style.display = (istInstagram || istBack || istGoetzText) ? "block" : "none"
  }

  if (weekFieldsWrap) {
    weekFieldsWrap.style.display = (istInstagram || istFront || istBack || istGoetzText) ? "block" : "none"
  }

  // Nicht benötigte Felder beim Text-Layout ausblenden
  const imageX = document.getElementById("imageX")?.parentElement
  const imageY = document.getElementById("imageY")?.parentElement
  const imageRadius = document.getElementById("imageRadius")?.parentElement
  const textMaxWidth = document.getElementById("textMaxWidth")?.parentElement
  const textLineHeight = document.getElementById("textLineHeight")?.parentElement
  const priceColor = document.getElementById("priceColor")?.parentElement
  const textFontSize = document.getElementById("textFontSize")?.parentElement
  const priceFontSize = document.getElementById("priceFontSize")?.parentElement

  const ausblendenBeiGoetz = [imageX, imageY, imageRadius, textMaxWidth, textLineHeight, priceColor, textFontSize, priceFontSize]
  ausblendenBeiGoetz.forEach(el => {
    if (!el) return
    el.style.display = istGoetzText ? "none" : "block"
  })
}

function renderGerichte() {
  const container = document.getElementById("gerichte-container")
  const gerichte = getGerichte()

  const sortierteEintraege = Object.entries(gerichte).sort((a, b) =>
    a[1].text.localeCompare(b[1].text, "de")
  )

  container.innerHTML = ""

  sortierteEintraege.forEach(([key, gericht]) => {
    const card = document.createElement("div")
    card.className = "gericht-card"

    card.innerHTML = `
      <h2>${key}</h2>

      <div class="gericht-grid">
        <div>
          <label>Name / Text</label>
          <input type="text" id="text-${key}" value="${gericht.text}">
        </div>

        <div>
          <label>Preis</label>
          <input type="text" id="preis-${key}" value="${gericht.preis}">
        </div>

        <div>
          <label>Bildpfad</label>
          <input type="text" id="bild-${key}" value="${gericht.bild}">
        </div>
      </div>

      <button onclick="deleteGericht('${key}')">Gericht löschen</button>
    `

    container.appendChild(card)
  })
}

function saveGerichte() {
  const gerichte = getGerichte()

  Object.keys(gerichte).forEach((key) => {
    gerichte[key].text = document.getElementById(`text-${key}`).value
    gerichte[key].preis = document.getElementById(`preis-${key}`).value
    gerichte[key].bild = document.getElementById(`bild-${key}`).value
  })

  localStorage.setItem(getStorageKey("gerichte"), JSON.stringify(gerichte))
  document.getElementById("status").textContent = "Änderungen gespeichert."
}

function resetGerichte() {
  localStorage.removeItem(getStorageKey("gerichte"))
  renderGerichte()
  document.getElementById("status").textContent = "Auf Standard zurückgesetzt."
}

function addGericht() {
  const name = prompt("Name des Gerichts:")
  if (!name) return

  const preis = prompt("Preis:")
  if (!preis) return

  const bild = prompt("Bildpfad (z.B. Gerichte/neuesgericht.jpg):")
  if (!bild) return

  const id = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "_")

  const gerichte = getGerichte()

  gerichte[id] = {
    text: name,
    preis: preis,
    bild: bild
  }

  localStorage.setItem(getStorageKey("gerichte"), JSON.stringify(gerichte))
  renderGerichte()
}

function deleteGericht(id) {
  if (!confirm("Gericht wirklich löschen?")) return

  const gerichte = getGerichte()
  delete gerichte[id]

  localStorage.setItem(getStorageKey("gerichte"), JSON.stringify(gerichte))
  renderGerichte()
}

function renderAdminLayoutDropdown() {
  const select = document.getElementById("layout-auswahl")
  if (!select) return

  const kunde = getAktuellerKunde()
  const layoutsFuerKunde = kundenLayouts[kunde] || {}

  select.innerHTML = ""

  Object.keys(layoutsFuerKunde).forEach((layoutKey) => {
    const option = document.createElement("option")
    option.value = layoutKey
    option.textContent = layoutKey.charAt(0).toUpperCase() + layoutKey.slice(1)
    select.appendChild(option)
  })

  const defaultLayout = kunden[kunde]?.defaultLayout || Object.keys(layoutsFuerKunde)[0]
  if (defaultLayout) {
    select.value = defaultLayout
  }
}

function ladePositionsWerte() {
  const layout = document.getElementById("layout-auswahl").value
  const format = document.getElementById("format-auswahl").value
  const tag = document.getElementById("tag-auswahl").value
  const bereich = document.getElementById("bereich-auswahl")?.value || "links"
  const kunde = getAktuellerKunde()
  const line = document.getElementById("line-auswahl")?.value || "1"

  const layoutsFuerKunde = kundenLayouts[kunde] || {}
  const overrides = getLayoutOverrides()

  const standardFormat = layoutsFuerKunde[layout]?.[format]
  const customFormat = overrides?.[layout]?.[format] || {}

  let finalMeal = {}
  let finalWeek = {}

  if (layout === "tagesgerichte_feed_text" && format === "feed") {
  const kunde = getAktuellerKunde()
  const layoutsFuerKunde = kundenLayouts[kunde] || {}
  const overrides = getLayoutOverrides()

  const standardTag = layoutsFuerKunde[layout]?.[format]?.tage?.[tag] || {}
  const customTag = overrides?.[layout]?.[format]?.tage?.[tag] || {}

  const finalTag = {
    ...standardTag,
    ...customTag
  }

  document.getElementById("weekX").value = finalTag.titleX ?? ""
  document.getElementById("weekY").value = finalTag.titleY ?? ""
  document.getElementById("weekFontSize").value = finalTag.titleFontSize ?? ""

  document.getElementById("textX").value = finalTag[`meal${line}X`] ?? ""
  document.getElementById("textY").value = finalTag[`meal${line}Y`] ?? ""
  document.getElementById("priceX").value = finalTag[`price${line}X`] ?? ""
  document.getElementById("priceY").value = finalTag[`price${line}Y`] ?? ""

  // Nicht genutzte Felder leeren
  document.getElementById("imageX").value = ""
  document.getElementById("imageY").value = ""
  document.getElementById("imageRadius").value = ""
  document.getElementById("textMaxWidth").value = ""
  document.getElementById("textLineHeight").value = ""
  document.getElementById("textFontSize").value = ""
  document.getElementById("priceFontSize").value = ""

  renderAdminPreview()
  return
}

  // Instagram: feed/story
  if (standardFormat?.meals) {
    const standardMeal = standardFormat.meals?.[tag] || {}
    const customMeal = customFormat.meals?.[tag] || {}

    finalMeal = {
      ...standardMeal,
      ...customMeal
    }

    finalWeek = {
      ...(standardFormat.woche || {}),
      ...(customFormat.woche || {})
    }
  }

  // Druck Front
  if (format === "front" && standardFormat?.datum) {
    finalWeek = {
      ...(standardFormat.datum || {}),
      ...(customFormat.datum || {})
    }

    finalMeal = {}
  }

  // Druck Back
  if (format === "back" && standardFormat?.[bereich]) {
    const standardSeite = standardFormat[bereich]
    const customSeite = customFormat?.[bereich] || {}

    finalMeal = {
      ...(standardSeite.meals?.[tag] || {}),
      ...(customSeite.meals?.[tag] || {})
    }

    finalWeek = {
      ...(standardSeite.woche || {}),
      ...(customSeite.woche || {})
    }
  }

  document.getElementById("imageX").value = finalMeal.imageX ?? ""
  document.getElementById("imageY").value = finalMeal.imageY ?? ""
  document.getElementById("imageRadius").value = finalMeal.imageRadius ?? ""
  document.getElementById("textX").value = finalMeal.textX ?? ""
  document.getElementById("textY").value = finalMeal.textY ?? ""
  document.getElementById("textMaxWidth").value = finalMeal.textMaxWidth ?? ""
  document.getElementById("textLineHeight").value = finalMeal.textLineHeight ?? ""
  document.getElementById("priceX").value = finalMeal.priceX ?? ""
  document.getElementById("priceY").value = finalMeal.priceY ?? ""
  document.getElementById("priceColor").value = finalMeal.priceColor ?? "#2f2f2f"
  document.getElementById("textFontSize").value = finalMeal.textFontSize ?? ""
  document.getElementById("priceFontSize").value = finalMeal.priceFontSize ?? ""

  document.getElementById("weekX").value = finalWeek.x ?? ""
  document.getElementById("weekY").value = finalWeek.y ?? ""
  document.getElementById("weekFontSize").value = finalWeek.fontSize ?? ""

  renderAdminPreview()
}

function speicherePositionsWerte() {
  const layout = document.getElementById("layout-auswahl").value
  const format = document.getElementById("format-auswahl").value
  const tag = document.getElementById("tag-auswahl").value
  const bereich = document.getElementById("bereich-auswahl")?.value || "links"
  const line = document.getElementById("line-auswahl")?.value || "1"

  const overrides = getLayoutOverrides()

  if (!overrides[layout]) overrides[layout] = {}
  if (!overrides[layout][format]) overrides[layout][format] = {}

  const mealData = {
    imageX: Number(document.getElementById("imageX").value),
    imageY: Number(document.getElementById("imageY").value),
    imageRadius: Number(document.getElementById("imageRadius").value),
    textX: Number(document.getElementById("textX").value),
    textY: Number(document.getElementById("textY").value),
    textMaxWidth: Number(document.getElementById("textMaxWidth").value),
    textLineHeight: Number(document.getElementById("textLineHeight").value),
    priceX: Number(document.getElementById("priceX").value),
    priceY: Number(document.getElementById("priceY").value),
    priceColor: document.getElementById("priceColor").value,
    textFontSize: Number(document.getElementById("textFontSize").value),
    priceFontSize: Number(document.getElementById("priceFontSize").value)
  }

  const weekData = {
    x: Number(document.getElementById("weekX").value),
    y: Number(document.getElementById("weekY").value),
    fontSize: Number(document.getElementById("weekFontSize").value)
  }
  if (layout === "tagesgerichte_feed_text" && format === "feed") {
  if (!overrides[layout]) overrides[layout] = {}
  if (!overrides[layout][format]) overrides[layout][format] = {}
  if (!overrides[layout][format].tage) overrides[layout][format].tage = {}
  if (!overrides[layout][format].tage[tag]) overrides[layout][format].tage[tag] = {}

  overrides[layout][format].tage[tag] = {
    ...overrides[layout][format].tage[tag],
    titleX: Number(document.getElementById("weekX").value),
    titleY: Number(document.getElementById("weekY").value),
    titleFontSize: Number(document.getElementById("weekFontSize").value),
    [`meal${line}X`]: Number(document.getElementById("textX").value),
    [`meal${line}Y`]: Number(document.getElementById("textY").value),
    [`price${line}X`]: Number(document.getElementById("priceX").value),
    [`price${line}Y`]: Number(document.getElementById("priceY").value)
  }

  saveLayoutOverrides(overrides)
  document.getElementById("layout-status").textContent = "Positionswerte gespeichert."
  ladePositionsWerte()
  return
}

  // Instagram
  if (format === "feed" || format === "story") {
    if (!overrides[layout][format].meals) overrides[layout][format].meals = {}
    overrides[layout][format].meals[tag] = mealData
    overrides[layout][format].woche = weekData
  }

  // Druck Front
  if (format === "front") {
    overrides[layout][format].datum = weekData
  }

  // Druck Back
  if (format === "back") {
    if (!overrides[layout][format][bereich]) overrides[layout][format][bereich] = {}
    if (!overrides[layout][format][bereich].meals) overrides[layout][format][bereich].meals = {}

    overrides[layout][format][bereich].meals[tag] = mealData
    overrides[layout][format][bereich].woche = weekData
  }

  saveLayoutOverrides(overrides)
  document.getElementById("layout-status").textContent = "Positionswerte gespeichert."
  ladePositionsWerte()
}

function resetPositionsWerte() {
  const layout = document.getElementById("layout-auswahl").value
  const format = document.getElementById("format-auswahl").value
  const tag = document.getElementById("tag-auswahl").value

  const overrides = getLayoutOverrides()

  if (
    overrides[layout] &&
    overrides[layout][format] &&
    overrides[layout][format].meals &&
    overrides[layout][format].meals[tag]
  ) {
    delete overrides[layout][format].meals[tag]
    saveLayoutOverrides(overrides)
  }

  ladePositionsWerte()
  document.getElementById("layout-status").textContent = "Positionswerte zurückgesetzt."
}

function getAdminPreviewGerichte() {
  return {
    dienstag: { bild: "Gerichte/currywurst.jpg", preis: "6,80 €", text: "Currywurst mit Semmel" },
    mittwoch: { bild: "Gerichte/cordonbleu.jpg", preis: "6,80 €", text: "Cordon Bleu mit Kartoffelsalat" },
    donnerstag: { bild: "Gerichte/gulasch.jpg", preis: "6,80 €", text: "Gulasch mit Spätzle" },
    freitag: { bild: "Gerichte/lasagne.jpg", preis: "6,80 €", text: "Lasagne" }
  }
}

function handleKundeChange() {
  const kunde = getAktuellerKunde()
  localStorage.setItem("aktuellerKunde", kunde)

  gerichte = getGerichte()

  renderGerichte()
  renderLayoutAuswahl()
  updateFormatAuswahl()
  updateAdminEditorUI()
  ladePositionsWerte()
  renderAdminPreview()
}

function loadImageAdmin(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden: " + src))

    const trenner = src.includes("?") ? "&" : "?"
    img.src = `${src}${trenner}v=${Date.now()}`
  })
}

function drawWrappedTextAdmin(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ")
  let line = ""
  const lines = []

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " "
    const testWidth = ctx.measureText(testLine).width

    if (testWidth > maxWidth && i > 0) {
      lines.push(line.trim())
      line = words[i] + " "
    } else {
      line = testLine
    }
  }

  lines.push(line.trim())

  lines.forEach((entry, index) => {
    ctx.fillText(entry, x, y + index * lineHeight)
  })
}

function drawImageCoverAdmin(ctx, img, cx, cy, radius) {
  const diameter = radius * 2
  const imgRatio = img.width / img.height

  let drawWidth
  let drawHeight

  if (imgRatio > 1) {
    drawHeight = diameter
    drawWidth = diameter * imgRatio
  } else {
    drawWidth = diameter
    drawHeight = diameter / imgRatio
  }

  const dx = cx - drawWidth / 2
  const dy = cy - drawHeight / 2

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight)
}

function getPreviewLayout() {
  const layout = document.getElementById("layout-auswahl").value
  const format = document.getElementById("format-auswahl").value
  const tag = document.getElementById("tag-auswahl").value
  const bereich = document.getElementById("bereich-auswahl")?.value || "links"
  const kunde = getAktuellerKunde()
  const line = document.getElementById("line-auswahl")?.value || "1"

  const overrides = getLayoutOverrides()
  const layoutsFuerKunde = kundenLayouts[kunde] || {}
  const standard = JSON.parse(JSON.stringify(layoutsFuerKunde[layout][format]))
  if (layout === "tagesgerichte_feed_text" && format === "feed") {
  const standardTag = standard.tage?.[tag] || {}
  const customTag = overrides?.[layout]?.[format]?.tage?.[tag] || {}

  standard.tage[tag] = {
    ...standardTag,
    ...customTag,
    titleX: Number(document.getElementById("weekX").value),
    titleY: Number(document.getElementById("weekY").value),
    titleFontSize: Number(document.getElementById("weekFontSize").value),
    [`meal${line}X`]: Number(document.getElementById("textX").value),
    [`meal${line}Y`]: Number(document.getElementById("textY").value),
    [`price${line}X`]: Number(document.getElementById("priceX").value),
    [`price${line}Y`]: Number(document.getElementById("priceY").value)
  }

  return standard
}

  // Instagram
  if (standard.meals) {
    const gespeicherteMeals = overrides?.[layout]?.[format]?.meals || {}

    Object.keys(gespeicherteMeals).forEach((day) => {
      if (standard.meals[day]) {
        standard.meals[day] = {
          ...standard.meals[day],
          ...gespeicherteMeals[day]
        }
      }
    })

    if (overrides?.[layout]?.[format]?.woche) {
      standard.woche = {
        ...standard.woche,
        ...overrides[layout][format].woche
      }
    }

    standard.meals[tag] = {
      ...standard.meals[tag],
      imageX: Number(document.getElementById("imageX").value),
      imageY: Number(document.getElementById("imageY").value),
      imageRadius: Number(document.getElementById("imageRadius").value),
      textX: Number(document.getElementById("textX").value),
      textY: Number(document.getElementById("textY").value),
      textMaxWidth: Number(document.getElementById("textMaxWidth").value),
      textLineHeight: Number(document.getElementById("textLineHeight").value),
      priceX: Number(document.getElementById("priceX").value),
      priceY: Number(document.getElementById("priceY").value),
      priceColor: document.getElementById("priceColor").value,
      textFontSize: Number(document.getElementById("textFontSize").value),
      priceFontSize: Number(document.getElementById("priceFontSize").value)
    }

    standard.woche = {
      ...standard.woche,
      x: Number(document.getElementById("weekX").value),
      y: Number(document.getElementById("weekY").value),
      fontSize: Number(document.getElementById("weekFontSize").value)
    }
  }

  // Druck Front
  if (format === "front" && standard.datum) {
    if (overrides?.[layout]?.[format]?.datum) {
      standard.datum = {
        ...standard.datum,
        ...overrides[layout][format].datum
      }
    }

    standard.datum = {
      ...standard.datum,
      x: Number(document.getElementById("weekX").value),
      y: Number(document.getElementById("weekY").value),
      fontSize: Number(document.getElementById("weekFontSize").value)
    }
  }

  // Druck Back
  if (format === "back" && standard[bereich]) {
    const seitenOverrides = overrides?.[layout]?.[format]?.[bereich] || {}

    if (seitenOverrides.woche) {
      standard[bereich].woche = {
        ...standard[bereich].woche,
        ...seitenOverrides.woche
      }
    }

    const gespeicherteMeals = seitenOverrides.meals || {}
    Object.keys(gespeicherteMeals).forEach((day) => {
      if (standard[bereich].meals?.[day]) {
        standard[bereich].meals[day] = {
          ...standard[bereich].meals[day],
          ...gespeicherteMeals[day]
        }
      }
    })

    standard[bereich].meals[tag] = {
      ...standard[bereich].meals[tag],
      imageX: Number(document.getElementById("imageX").value),
      imageY: Number(document.getElementById("imageY").value),
      imageRadius: Number(document.getElementById("imageRadius").value),
      textX: Number(document.getElementById("textX").value),
      textY: Number(document.getElementById("textY").value),
      textMaxWidth: Number(document.getElementById("textMaxWidth").value),
      textLineHeight: Number(document.getElementById("textLineHeight").value),
      priceX: Number(document.getElementById("priceX").value),
      priceY: Number(document.getElementById("priceY").value),
      priceColor: document.getElementById("priceColor").value,
      textFontSize: Number(document.getElementById("textFontSize").value),
      priceFontSize: Number(document.getElementById("priceFontSize").value)
    }

    standard[bereich].woche = {
      ...standard[bereich].woche,
      x: Number(document.getElementById("weekX").value),
      y: Number(document.getElementById("weekY").value),
      fontSize: Number(document.getElementById("weekFontSize").value)
    }
  }

  return standard
}

async function renderAdminPreview() {
  const canvas = document.getElementById("admin-preview-canvas")
  const ctx = canvas.getContext("2d")
  const format = document.getElementById("format-auswahl").value
  const bereich = document.getElementById("bereich-auswahl")?.value || "links"
  const previewGerichte = getAdminPreviewGerichte()
  const layout = getPreviewLayout()

  try {
    canvas.width = layout.width
    canvas.height = layout.height

    const template = await loadImageAdmin(layout.template)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height)

    if (layout.tage && format === "feed") {
  const tage = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag"]

  tage.forEach((tagKey) => {
    const tag = layout.tage[tagKey]
    if (!tag) return

    ctx.fillStyle = "#76b82a"
    ctx.font = `700 ${tag.titleFontSize}px Georgia, serif`
    ctx.textAlign = "left"
    ctx.fillText(tagKey.charAt(0).toUpperCase() + tagKey.slice(1), tag.titleX, tag.titleY)

    ctx.fillStyle = "#ffffff"
    ctx.font = `500 26px Georgia, serif`
    ctx.fillText("Beispielgericht 1", tag.meal1X, tag.meal1Y)
    ctx.fillText("Beispielgericht 2", tag.meal2X, tag.meal2Y)
    ctx.fillText("Beispielgericht 3", tag.meal3X, tag.meal3Y)

    ctx.textAlign = "right"
    ctx.fillText("€ 6,90", tag.price1X, tag.price1Y)
    ctx.fillText("€ 7,40", tag.price2X, tag.price2Y)
    ctx.fillText("€ 8,20", tag.price3X, tag.price3Y)
  })

  document.getElementById("layout-status").textContent = "Vorschau aktualisiert."
  return
}

    // Instagram
    if (layout.woche && layout.meals) {
      ctx.textAlign = "center"
      ctx.fillStyle = "#111111"
      ctx.font = `700 ${layout.woche.fontSize}px 'IBM Plex Serif', Georgia, serif`
      ctx.fillText("18.02. - 20.02.2026", layout.woche.x, layout.woche.y)

      for (const day of ["dienstag", "mittwoch", "donnerstag", "freitag"]) {
        const config = layout.meals[day]
        const meal = previewGerichte[day]
        const img = await loadImageAdmin(meal.bild)

        ctx.save()
        ctx.beginPath()
        ctx.arc(config.imageX, config.imageY, config.imageRadius, 0, Math.PI * 2)
        ctx.closePath()
        ctx.clip()
        drawImageCoverAdmin(ctx, img, config.imageX, config.imageY, config.imageRadius)
        ctx.restore()

        ctx.textAlign = "center"
        ctx.fillStyle = "#2f2f2f"
        ctx.font = `500 ${config.textFontSize}px 'Raleway', Arial, sans-serif`

        drawWrappedTextAdmin(
          ctx,
          meal.text,
          config.textX,
          config.textY,
          config.textMaxWidth,
          config.textLineHeight
        )

        ctx.textAlign = "center"
        ctx.fillStyle = config.priceColor || "#2f2f2f"
        ctx.font = `600 ${config.priceFontSize}px 'Raleway', Arial, sans-serif`
        ctx.fillText(meal.preis, config.priceX, config.priceY)
      }
    }

    // Druck Front
    if (format === "front" && layout.datum) {
      ctx.textAlign = "center"
      ctx.fillStyle = "#111111"
      ctx.font = `700 ${layout.datum.fontSize}px 'IBM Plex Serif', Georgia, serif`
      ctx.fillText("18.02. - 20.02.2026", layout.datum.x, layout.datum.y)
    }

    // Druck Back
    if (format === "back" && layout.links && layout.rechts) {
      // Woche links
      ctx.textAlign = "center"
      ctx.fillStyle = "#111111"
      ctx.font = `700 ${layout.links.woche.fontSize}px 'IBM Plex Serif', Georgia, serif`
      ctx.fillText("18.02. - 20.02.2026", layout.links.woche.x, layout.links.woche.y)

      // Woche rechts
      ctx.textAlign = "center"
      ctx.fillStyle = "#111111"
      ctx.font = `700 ${layout.rechts.woche.fontSize}px 'IBM Plex Serif', Georgia, serif`
      ctx.fillText("25.02. - 27.02.2026", layout.rechts.woche.x, layout.rechts.woche.y)

      for (const day of ["dienstag", "mittwoch", "donnerstag", "freitag"]) {
        // links
        {
          const config = layout.links.meals[day]
          const meal = previewGerichte[day]
          const img = await loadImageAdmin(meal.bild)

          ctx.save()
          ctx.beginPath()
          ctx.arc(config.imageX, config.imageY, config.imageRadius, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          drawImageCoverAdmin(ctx, img, config.imageX, config.imageY, config.imageRadius)
          ctx.restore()

          ctx.textAlign = "center"
          ctx.fillStyle = "#2f2f2f"
          ctx.font = `500 ${config.textFontSize}px 'Raleway', Arial, sans-serif`

          drawWrappedTextAdmin(
            ctx,
            meal.text,
            config.textX,
            config.textY,
            config.textMaxWidth,
            config.textLineHeight
          )

          ctx.textAlign = "center"
          ctx.fillStyle = config.priceColor || "#2f2f2f"
          ctx.font = `600 ${config.priceFontSize}px 'Raleway', Arial, sans-serif`
          ctx.fillText(meal.preis, config.priceX, config.priceY)
        }

        // rechts
        {
          const config = layout.rechts.meals[day]
          const meal = previewGerichte[day]
          const img = await loadImageAdmin(meal.bild)

          ctx.save()
          ctx.beginPath()
          ctx.arc(config.imageX, config.imageY, config.imageRadius, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          drawImageCoverAdmin(ctx, img, config.imageX, config.imageY, config.imageRadius)
          ctx.restore()

          ctx.textAlign = "center"
          ctx.fillStyle = "#2f2f2f"
          ctx.font = `500 ${config.textFontSize}px 'Raleway', Arial, sans-serif`

          drawWrappedTextAdmin(
            ctx,
            meal.text,
            config.textX,
            config.textY,
            config.textMaxWidth,
            config.textLineHeight
          )

          ctx.textAlign = "center"
          ctx.fillStyle = config.priceColor || "#2f2f2f"
          ctx.font = `600 ${config.priceFontSize}px 'Raleway', Arial, sans-serif`
          ctx.fillText(meal.preis, config.priceX, config.priceY)
        }
      }
    }

    document.getElementById("layout-status").textContent = "Vorschau aktualisiert."
  } catch (error) {
    console.error(error)
    document.getElementById("layout-status").textContent = "Fehler in der Vorschau: " + error.message
  }
}

function getCanvasCoords(canvas, event) {
  const rect = canvas.getBoundingClientRect()

  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  }
}

let dragTarget = null

function startDrag(e) {
  const canvas = document.getElementById("admin-preview-canvas")
  const pos = getCanvasCoords(canvas, e)

  const x = pos.x
  const y = pos.y

  const layout = getPreviewLayout()
  const tag = document.getElementById("tag-auswahl").value
  const meal = layout.meals[tag]

  const targets = [
    { type: "image", x: meal.imageX, y: meal.imageY },
    { type: "text", x: meal.textX, y: meal.textY },
    { type: "price", x: meal.priceX, y: meal.priceY }
  ]

  for (const t of targets) {
    const dx = x - t.x
    const dy = y - t.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 80) {
      dragTarget = t.type
      break
    }
  }
}

function dragMove(e) {
  if (!dragTarget) return

  const canvas = document.getElementById("admin-preview-canvas")
  const pos = getCanvasCoords(canvas, e)

  const x = pos.x
  const y = pos.y

  if (dragTarget === "image") {
    document.getElementById("imageX").value = Math.round(x)
    document.getElementById("imageY").value = Math.round(y)
  }

  if (dragTarget === "text") {
    document.getElementById("textX").value = Math.round(x)
    document.getElementById("textY").value = Math.round(y)
  }

  if (dragTarget === "price") {
    document.getElementById("priceX").value = Math.round(x)
    document.getElementById("priceY").value = Math.round(y)
  }

  renderAdminPreview()
}

function endDrag() {
  dragTarget = null
}

window.addEventListener("DOMContentLoaded", () => {
  try {
    const kunde = getAktuellerKunde()
    const kundeSelect = document.getElementById("kunde")

    console.log("DOMContentLoaded admin", { kunde })

    if (kundeSelect) {
      kundeSelect.value = kunde
    }

    gerichte = getGerichte()
    renderKundenDropdown()
    renderGerichte()
    renderLayoutAuswahl()
    updateFormatAuswahl()
    updateAdminEditorUI()
    ladePositionsWerte()
    renderAdminPreview()

    const canvas = document.getElementById("admin-preview-canvas")
    if (canvas) {
      canvas.addEventListener("mousedown", startDrag)
      canvas.addEventListener("mousemove", dragMove)
      canvas.addEventListener("mouseup", endDrag)
    }
  } catch (error) {
    console.error("Fehler im DOMContentLoaded:", error)
  }
})