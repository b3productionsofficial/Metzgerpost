# CLAUDE_CONTEXT.md — MetzgerPost

> Automatisch generierte Kontextdatei. Stand: 2026-05-31.
> Dient als sofortiger Kontext für Claude-Chats ohne weitere Erklärung.

---

## 1. Projektname & Zweck

**MetzgerPost** ist eine SaaS-Plattform für Metzgereien und Gastronomiebetriebe (Deutschland).
Die App ermöglicht es, wöchentliche Mittagstisch-Karten zu erstellen und auf mehreren Kanälen auszuspielen:

- **Instagram Feed & Story** (1080×1350 / 1080×1920) → PNG-Download
- **Print A4** (Vorder-/Rückseite, 3508×2480) → PNG-Download
- **TV-Displays im Laden** (3 Bildschirme, 16:9, Realtime-Sync über Supabase)

Zielgruppe: Kleine Metzgereibetriebe. Erster produktiver Kunde: Metzgerei Sorg & Seitz.

---

## 2. Tech Stack

| Bereich | Technologie |
|---|---|
| Frontend | **Vanilla JavaScript** (kein Framework, kein Build-Step) |
| Backend / DB | **Supabase** (PostgreSQL + Auth + Storage + Realtime) |
| Hosting | **Netlify** (statisch, Auto-Deploy aus git) |
| Fonts | Google Fonts (CDN): Syne, DM Sans, IBM Plex Serif, Raleway, Playfair Display, Lora |
| Libraries | Nur `@supabase/supabase-js@2` (CDN) |
| Styling | Reines CSS, eigenes Design-System (`shared/style.css`) |
| Bilder | Canvas API für alle Grafikerzeugung |

Kein npm, kein package.json, kein TypeScript, kein Bundler.

---

## 3. Projektstruktur

```
Metzgerpost/
├── auth.html                        # Login / Registrierung
├── dashboard.html                   # Hauptdashboard nach Login
├── supabase-schema.sql              # DB-Schema (einmalig im Supabase SQL Editor ausführen)
├── netlify.toml                     # Redirect: / → /dashboard.html
├── CLAUDE_CONTEXT.md                # Diese Datei
│
├── shared/
│   ├── supabase.js                  # Supabase Client + Auth-Guards + DB-Funktionen (window.MP)
│   ├── components.js                # Nav, Toast, Modal, Confirm, formatDate, mpInit
│   └── style.css                    # Design-System (CSS-Variablen, Komponenten)
│
└── modules/
    ├── mittagstisch/
    │   ├── index.html               # Generator-UI (Woche auswählen, Canvas-Preview, Download)
    │   ├── admin.html               # Admin-Panel (Gerichte verwalten, Layout-Editor mit Drag)
    │   ├── config.js                # standardGerichte, kunden, kundenGerichte, kundenLayouts
    │   ├── layouts.js               # standardLayouts (Fallback-Positionen für Canvas)
    │   ├── script.js                # Generator-Logik (~1200 Zeilen)
    │   ├── admin.js                 # Admin-Logik (~1150 Zeilen)
    │   ├── templates/               # Hintergrundbilder (JPG): klassisch-feed, klassisch-story, etc.
    │   └── Gerichte/                # Gerichtsfotos (26 JPGs)
    │
    └── display/
        ├── index.html               # Display Manager UI (verwaltet alle 3 Screens)
        ├── screen.html              # Screen 1 — Mittagstisch-Anzeige (TV, kein Auth)
        ├── screen2.html             # Screen 2 — Preislisten-Slideshow (TV, kein Auth)
        ├── screen3.html             # Screen 3 — Angebots-Bilder-Rotation (TV, kein Auth)
        ├── tv.html / tv1-3.html     # Ältere TV-Varianten (Legacy)
        └── assets/                  # Screenshot-Assets
```

---

## 4. Architektur & Datenfluss

### Authentifizierung
```
Browser → Supabase Auth (Email+Passwort oder Magic Link)
        → Session gespeichert im Browser (localStorage via Supabase SDK)
        → requireAuth() / requireAdmin() in shared/supabase.js
```

