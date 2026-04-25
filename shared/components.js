/* ══════════════════════════════════════════════
   MetzgerPost — Shared Components
   Nav, Toast, Modal, Utils
══════════════════════════════════════════════ */

/* ── Nav Component ── */
function renderNav(options = {}) {
  const { backUrl, backLabel, actions = [] } = options
  const nav = document.getElementById('mp-nav')
  if (!nav) return

  const user = window._mpUser
  const name = user?.user_metadata?.betrieb_name || user?.email?.split('@')[0] || '…'

  nav.innerHTML = `
    <div class="mp-flex" style="gap:16px;">
      <a class="mp-nav-logo" href="/dashboard.html">Metzger<span>Post</span></a>
      ${backUrl ? `<a href="${backUrl}" class="mp-btn mp-btn-secondary mp-btn-sm">← ${backLabel || 'Zurück'}</a>` : ''}
    </div>
    <div class="mp-nav-right">
      ${actions.map(a => `<button class="mp-btn mp-btn-secondary mp-btn-sm" onclick="${a.onclick}">${a.label}</button>`).join('')}
      <span class="mp-nav-user">${name}</span>
      <button class="mp-btn mp-btn-secondary mp-btn-sm" onclick="MP.signOut()">Abmelden</button>
    </div>`
}

/* ── Toast ── */
let _toastTimer = null
function showToast(msg, type = 'success', duration = 2800) {
  let toast = document.getElementById('mp-toast')
  if (!toast) {
    toast = document.createElement('div')
    toast.id = 'mp-toast'
    toast.className = 'mp-toast'
    document.body.appendChild(toast)
  }
  toast.textContent = msg
  toast.className = `mp-toast ${type}`
  clearTimeout(_toastTimer)
  setTimeout(() => toast.classList.add('show'), 10)
  _toastTimer = setTimeout(() => toast.classList.remove('show'), duration)
}

/* ── Modal ── */
function openModal(id) {
  const el = document.getElementById(id)
  if (el) el.classList.add('open')
}
function closeModal(id) {
  const el = document.getElementById(id)
  if (el) el.classList.remove('open')
}
function closeModalOnOverlay(e) {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open')
}

/* ── Confirm Dialog ── */
function mpConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'mp-modal-overlay open'
    overlay.innerHTML = `
      <div class="mp-modal" style="max-width:360px;">
        <div class="mp-modal-title" style="font-size:17px;">${message}</div>
        <div class="mp-modal-actions">
          <button class="mp-btn mp-btn-secondary" id="mp-confirm-no">Abbrechen</button>
          <button class="mp-btn mp-btn-danger" id="mp-confirm-yes">Bestätigen</button>
        </div>
      </div>`
    document.body.appendChild(overlay)
    overlay.querySelector('#mp-confirm-yes').onclick = () => { document.body.removeChild(overlay); resolve(true) }
    overlay.querySelector('#mp-confirm-no').onclick  = () => { document.body.removeChild(overlay); resolve(false) }
  })
}

/* ── Format Helpers ── */
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' })
}
function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 7)  return `vor ${days} Tagen`
  return formatDate(iso)
}

/* ── Init Helper ── */
async function mpInit(options = {}) {
  // Auth prüfen
  const user = await MP.requireAuth()
  if (!user) return null
  window._mpUser = user

  // Nav rendern
  renderNav(options.nav || {})

  // Body Glow
  if (options.glow !== false) document.body.classList.add('mp-bg-glow')

  return user
}

window.showToast = showToast
window.openModal = openModal
window.closeModal = closeModal
window.closeModalOnOverlay = closeModalOnOverlay
window.mpConfirm = mpConfirm
window.mpInit = mpInit
window.formatDate = formatDate
window.formatRelative = formatRelative
