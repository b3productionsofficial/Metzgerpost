/* Regeltests für shared/screen-regeln.js (ohne Browser). Aufruf: node tests/regeln/regeln_test.js
   Ausgabe: eine Zeile pro Prüfung mit Regel-Nummer; Exit-Code 1 bei Fehlern. */
const R = require('../../shared/screen-regeln.js')
let ok = 0, fehler = 0
function pruefe (regel, name, ist, soll) {
  const a = JSON.stringify(ist), b = JSON.stringify(soll)
  if (a === b) { ok++; console.log('OK   ' + regel + '  ' + name) }
  else { fehler++; console.log('FAIL ' + regel + '  ' + name + '\n       ist:  ' + a + '\n       soll: ' + b) }
}
const D = s => R.ausIso(s)
const g = name => [{ name, bild: '/x/' + name + '.jpg', preis: '1 €' }]
const KW44 = { dienstag: g('Di'), mittwoch: g('Mi'), donnerstag: g('Do'), freitag: g('Fr') }
const wochen = [
  { id: 'w45', gueltig_ab: '2026-11-03', woche_label: 'KW45', gerichte: { dienstag: g('Di45') } },
  { id: 'w44', gueltig_ab: '2026-10-27', woche_label: 'KW44', gerichte: KW44 },
  { id: 'alt', gueltig_ab: null, kw: 2, jahr: 2027, woche_label: 'ohne Datum', gerichte: { mittwoch: g('Mi2') } }
]
const kurz = p => p.liste.map(x => x.typ === 'mittagstisch' ? 'MT:' + x.mt.layout.slice(0, 2) + ':' + x.mt.label : x.typ === 'angebot' ? 'A:' + x.key.split(':')[1] : 'S:' + x.titel)
const W = { wochentage: [0, 1, 2, 3, 4, 5, 6] }
const sonder = { layouts: [
  Object.assign({ label: 'Warme Theke', bild: 'wt.jpg', type: 'wochentage' }, W),
  { label: '20', bild: '20.jpg', type: 'wochentage', wochentage: [1, 2, 3, 4, 5, 6] },
  { label: 'Pause', bild: 'p.jpg', type: 'wochentage', wochentage: [0, 1, 2, 3, 4, 5, 6], aktiv: false },
  { label: 'Eröffnung', bild: 'e.jpg', type: 'datum', datum: '2026-10-30' }
] }
const ang = (id, screens, von, bis, extra) => Object.assign({ id, titel: id, status: 'aktiv', screens, gueltig_von: von, gueltig_bis: bis, render_tv_url: id + '.jpg', updated_at: 't' }, extra || {})
const angebote = [ang('lende', ['screen1', 'screen3'], '2026-10-26', '2026-10-31'), ang('nur2', ['screen2'], '2026-10-20', '2026-11-05'),
  ang('entwurf', ['screen1'], '2026-10-20', '2026-11-05', { status: 'entwurf' }), ang('ohneBild', ['screen1'], '2026-10-20', '2026-11-05', { render_tv_url: null })]
const basis = { sonder, mtSettings: { tage: [2, 3, 4, 5] }, wochen, angebote }

// ── Datum / Woche ──
pruefe('S1-02', 'Montag einer Woche (So 25.10. → Mo 19.10.)', R.isoAus(R.montagVon(D('2026-10-25'))), '2026-10-19')
pruefe('S1-02', 'Mi 28.10. → KW44', R.aktiveWoche(wochen, D('2026-10-28')).woche.id, 'w44')
pruefe('S1-02', 'Mo 26.10. → KW44 (gültig ab Di)', R.aktiveWoche(wochen, D('2026-10-26')).woche.id, 'w44')
pruefe('S1-02', 'Eintrag ohne Datum über KW/Jahr (KW2/2027)', R.aktiveWoche(wochen, D('2027-01-13')).woche.id, 'alt')
pruefe('S1-03', 'Sa 31.10. → schon KW45', [R.aktiveWoche(wochen, D('2026-10-31')).woche.id, R.aktiveWoche(wochen, D('2026-10-31')).naechste], ['w45', true])
pruefe('S1-03', 'So 25.10. → schon KW44', R.aktiveWoche(wochen, D('2026-10-25')).woche.id, 'w44')
pruefe('S1-03', 'Sa 07.11. ohne Folgewoche → laufende KW45', [R.aktiveWoche(wochen, D('2026-11-07')).woche.id, R.aktiveWoche(wochen, D('2026-11-07')).naechste], ['w45', false])
pruefe('S1-04', 'Di 10.11. ohne Woche → null', R.aktiveWoche(wochen, D('2026-11-10')), null)
pruefe('S1-02', 'Jahreswechsel: Mo 28.12.2026 / gültig ab 29.12.', R.aktiveWoche([{ id: 'j', gueltig_ab: '2026-12-29', gerichte: {} }], D('2027-01-01')).woche.id, 'j')

// ── Layout-Tag ──
pruefe('S1-05', 'Mi → mittwoch groß', R.layoutTag(KW44, 3, false), 'mittwoch')
pruefe('S1-05', 'Mo → erster Tag (dienstag)', R.layoutTag(KW44, 1, false), 'dienstag')
pruefe('S1-05', 'Do ohne Gericht → erster vorhandener', R.layoutTag({ mittwoch: g('Mi') }, 4, false), 'mittwoch')
pruefe('S1-05', 'nächste Woche → erster Tag', R.layoutTag(KW44, 5, true), 'dienstag')