**Admin-Erkennung:** `MP.userPlan === 'admin'` — geladen aus `kunden.plan` (DB), nicht aus `user_metadata`
- `MP.loadUserPlan()` lädt `SELECT plan FROM kunden WHERE user_id = auth.uid()` und setzt `window.MP.userPlan`
- Wird in `mpInit()` aufgerufen → bei jedem Seitenstart automatisch gesetzt
- Fallback: `'basis'`

### Kunden-ID-Konvention
**Grundprinzip: Die Kunden-ID ist immer der Anker für alle Daten — nie die Admin-ID.**

Alle Daten werden mit einer `kundeId` verknüpft, die über `MP.getAktiveKundeId()` ermittelt wird:
- **Normaler Kunde:** `user.id.substring(0, 8)` (erste 8 Zeichen der UUID)
- **Admin:** liest `localStorage('mp_admin_selected_kunde')` (Key aus `config.js kunden`-Objekt); Fallback: erster Eintrag in `kunden`

Admin und Kunde schreiben damit in **denselben Supabase-Datensatz** — kein Mismatch.

Dies gilt für alle Tabellen: `gerichte`, `wochenplaene`, `displays`, `wochen`, `screen2_config`, `screen3_config`.

### Admin-Kunden-Selector (Dashboard)
Admins sehen auf `dashboard.html` direkt unter dem Willkommens-Banner ein Dropdown mit allen Kunden aus `config.js`. Bei Auswahl wird die ID in `localStorage('mp_admin_selected_kunde')` gespeichert — **kein Seiten-Reload**. Alle Module lesen die gewählte ID via `MP.getAktiveKundeId()`.

Die Navigationsleiste zeigt für Admins zusätzlich `📍 KundenName` an (aus `window.kunden` + localStorage), damit immer sichtbar ist für welchen Kunden gearbeitet wird.

### Mittagstisch-Generator (Kernfunktion)
```
1. Nutzer wählt Vorlage (Instagram/Print) und Kunde
2. script.js lädt Gerichte aus localStorage (mit config.js als Fallback)
3. Nutzer wählt pro Wochentag (Di–Fr) ein Gericht aus Dropdown
4. renderToCanvas() zeichnet auf HTML5-Canvas:
   - Hintergrundbild (template JPG)
   - Kreisförmige Gerichts-Fotos (drawImageCover)
   - Texte und Preise (drawWrappedText)
   - Positions-Daten aus kundenLayouts (config.js) oder Layout-Overrides (localStorage)
5. Download als PNG
6. Optional: In localStorage als "Gespeicherte Woche" speichern
```

### Display-System (Realtime TV)
```
Display Manager (index.html)
  │
  ├─ Screen 1 (screen.html): Mittagstisch-Tagesanzeige
  │    • Liest: displays WHERE screen_id='screen1'
  │    • Realtime-Subscription auf Änderungen
  │    • Automatik-Modus: erkennt Wochentag + KW aus URL-Parameter
  │    • Manuell-Modus: fester Tag/Woche aus displays
  │    • Sonderlayouts: Bild überschreibt Mittagstisch an best. Wochentagen/Datum
  │    • Konfiguration: displays WHERE screen_id='mt_settings' (Mittagstisch-Tage)
  │    • Sonder-Config: displays WHERE screen_id='sonder_configs'
  │
  ├─ Screen 2 (screen2.html): Preislisten-Slideshow
  │    • Liest: screen2_config WHERE kunde_id=...
  │    • Slides mit Hintergrundbild + Sektionen (Titel + Items mit Preis)
  │    • Konfigurierbares Timer-Intervall (3–30s)
  │    • Realtime-Subscription auf Änderungen
  │
  └─ Screen 3 (screen3.html): Angebots-Rotation
       • Liest: screen3_config WHERE kunde_id=...
       • Zeigt hochgeladene Bilder rotierend (5–60s Intervall)
       • Bilder in Supabase Storage: screen-assets/{kundeId}/screen3/
```

### Supabase Storage
- Bucket: `screen-assets`
- Pfad-Schema: `{kundeId}/screen1/sonder/{filename}` (Sonderlayouts)
- Pfad-Schema: `{kundeId}/screen2/slide{N}_{timestamp}.{ext}` (Screen-2-Hintergründe)
- Pfad-Schema: `{kundeId}/screen3/{filename}` (Screen-3-Layouts)

