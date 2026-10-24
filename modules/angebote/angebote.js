/* ══════════════════════════════════════════════
   MetzgerPost — Modul Angebote: Daten & Helfer
   Wird von index.html, bearbeiten.html und produkte.html geladen.
   Benötigt: shared/supabase.js (window.MP), shared/components.js
══════════════════════════════════════════════ */
(function () {
  'use strict'

  const BUCKET = 'screen-assets'
  const STANDARD_VORLAGE = 'preis-angebot'
  const STANDARD_KUNDE_KEY = 'sorgundseitz'
  const EINHEITEN = { kg: 'kg', '100g': '100 g', stueck: 'Stück' }

  /* ── Kunde ──
     Normal: MP.getAktiveKundeId() (wie im Rest der App).
     Admin darf zum Testen ?kunde=<id> setzen (z. B. test0001). */
  function kundeId() {
    const p = new URLSearchParams(location.search).get('kunde')
    if (p && window.MP && MP.userPlan === 'admin' && /^[a-z0-9]{4,32}$/i.test(p)) return p
    return MP.getAktiveKundeId()
  }

  function kundeKey() {
    const k = MP.getAktiveKundeKey && MP.getAktiveKundeKey()
    return k || STANDARD_KUNDE_KEY
  }

  // Links innerhalb des Moduls behalten den Test-Parameter
  function link(datei, params) {
    const u = new URLSearchParams(params || {})
    const k = new URLSearchParams(location.search).get('kunde')
    if (k && !u.has('kunde')) u.set('kunde', k)
    const q = u.toString()
    return datei + (q ? '?' + q : '')
  }

  /* ── Vorlage ── */
  const _vorlagen = {}
  async function ladeVorlage(name) {
    name = name || STANDARD_VORLAGE
    const key = kundeKey()
    const id = key + '/' + name
    if (_vorlagen[id]) return _vorlagen[id]
    for (const k of [key, STANDARD_KUNDE_KEY]) {
      const basis = 'vorlagen/' + k + '/'
      try {
        const r = await fetch(basis + name + '.json', { cache: 'no-cache' })
        if (r.ok) {
          _vorlagen[id] = { daten: await r.json(), basis }
          return _vorlagen[id]
        }
      } catch (e) { /* nächster Versuch */ }
    }
    throw new Error('Vorlage nicht gefunden: ' + name)
  }

  /* ── Datum & Woche ── */
  const pad = n => String(n).padStart(2, '0')
  function isoDatum(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  function heute() { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
  function plusTage(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
  function montag(d) {
    const x = new Date(d); x.setHours(0, 0, 0, 0)
    const wt = (x.getDay() + 6) % 7 // Mo=0 … So=6
    return plusTage(x, -wt)
  }
  // Mo–Sa der Woche, in der d liegt. Sonntag zählt schon zur kommenden Woche.
  function wocheVon(d) {
    let mo = montag(d)
    if (new Date(d).getDay() === 0) mo = plusTage(mo, 7)
    return { von: isoDatum(mo), bis: isoDatum(plusTage(mo, 5)) }
  }
  function dieseWoche() { return wocheVon(heute()) }
  function naechsteWoche() { return wocheVon(plusTage(MPAngebotRenderer.parseDatum(dieseWoche().von), 7)) }
  function kalenderwoche(iso) {
    const d = MPAngebotRenderer.parseDatum(iso)
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const tag = t.getUTCDay() || 7
    t.setUTCDate(t.getUTCDate() + 4 - tag)
    const jahresanfang = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
    return Math.ceil(((t - jahresanfang) / 86400000 + 1) / 7)
  }
  function datumKurz(iso) {
    const d = MPAngebotRenderer.parseDatum(iso)
    return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()] + ' ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.'
  }
  function zeitraumKurz(von, bis) {
    const b = MPAngebotRenderer.parseDatum(bis)
    return datumKurz(von) + ' – ' + datumKurz(bis) + b.getFullYear()
  }

  /* ── Status eines Angebots ── */
  function kategorie(a, stichtag) {
    const t = isoDatum(stichtag || heute())
    if (a.status === 'entwurf') return 'entwurf'
    if (a.status === 'beendet') return 'vergangen'
    if (t < a.gueltig_von) return 'geplant'
    if (t > a.gueltig_bis) return 'vergangen'
    return 'laeuft'
  }
  function tageBis(iso) {
    return Math.round((MPAngebotRenderer.parseDatum(iso) - heute()) / 86400000)
  }

  /* ── Preise ── */
  function parsePreis(text) {
    if (text === null || text === undefined) return null
    const s = String(text).trim().replace(/\s|€/g, '')
    if (!s) return null
    // "1.234,50" → 1234.50 ; "39,90" → 39.90 ; "39.90" → 39.90
    const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
    const n = Number(norm)
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN
  }
  function einheitLang(e) { return EINHEITEN[e] || 'kg' }

  /* ── Escaping für innerHTML ── */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
  }

  /* ── Supabase: Produkte ── */
  async function ladeProdukte() {
    const { data, error } = await MP.getSB().from('angebots_produkte')
      .select('*').eq('kunde_id', kundeId()).eq('aktiv', true)
      .order('sortierung').order('name')
    if (error) throw error
    return data || []
  }
  async function speichereProdukt(p) {
    const row = {
      kunde_id: kundeId(),
      name: p.name.trim(),
      einheit: p.einheit || 'kg',
      bild_url: p.bild_url || null
    }
    const q = MP.getSB().from('angebots_produkte')
    const { data, error } = p.id
      ? await q.update(row).eq('id', p.id).select().single()
      : await q.insert(row).select().single()
    if (error) throw error
    return data
  }
  async function entferneProdukt(id) {
    // Nur deaktivieren: alte Angebote behalten ihren Bezug
    const { error } = await MP.getSB().from('angebots_produkte').update({ aktiv: false }).eq('id', id)
    if (error) throw error
  }

  /* ── Supabase: Angebote ── */
  async function ladeAngebote() {
    const { data, error } = await MP.getSB().from('angebote')
      .select('*').eq('kunde_id', kundeId())
      .order('gueltig_von', { ascending: false })
    if (error) throw error
    return data || []
  }
  async function ladeAngebot(id) {
    const { data, error } = await MP.getSB().from('angebote')
      .select('*').eq('id', id).eq('kunde_id', kundeId()).maybeSingle()
    if (error) throw error
    return data
  }
  async function speichereAngebot(a) {
    const row = Object.assign({}, a, { kunde_id: kundeId() })
    delete row.created_at; delete row.updated_at
    const { data, error } = await MP.getSB().from('angebote').upsert(row).select().single()
    if (error) throw error
    return data
  }
  async function setzeStatus(id, status) {
    const { error } = await MP.getSB().from('angebote').update({ status }).eq('id', id)
    if (error) throw error
  }
  async function loescheAngebot(a) {
    const { error } = await MP.getSB().from('angebote').delete().eq('id', a.id)
    if (error) throw error
    await entferneDateien([a.render_tv_url, a.render_feed_url, a.render_story_url])
  }

  /* ── Storage ── */
  function pfadAusUrl(url) {
    const marker = '/storage/v1/object/public/' + BUCKET + '/'
    const i = url ? url.indexOf(marker) : -1
    return i >= 0 ? decodeURIComponent(url.slice(i + marker.length).split('?')[0]) : null
  }
  async function ladeHoch(blob, dateiname) {
    const pfad = kundeId() + '/angebote/' + dateiname
    const { error } = await MP.getSB().storage.from(BUCKET)
      .upload(pfad, blob, { upsert: true, contentType: blob.type || 'image/jpeg', cacheControl: '31536000' })
    if (error) throw error
    return MP.getSB().storage.from(BUCKET).getPublicUrl(pfad).data.publicUrl
  }
  async function entferneDateien(urls) {
    const pfade = (urls || []).map(pfadAusUrl).filter(p => p && p.indexOf('/angebote/') > 0)
    if (!pfade.length) return
    try { await MP.getSB().storage.from(BUCKET).remove(pfade) } catch (e) { /* nicht kritisch */ }
  }

  /* ── Foto vorbereiten: quadratisch zuschneiden + verkleinern ── */
  function komprimiereFoto(datei, kante, qualitaet) {
    kante = kante || 1200
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(datei)
      const img = new Image()
      img.onload = () => {
        const seite = Math.min(img.width, img.height)
        const ziel = Math.min(kante, seite)
        const c = document.createElement('canvas')
        c.width = c.height = ziel
        c.getContext('2d').drawImage(img, (img.width - seite) / 2, (img.height - seite) / 2, seite, seite, 0, 0, ziel, ziel)
        URL.revokeObjectURL(url)
        c.toBlob(b => b ? resolve(b) : reject(new Error('Foto konnte nicht verarbeitet werden')), 'image/jpeg', qualitaet || 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Datei ist kein lesbares Bild')) }
      img.src = url
    })
  }

  function slug(s) {
    return String(s || 'angebot').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'angebot'
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }

  function herunterladen(blob, name) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
  }

  window.MPAngebote = {
    kundeId, kundeKey, link, ladeVorlage,
    isoDatum, heute, plusTage, montag, dieseWoche, naechsteWoche, wocheVon, kalenderwoche, datumKurz, zeitraumKurz,
    kategorie, tageBis, parsePreis, einheitLang, esc, slug, uuid, herunterladen,
    ladeProdukte, speichereProdukt, entferneProdukt,
    ladeAngebote, ladeAngebot, speichereAngebot, setzeStatus, loescheAngebot,
    ladeHoch, entferneDateien, komprimiereFoto
  }
})()
