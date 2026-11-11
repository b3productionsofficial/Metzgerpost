-- MetzgerPost – eigene Hintergrund-Vorlagen für den Mittagstisch (neu, rein additiv)
-- Bisher sind die Hintergründe feste Dateien im Code (modules/mittagstisch/templates/…).
-- Hier kann pro Kunde und Format eine eigene Vorlage hochgeladen werden; ohne Eintrag gilt weiter die Datei aus dem Code.
-- Jede hochgeladene Version bleibt als Zeile erhalten (Verlauf / „zurück“); aktiv ist höchstens eine pro Kunde+Format.
create table if not exists public.mittag_vorlagen (
  id          uuid primary key default gen_random_uuid(),
  kunde_id    text not null,
  layout      text not null,                 -- z. B. 'mittagstisch_druck'
  format      text not null,                 -- 'story' | 'feed' | 'front' | 'back'
  bild_url    text,                          -- null = Standard aus dem Code
  breite      integer,
  hoehe       integer,
  positionen  jsonb,                         -- optional: Positionen wie layoutOverrides[layout][format]
  notiz       text,
  aktiv       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists mittag_vorlagen_kunde on public.mittag_vorlagen (kunde_id, layout, format, created_at desc);
create unique index if not exists mittag_vorlagen_eine_aktive on public.mittag_vorlagen (kunde_id, layout, format) where aktiv;

drop trigger if exists mittag_vorlagen_updated on public.mittag_vorlagen;
create trigger mittag_vorlagen_updated before update on public.mittag_vorlagen
  for each row execute function public.mp_set_updated_at();

alter table public.mittag_vorlagen enable row level security;
drop policy if exists "mittag_vorlagen lesen" on public.mittag_vorlagen;
drop policy if exists "mittag_vorlagen schreiben" on public.mittag_vorlagen;
create policy "mittag_vorlagen lesen" on public.mittag_vorlagen for select to authenticated using (true);
create policy "mittag_vorlagen schreiben" on public.mittag_vorlagen for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.mittag_vorlagen to authenticated;