### Window-Namespace
Alle Module teilen sich `window.MP` (aus `shared/supabase.js`):
```js
window.MP = {
  getSB,             // Supabase Client (Singleton)
  requireAuth,       // → redirect zu auth.html wenn kein Login
  requireAdmin,      // → redirect zu dashboard.html wenn MP.userPlan !== 'admin'
  getUser,
  signOut,
  getKundeData, saveKundeData,
  publishDisplay, getDisplayContent,
  getGerichte, saveGericht,
  saveWochenplan, getWochenplaene,
  loadUserPlan,      // SELECT plan FROM kunden WHERE user_id = auth.uid() → setzt MP.userPlan
  getAktiveKundeId,  // Admin: aus localStorage; Kunde: user.id.substring(0,8)
  userPlan: 'basis'  // gesetzt von loadUserPlan() — immer aus DB, nie user_metadata
}
```
`window.showToast`, `window.mpInit`, `window.formatDate`, `window.formatRelative` kommen aus `shared/components.js`.

---

## 5. Wichtigste Dateien

| Datei | Zweck |
|---|---|
| `shared/supabase.js` | Supabase-Client, Auth-Guards, DB-Wrapper. **Enthält Credentials im Klartext.** |
| `shared/components.js` | `mpInit()` (Auth + Nav), `showToast()`, `mpConfirm()`, Format-Helpers |
| `shared/style.css` | Design-Tokens (CSS-Vars), alle UI-Komponenten |
| `modules/mittagstisch/config.js` | Alle Kundendaten, Gerichte, Canvas-Layoutpositionen (pixel-genau) |
| `modules/mittagstisch/script.js` | Canvas-Rendering, Download, Datenpersistenz (localStorage) |
| `modules/mittagstisch/admin.js` | Admin-Panel: Gerichte-CRUD, visueller Layout-Editor mit Drag&Drop |
| `modules/display/index.html` | Display Manager: Wochen senden, Screen 2/3 konfigurieren, Sonderlayouts |
| `modules/display/screen.html` | TV-Ansicht Screen 1 (Mittagstisch, Realtime, kein Login) |
| `modules/display/screen2.html` | TV-Ansicht Screen 2 (Preislisten-Slides, Realtime) |
| `modules/display/screen3.html` | TV-Ansicht Screen 3 (Bild-Rotation, Realtime) |
| `supabase-schema.sql` | DB-Tabellen + RLS-Policies (einmalig ausführen) |

---

## 6. Datenbankschema

### Tabellen (aus `supabase-schema.sql` + tatsächliche Nutzung im Code)

```sql
-- Kundenprofil (1:1 mit auth.users)
kunden (
  id UUID PK,
  user_id UUID FK→auth.users ON DELETE CASCADE UNIQUE,
  name TEXT,
  plan TEXT DEFAULT 'basis',  -- 'basis' | 'plus' | 'pro' | 'admin'
  created_at TIMESTAMPTZ
)

-- Gerichte (pro Kunde, für Supabase-Sync — noch wenig genutzt, meist localStorage)
gerichte (
  id UUID PK,
  kunde_id TEXT,              -- user_id.substring(0,8)
  key TEXT,                   -- z.B. 'gulasch'
  name TEXT,
  preis TEXT,
  bild_url TEXT,
  created_at TIMESTAMPTZ,
  UNIQUE(kunde_id, key)
)

-- Wochenpläne (Legacy / selten genutzt, meist localStorage)
wochenplaene (
  id UUID PK,
  kunde_id TEXT,
  woche TEXT,
  gerichte JSONB,
  format TEXT DEFAULT 'instagram',
  created_at TIMESTAMPTZ
)

-- Displays (Allgemein-KV-Store für Screen-Inhalte + Settings)
displays (
  id UUID PK,
  kunde_id TEXT,
  screen_id TEXT,  -- 'screen1', 'screen2', 'screen3', 'mt_settings', 'sonder_configs'
  content JSONB,
  updated_at TIMESTAMPTZ,
  UNIQUE(kunde_id, screen_id)
)

-- Wochen (neue Tabelle, im Schema noch nicht dokumentiert)
wochen (
  id UUID PK,
  kunde_id TEXT,
  woche_label TEXT,
  kw INT,
  gerichte JSONB,  -- { dienstag: [{name, bild, preis}], mittwoch: [...], ... }
  gueltig_ab DATE (oder TIMESTAMPTZ),
  created_at TIMESTAMPTZ
)

-- Screen-2-Konfiguration (eigene Tabelle)
screen2_config (
  kunde_id TEXT PK (UNIQUE),
  slides JSONB,               -- [{label, bild, sektionen:[{titel, items:[{name,preis}]}]}]
  timer_sekunden INT,
  updated_at TIMESTAMPTZ
)

-- Screen-3-Konfiguration (eigene Tabelle)
screen3_config (
  kunde_id TEXT PK (UNIQUE),
  aktive_layouts JSONB,       -- [{id, label, bild}]
  timer_sekunden INT,
  updated_at TIMESTAMPTZ
)
```

