-- ══════════════════════════════════════════════
-- MetzgerPost — Modul Angebote
-- Rein additiv: legt nur NEUE Tabellen an, ändert keine bestehenden.
-- Angewendet am 25.10.2026 als Migration "angebote_modul".
-- ══════════════════════════════════════════════

-- ── Produktbibliothek für Angebote (getrennt von Mittagstisch-Gerichten) ──
create table if not exists public.angebots_produkte (
  id          uuid primary key default gen_random_uuid(),
  kunde_id    text not null,                       -- wie überall: MP.getAktiveKundeId()
  name        text not null,
  einheit     text not null default 'kg'
              check (einheit in ('kg', '100g', 'stueck')),
  bild_url    text,                                -- Storage-URL oder relativer App-Pfad
  sortierung  int  not null default 0,
  aktiv       boolean not null default true,       -- "löschen" = deaktivieren, alte Angebote bleiben intakt
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists angebots_produkte_kunde_idx on public.angebots_produkte (kunde_id);

-- ── Angebote ──
create table if not exists public.angebote (
  id                      uuid primary key default gen_random_uuid(),
  kunde_id                text not null,
  typ                     text not null default 'preis'
                          check (typ in ('preis', 'rabatt')),   -- 'rabatt' = späterer Folientyp
  vorlage                 text not null default 'preis-angebot',
  produkt_id              uuid references public.angebots_produkte (id) on delete set null,
  titel                   text not null,                         -- Produktname zum Zeitpunkt des Angebots
  bild_url                text,
  preis                   numeric(10,2),
  einheit                 text check (einheit in ('kg', '100g', 'stueck')),
  streichpreis            numeric(10,2),                         -- leer = kein kleiner Kreis
  streichpreis_bestaetigt boolean not null default false,        -- § 11 PAngV: niedrigster Preis der letzten 30 Tage
  gueltig_von             date not null,
  gueltig_bis             date not null,
  screens                 text[] not null default '{screen3}',
  status                  text not null default 'aktiv'
                          check (status in ('entwurf', 'aktiv', 'beendet')),
  render_tv_url           text,
  render_feed_url         text,
  render_story_url        text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint angebote_zeitraum_check check (gueltig_bis >= gueltig_von),
  constraint angebote_streichpreis_check check (streichpreis is null or streichpreis_bestaetigt)
);
create index if not exists angebote_kunde_zeitraum_idx on public.angebote (kunde_id, gueltig_von, gueltig_bis);

-- ── updated_at automatisch pflegen ──
create or replace function public.mp_set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists angebots_produkte_updated_at on public.angebots_produkte;
create trigger angebots_produkte_updated_at before update on public.angebots_produkte
  for each row execute function public.mp_set_updated_at();

drop trigger if exists angebote_updated_at on public.angebote;
create trigger angebote_updated_at before update on public.angebote
  for each row execute function public.mp_set_updated_at();

-- ── Zugriff ──
-- Lesen: öffentlich (die TV-Screens laufen ohne Login).
-- Schreiben: nur eingeloggte Nutzer.
-- Mandantentrennung pro Kunde ist erst möglich, wenn es eine Tabelle gibt,
-- die Login → kunde_id zuordnet (siehe docs/VERBESSERUNGEN.md).
alter table public.angebots_produkte enable row level security;
alter table public.angebote          enable row level security;

drop policy if exists "angebots_produkte lesen" on public.angebots_produkte;
create policy "angebots_produkte lesen" on public.angebots_produkte
  for select to anon, authenticated using (true);
drop policy if exists "angebots_produkte schreiben" on public.angebots_produkte;
create policy "angebots_produkte schreiben" on public.angebots_produkte
  for all to authenticated using (true) with check (true);

drop policy if exists "angebote lesen" on public.angebote;
create policy "angebote lesen" on public.angebote
  for select to anon, authenticated using (true);
drop policy if exists "angebote schreiben" on public.angebote;
create policy "angebote schreiben" on public.angebote
  for all to authenticated using (true) with check (true);

-- Explizite Grants (neue Tabellen bekommen bei Supabase nicht mehr automatisch Rechte)
grant select on public.angebots_produkte, public.angebote to anon;
grant select, insert, update, delete on public.angebots_produkte, public.angebote to authenticated;

-- ── Realtime für die TV-Screens ──
alter publication supabase_realtime add table public.angebote;
