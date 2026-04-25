/* ══════════════════════════════════════════════
   MetzgerPost — Shared Supabase Client
   Einmal definiert, überall nutzbar
══════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://jfrqbchgrpixwlecerax.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnFiY2hncnBpeHdsZWNlcmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1ODk5NDksImV4cCI6MjA5MDE2NTk0OX0.AnSqi2rJ46PN8dm6zMUgRDNMdXlwRRaES4JQ4Fozn10'

// Globaler Supabase Client — wird von allen Modulen genutzt
let _sb = null
function getSB() {
  if (!_sb) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  return _sb
}

/* ── Auth Guards ── */
async function requireAuth(redirectTo = '/auth.html') {
  const sb = getSB()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.replace(redirectTo); return null }
  return session.user
}

async function requireAdmin(redirectTo = '/auth.html') {
  const user = await requireAuth(redirectTo)
  if (!user) return null
  const plan = user.user_metadata?.plan || 'basis'
  if (plan !== 'admin') { window.location.replace('/dashboard.html'); return null }
  return user
}

async function getUser() {
  const sb = getSB()
  const { data: { session } } = await sb.auth.getSession()
  return session?.user || null
}

async function signOut() {
  await getSB().auth.signOut()
  window.location.replace('/auth.html')
}

/* ── Kunden-Daten ── */
async function getKundeData(userId) {
  const sb = getSB()
  const { data } = await sb
    .from('kunden')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}

async function saveKundeData(userId, data) {
  const sb = getSB()
  return await sb
    .from('kunden')
    .upsert({ user_id: userId, ...data })
}

/* ── Display Sync ── */
async function publishDisplay(kundeId, screenId, content) {
  const sb = getSB()
  return await sb
    .from('displays')
    .upsert({
      kunde_id: kundeId,
      screen_id: screenId,
      content: content,
      updated_at: new Date().toISOString()
    })
}

async function getDisplayContent(kundeId, screenId) {
  const sb = getSB()
  const { data } = await sb
    .from('displays')
    .select('*')
    .eq('kunde_id', kundeId)
    .eq('screen_id', screenId)
    .single()
  return data
}

/* ── Gerichte (pro Kunde in Supabase) ── */
async function getGerichte(kundeId) {
  const sb = getSB()
  const { data } = await sb
    .from('gerichte')
    .select('*')
    .eq('kunde_id', kundeId)
    .order('name')
  return data || []
}

async function saveGericht(kundeId, gericht) {
  const sb = getSB()
  return await sb
    .from('gerichte')
    .upsert({ kunde_id: kundeId, ...gericht })
}

/* ── Wochenpläne ── */
async function saveWochenplan(kundeId, plan) {
  const sb = getSB()
  return await sb
    .from('wochenplaene')
    .insert({
      kunde_id: kundeId,
      woche: plan.woche,
      gerichte: plan.gerichte,
      format: plan.format,
      created_at: new Date().toISOString()
    })
}

async function getWochenplaene(kundeId, limit = 10) {
  const sb = getSB()
  const { data } = await sb
    .from('wochenplaene')
    .select('*')
    .eq('kunde_id', kundeId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

window.MP = {
  getSB, requireAuth, requireAdmin, getUser, signOut,
  getKundeData, saveKundeData,
  publishDisplay, getDisplayContent,
  getGerichte, saveGericht,
  saveWochenplan, getWochenplaene
}