### RLS-Policies
- `kunden`: `auth.uid() = user_id`
- `gerichte`, `wochenplaene`: `kunde_id = substring(auth.uid()::text, 1, 8)`
- `displays` SELECT: öffentlich (TV braucht kein Login)
- `displays` INSERT/UPDATE: aktuell `with check (true)` / `using (true)` — **faktisch keine Einschränkung**
- `wochen`, `screen2_config`, `screen3_config`: **nicht im Schema-File**, müssen separat angelegt worden sein

### Supabase Storage
- Bucket: `screen-assets` (Public Read)

---

## 7. Design-System (CSS-Variablen)

```css
--bg: #0f0d0b;           /* Seiten-Hintergrund */
--surface: #1a1712;      /* Karten-Hintergrund */
--surface2: #221f19;     /* Verschachtelte Fläche */
--border: #2e2a24;       /* Border standard */
--border2: #3d3830;      /* Border hover */
--text: #f0ece4;         /* Haupttext */
--muted: #8a8070;        /* Sekundärtext */
--muted2: #5a5248;       /* Tertiärtext */
--accent: #d4853a;       /* Orange Akzent */
--accent-dim: rgba(212,133,58,.12);
--success: #3a9e6a;
--radius: 12px;
--radius-sm: 8px;
--radius-xs: 6px;
```

Fonts: `Syne` (Display/Überschriften), `DM Sans` (Body).

---

## 8. Hauptfeatures

### A) Mittagstisch-Generator (`modules/mittagstisch/`)
- Wähle Kunde + Vorlage (Instagram Feed/Story, Print A4)
- Wähle Di–Fr Gerichte aus Dropdown (Bild + Preis aus config.js oder localStorage)
- Live-Canvas-Preview wird nach jeder Änderung neu gerendert
- Download als PNG (einzeln oder alle auf einmal)
- Wochen in localStorage speichern/laden/löschen (unter Key `mp_wochen_{kundeId}`)
- Caption-Generator für Instagram

**Sonderfall Metzgerei Götz:** Textbasiertes Layout ohne Gerichtsfotos — eigene Dropdown-Logik

### B) Admin-Panel (`modules/mittagstisch/admin.html`)
- Gerichte bearbeiten (Name, Preis, Bild-Pfad) — gespeichert in Supabase (`gerichte`-Tabelle) + localStorage als Cache
- Beim Laden: Supabase zuerst, localStorage wird als Cache befüllt (Fallback: config.js)
- Visueller Layout-Editor: Canvas-Preview mit klickbarem Drag&Drop für Bild/Text/Preis-Elemente
- Pixel-genaue Positionsoverrides pro Kunde/Format/Tag — gespeichert in localStorage (`mp_layout_overrides_{kundeId}`)
- Reset auf Standardwerte

### C) Display Manager (`modules/display/index.html`)
- **Screen 1 (Mittagstisch):**
  - Gespeicherte Wochen aus `wochen`-Tabelle laden und auf Screen 1 senden
  - Automatik-Modus (aktuelle KW + Wochentag) oder Manuell-Modus
  - Mittagstisch-Tage konfigurieren (welche Wochentage anzeigen)
  - Sonderlayouts: Bild hochladen + Wochentage/Datum zuweisen (überschreibt Mittagstisch)
