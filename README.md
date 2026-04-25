# MetzgerPost v1.0

Modulares SaaS-Tool für Metzgereien und Restaurants.

## Struktur

```
metzgerpost/
├── auth.html              → Login / Registrierung
├── dashboard.html         → Modul-Übersicht (Startseite nach Login)
│
├── shared/
│   ├── style.css          → Design System (Tokens, Components)
│   ├── supabase.js        → Auth + DB Client (MP.*)
│   └── components.js      → Nav, Toast, Modal, Utils
│
├── modules/
│   ├── mittagstisch/      → Generator (bestehender Code hierher kopieren)
│   │   ├── wizard.html    → 5-Schritt Wizard
│   │   ├── index.html     → Alter Generator (stabil)
│   │   └── admin.html     → Layout Editor
│   │
│   ├── display/           → Bildschirm-Steuerung
│   │   ├── index.html     → Display Manager
│   │   └── screen.html    → TV-Ansicht (kein Login nötig)
│   │
│   └── angebote/          → kommt später
│
└── supabase-schema.sql    → Einmalig in Supabase SQL Editor ausführen
```

## Setup

### 1. Supabase Schema einrichten
1. Öffne https://supabase.com → dein Projekt
2. Gehe zu SQL Editor
3. Führe `supabase-schema.sql` aus

### 2. Bestehenden Code migrieren
Kopiere aus dem alten Repo:
- `wizard.html` → `modules/mittagstisch/wizard.html`
- `index.html` → `modules/mittagstisch/index.html`
- `admin.html` → `modules/mittagstisch/admin.html`
- `config.js` → `modules/mittagstisch/config.js`
- `layouts.js` → `modules/mittagstisch/layouts.js`
- `script.js` → `modules/mittagstisch/script.js`
- `Gerichte/` → `modules/mittagstisch/Gerichte/`
- `templates/` → `modules/mittagstisch/templates/`

### 3. Pfade anpassen
In wizard.html, index.html, admin.html die Script-Pfade anpassen:
```html
<!-- Alt -->
<script src="config.js"></script>
<!-- Neu -->
<script src="../../shared/supabase.js"></script>
<link rel="stylesheet" href="../../shared/style.css">
<script src="config.js"></script>
```

### 4. Auth Guards aktualisieren
In allen Modul-Dateien den Auth-Guard ersetzen:
```html
<!-- Alt (inline) -->
<script>
(async () => {
  const sb = window.supabase.createClient(URL, KEY)
  ...
})()
</script>

<!-- Neu (shared) -->
<script src="../../shared/supabase.js"></script>
<script src="../../shared/components.js"></script>
<script>
window.addEventListener('DOMContentLoaded', async () => {
  const user = await mpInit()
  if (!user) return
  // dein Code...
})
</script>
```

### 5. Display-Modul aktivieren
Die screen.html URL hat folgendes Format:
```
https://deine-domain.netlify.app/modules/display/screen.html?kunde=USER_ID&screen=screen1
```

Die USER_ID ist die ersten 8 Zeichen der Supabase User-ID.
Diese URL auf dem TV/Smart Display im Browser öffnen.

## Module Status

| Modul | Status | Beschreibung |
|-------|--------|-------------|
| Mittagstisch | ✅ Aktiv | Generator, Wizard, Admin |
| Display | 🔜 Beta | Manager + Screen-Ansicht |
| Angebote | 💡 Geplant | Aktionen verwalten |
| Schichtplan | 💡 Geplant | Mitarbeiter einteilen |

## Deploy

```bash
git add .
git commit -m "MetzgerPost v1.0"
git push
# → Netlify deployed automatisch
```
