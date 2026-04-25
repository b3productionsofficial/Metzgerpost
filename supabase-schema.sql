-- ══════════════════════════════════════════════
-- MetzgerPost v1.0 — Supabase Schema
-- Einmalig im SQL Editor ausführen
-- ══════════════════════════════════════════════

-- ── Kunden-Profile ──
create table if not exists kunden (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  plan        text default 'basis',  -- basis, plus, pro, admin
  created_at  timestamptz default now(),
  unique(user_id)
);

-- ── Gerichte (pro Kunde) ──
create table if not exists gerichte (
  id          uuid default gen_random_uuid() primary key,
  kunde_id    text not null,  -- user_id substring
  key         text not null,
  name        text not null,
  preis       text,
  bild_url    text,
  created_at  timestamptz default now(),
  unique(kunde_id, key)
);

-- ── Wochenpläne ──
create table if not exists wochenplaene (
  id          uuid default gen_random_uuid() primary key,
  kunde_id    text not null,
  woche       text,
  gerichte    jsonb,
  format      text default 'instagram',
  created_at  timestamptz default now()
);

-- ── Display Inhalte ──
create table if not exists displays (
  id          uuid default gen_random_uuid() primary key,
  kunde_id    text not null,
  screen_id   text not null,  -- screen1, screen2, screen3
  content     jsonb,
  updated_at  timestamptz default now(),
  unique(kunde_id, screen_id)
);

-- ── Row Level Security ──
alter table kunden       enable row level security;
alter table gerichte     enable row level security;
alter table wochenplaene enable row level security;
alter table displays     enable row level security;

-- Kunden: nur eigene Daten
create policy "Eigene Kunden-Daten" on kunden
  for all using (auth.uid() = user_id);

-- Gerichte: nur eigene
create policy "Eigene Gerichte" on gerichte
  for all using (kunde_id = substring(auth.uid()::text, 1, 8));

-- Wochenpläne: nur eigene
create policy "Eigene Wochenpläne" on wochenplaene
  for all using (kunde_id = substring(auth.uid()::text, 1, 8));

-- Displays: LESEN für alle (TV braucht keinen Login), SCHREIBEN nur eigene
create policy "Display lesen (public)" on displays
  for select using (true);

create policy "Display schreiben (eigen)" on displays
  for insert with check (true);

create policy "Display updaten (eigen)" on displays
  for update using (true);