- **Screen 2 (Preislisten):**
  - Folien mit Hintergrundbild + Sektionen (z.B. „Duroc Schwein → Rücken 14,00 €/kg")
  - Timer-Intervall für automatischen Folienwechsel
- **Screen 3 (Angebote):**
  - Saison-/Aktions-Bilder hochladen (Grillsaison, Ostern, etc.)
  - Ausgewählte Bilder rotieren mit Timer

### D) TV-Screens (kein Login erforderlich)
URL-Muster: `/modules/display/screen.html?kunde={kundeId8}&screen=screen1`
- Laden Inhalt per Supabase Realtime (kein Polling)
- Screen 1: Zeigt Gerichts-Overlay auf Hintergrundbild (Canvas-ähnliche Darstellung mit CSS-Positionierung)
- Screen 2: Slideshow mit Preislisten
- Screen 3: Bilder-Rotation

---

## 9. Bekannte Probleme / TODOs / Offene Punkte

### Sicherheit
- **Supabase-Credentials im Klartext** in `shared/supabase.js` und `modules/display/screen2.html` (und wahrscheinlich weiteren Screen-Dateien). Der ANON-Key ist öffentlich sichtbar. Das ist bei Supabase üblich, solange RLS korrekt konfiguriert ist — aber die RLS für `displays` INSERT/UPDATE ist aktuell `with check (true)`, d.h. jeder kann alles schreiben.
- Admin-Erkennung nur client-seitig über `user_metadata.plan`
- `wochen`, `screen2_config`, `screen3_config` haben keine RLS-Policy im Schema-File

### Technische Schulden
- Sehr große Dateien: `script.js` (~1200 Zeilen), `admin.js` (~1150 Zeilen), `screen.html` (>700 Zeilen)
- ~~Primär localStorage statt Supabase-DB für Gerichte~~ **Erledigt (2026-05-31):** Gerichte schreiben/lesen Supabase; localStorage ist jetzt nur noch offline Cache
- Wochenpläne (script.js): noch in localStorage — synchronisiert nicht zwischen Geräten
- `supabase-schema.sql` ist unvollständig — die Tabellen `wochen`, `screen2_config`, `screen3_config` fehlen
- Doppelte/redundante Tabellen: `wochenplaene` (altes Schema) vs. `wochen` (neue Tabelle, wird im Display Manager genutzt) — unklar welche wirklich befüllt wird
- `tv.html` / `tv1.html` / `tv2.html` / `tv3.html` sind ältere Varianten — vermutlich Legacy

### Geplant / Coming Soon (aus `dashboard.html`)
- **Angebote**-Modul (Angebots-Karten erstellen)
- **Schichtplan**-Modul
- ~~Supabase-Integration für Admin.js (`saveGerichteToSupabase` / `loadGerichteFromSupabase` waren Stubs)~~ **Erledigt (2026-05-31)**
- ~~`kunde_id` Mismatch: Admin schrieb unter eigener ID, Kunde unter Kunden-ID~~ **Erledigt (2026-05-31):** `MP.getAktiveKundeId()` stellt sicher dass Admin immer unter Kunden-ID arbeitet

### Bekannte Bugs (aus git log)
- Screen 3: `startReloadTrigger` entfernt (war fälschlicherweise vorhanden)
- Screen 2: Doppelter Bilddownload beim Start verhindert
- Mittagstisch-Display: Montag-Unterstützung vervollständigt
- Sonderbild Cache-Buster: nur einmal pro Ladezyklus
- Screen 2: 30s-Polling durch Realtime-Subscription ersetzt

---

## 10. Deployment & Startbefehle

### Lokale Entwicklung
Da kein Build-Step existiert, reicht ein lokaler HTTP-Server:
```bash
# Option 1: Python
python3 -m http.server 8080

# Option 2: npx serve
npx serve .

# Option 3: VS Code Live Server Extension
```
Dann: http://localhost:8080/dashboard.html

### Netlify (Produktion)
- Auto-Deploy bei `git push` auf `main`
- Root-Redirect via `netlify.toml`: `/ → /dashboard.html (301)`
- Kein Build-Command, kein Publish-Directory (alles statisch)

### Supabase Setup (einmalig)
1. Supabase-Projekt anlegen
2. `supabase-schema.sql` im SQL-Editor ausführen
3. Tabellen `wochen`, `screen2_config`, `screen3_config` manuell anlegen (fehlen im Schema)
4. Storage-Bucket `screen-assets` anlegen (Public Read)
5. Credentials in `shared/supabase.js` eintragen

### Screen-URL für TV
Die `kunde=`-Parameter trägt immer die **Kunden-ID** (nie die Admin-ID).
Beispiel für den ersten produktiven Kunden (Metzgerei Sorg & Seitz, Kunden-ID `6544d8e6`):
```
https://{domain}/modules/display/screen.html?kunde=6544d8e6&screen=screen1
https://{domain}/modules/display/screen2.html?kunde=6544d8e6&screen=screen2
https://{domain}/modules/display/screen3.html?kunde=6544d8e6&screen=screen3
```
Allgemeines Muster: `?kunde={kunden_user_id_first_8_chars}&screen=screen{N}`

---

## 11. Kunden / Tenants

Aktuell 4 konfigurierte Kunden in `config.js` (statisch, nicht DB-gesteuert):

| Key | Name | Layouts |
|---|---|---|
| `sorgundseitz` | Metzgerei Sorg & Seitz | mittagstisch, catering |
| `schilling` | Motorrad Schilling | event |
| `erkenbrecher` | Schreinerei Erkenbrecher | referenzen |
| `metzgereigoetz` | Metzgerei Götz | mittagstisch (Text-Layout) |

Neuer Kunde hinzufügen: Eintrag in `kunden`, `kundenGerichte`, `kundenLayouts` in `config.js` + ggf. Template-JPG in `templates/`.

---

## 12. Changelog

### 2026-05-31
- **feat: Admin-Kunden-Selector im Display Manager** (`modules/display/index.html`)
  - Dropdown oben im Header, nur sichtbar für Admins (`user_metadata.plan === 'admin'`)
  - Speichert gewählte Kunden-ID in `localStorage('mp_admin_selected_kunde')` + `location.reload()`
  - Alle Display-Manager-Operationen laufen mit der gewählten Kunden-ID

- **feat: `MP.getAktiveKundeId()`** (`shared/supabase.js`)
  - Zentrale Funktion statt direktem `user.id.substring(0,8)` im Display Manager
  - Admin: aus localStorage; normaler Kunde: `user.id.substring(0,8)`

- **feat: Gerichte aus Supabase** (`modules/mittagstisch/admin.js`)
  - `saveGerichteToSupabase`: UPSERT auf `gerichte`-Tabelle, Felder `key/name/preis/bild_url`, onConflict `(kunde_id,key)`
  - `loadGerichteFromSupabase`: liest `gerichte`-Tabelle, konvertiert Array → Objekt; Fallback auf config.js
  - `saveGerichte`, `addGericht`, `deleteGericht`: schreiben nun in Supabase + localStorage-Cache
  - DOMContentLoaded lädt Gerichte aus Supabase und befüllt localStorage-Cache (offline-Fallback)

- **feat: Kunden-Selector ins Dashboard verlagert** (`dashboard.html`, `shared/components.js`)
  - Selector unter Welcome-Banner, nur Admin sichtbar, kein Seiten-Reload
  - Nav zeigt `📍 KundenName` für Admins (aus `window.kunden` + localStorage)
  - Selector aus Display Manager entfernt

- **fix: Admin-Erkennung aus user_metadata** (Rollback von kunden-Tabelle, 404-Fix)
  - `loadUserPlan()`: `user.user_metadata?.plan ?? 'basis'` statt DB-Abfrage

- **fix: Admin-Erkennung aus kunden-Tabelle** (`shared/supabase.js`, `shared/components.js`)
  - `loadUserPlan()`: `SELECT plan FROM kunden WHERE user_id = auth.uid()` → `MP.userPlan`
  - `mpInit()` ruft `loadUserPlan()` auf — Plan bei jedem Seitenstart gesetzt
  - `requireAdmin()`, `getAktiveKundeId()`, Display Manager Selector, Dashboard Admin-Karte nutzen jetzt `MP.userPlan`
  - `user_metadata.plan` wird nicht mehr verwendet

- **fix: Einmalige Datenmigration** — Admin-Daten (unter `057b6a13`) auf Kunden-ID (`6544d8e6`) migriert
  - TV-URL läuft jetzt korrekt auf `?kunde=6544d8e6`
  - Admin und Kunde schreiben seither in denselben Supabase-Datensatz