// ── Sonderlayouts ──
pruefe('S1-08', 'Fr 30.10.: Datum zuerst, pausiert nie', R.sonderHeute(sonder.layouts, D('2026-10-30')).map(l => l.label), ['Eröffnung', 'Warme Theke', '20'])
pruefe('S1-08', 'So: nur Warme Theke', R.sonderHeute(sonder.layouts, D('2026-11-01')).map(l => l.label), ['Warme Theke'])

// ── Angebote ──
pruefe('S1-09', 'Angebot gilt am ersten Tag', R.angebotGilt(angebote[0], 'screen1', '2026-10-26'), true)
pruefe('S1-09', 'Angebot gilt am letzten Tag', R.angebotGilt(angebote[0], 'screen1', '2026-10-31'), true)
pruefe('S1-09', 'Angebot nicht am Vortag', R.angebotGilt(angebote[0], 'screen1', '2026-10-25'), false)
pruefe('S1-09', 'Angebot nicht auf anderem Bildschirm', R.angebotGilt(angebote[0], 'screen2', '2026-10-28'), false)
pruefe('S1-09', 'Entwurf nie', R.angebotGilt(angebote[2], 'screen1', '2026-10-28'), false)
pruefe('S1-09', 'ohne TV-Bild nie', R.angebotGilt(angebote[3], 'screen1', '2026-10-28'), false)

// ── Mischung ──
pruefe('S1-10', '3 Basis + 1 Angebot', R.mische(['B1', 'B2', 'B3'], ['A']), ['B1', 'A', 'B2', 'A', 'B3', 'A'])
pruefe('S1-10', '1 Basis + 3 Angebote: jedes einmal', R.mische(['B1'], ['A1', 'A2', 'A3']), ['B1', 'A1', 'A2', 'A3'])
pruefe('S1-10', 'nur Angebote', R.mische([], ['A1']), ['A1'])
pruefe('S1-10', 'keine Angebote', R.mische(['B1', 'B2'], []), ['B1', 'B2'])

// ── Bildschirm 1 komplett ──
pruefe('S1-01', 'Mo (kein MT-Tag): Sonder + Angebot', kurz(R.playlistScreen1(basis, D('2026-10-26'))), ['S:Warme Theke', 'A:lende', 'S:20', 'A:lende'])
pruefe('S1-01', 'MT-Tage fehlen → Mo–Fr (Mo mit MT)', kurz(R.playlistScreen1(Object.assign({}, basis, { mtSettings: null }), D('2026-10-26')))[0], 'MT:di:KW44')
pruefe('S1-10', 'Mi: MT, Angebot, Warme Theke …', kurz(R.playlistScreen1(basis, D('2026-10-28'))), ['MT:mi:KW44', 'A:lende', 'S:Warme Theke', 'A:lende', 'S:20', 'A:lende'])
pruefe('S1-04', 'Di 10.11.: kein MT, Warnung', [kurz(R.playlistScreen1(basis, D('2026-11-10'))), R.playlistScreen1(basis, D('2026-11-10')).info.some(i => i.regel === 'S1-04' && i.warnung)], [['S:Warme Theke', 'S:20'], true])
const manuell = { manualDay: 4, woche: 'manuell', gerichte: KW44, updatedAt: '2026-10-28T09:00:00Z' }
pruefe('S1-07', 'manuell am Sendetag: nur MT Donnerstag', kurz(R.playlistScreen1(Object.assign({}, basis, { screen1: manuell }), D('2026-10-28'))), ['MT:do:manuell'])
pruefe('S1-07', 'manuell am Folgetag: Automatik', kurz(R.playlistScreen1(Object.assign({}, basis, { screen1: manuell }), D('2026-10-29')))[0], 'MT:do:KW44')
pruefe('S1-11', 'Takt 10 s', R.playlistScreen1(basis, D('2026-10-28')).takt, 10)
pruefe('S1-13', 'leer → leere Liste', R.playlistScreen1({}, D('2026-10-25')).liste.length, 0)

// ── Bildschirm 2 und 3 ──
const bilder = [{ bild: 'b1.jpg', label: 'B1' }, { bild: 'b2.jpg', label: 'B2', aktiv: false }, { bild: 'b3.jpg', label: 'B3' }, { label: 'ohne Bild' }]
pruefe('S2-01', 'Bilder in Reihenfolge, pausierte/leere nicht', kurz(R.playlistBilder('screen2', bilder, [], D('2026-10-28'))), ['S:B1', 'S:B3'])
pruefe('S2-02', 'Angebote screen2 im Wechsel', kurz(R.playlistBilder('screen2', bilder, angebote, D('2026-10-28'))), ['S:B1', 'A:nur2', 'S:B3', 'A:nur2'])
pruefe('S2-03', 'Takt Standard 8 / Grenzen', [R.playlistBilder('screen2', [], [], D('2026-10-28')).takt, R.playlistBilder('screen2', [], [], D('2026-10-28'), 1).takt, R.playlistBilder('screen2', [], [], D('2026-10-28'), 999).takt], [8, 3, 120])
pruefe('S3-02', 'Screen 3: Angebot zuerst', kurz(R.playlistBilder('screen3', bilder, angebote, D('2026-10-28'))), ['A:lende', 'S:B1', 'S:B3'])
pruefe('S3-03', 'Screen 3 Takt Standard 10', R.playlistBilder('screen3', [], [], D('2026-10-28')).takt, 10)

console.log('\n' + ok + ' OK, ' + fehler + ' FEHLER')
process.exit(fehler ? 1 : 0)
