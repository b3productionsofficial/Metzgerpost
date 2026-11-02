-- MetzgerPost – Gerichte-Bibliothek für den Mittagstisch (neu, rein additiv)
-- Bisher lagen eigene Gerichte nur im Browser (localStorage) bzw. fest in config.js.
-- Leere Bibliothek → der Generator nutzt wie bisher die Standardgerichte aus config.js.
create table if not exists public.mittag_gerichte (
  id          uuid primary key default gen_random_uuid(),
  kunde_id    text not null,
  schluessel  text not null,                 -- z. B. 'gulasch' (wie in config.js)
  text        text not null,                 -- Name auf dem Bild
  preis       text not null default '',      -- frei, z. B. '6,80 €' oder 'ab 5,00 €'
  bild_url    text,
  sortierung  integer not null default 0,
  aktiv       boolean not null default true,  -- „entfernen“ = aktiv false (alte Wochen bleiben intakt)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kunde_id, schluessel)
);
create index if not exists mittag_gerichte_kunde on public.mittag_gerichte (kunde_id, aktiv, sortierung);

drop trigger if exists mittag_gerichte_updated on public.mittag_gerichte;
create trigger mittag_gerichte_updated before update on public.mittag_gerichte
  for each row execute function public.mp_set_updated_at();

alter table public.mittag_gerichte enable row level security;
drop policy if exists "mittag_gerichte lesen" on public.mittag_gerichte;
drop policy if exists "mittag_gerichte schreiben" on public.mittag_gerichte;
create policy "mittag_gerichte lesen" on public.mittag_gerichte for select to authenticated using (true);
create policy "mittag_gerichte schreiben" on public.mittag_gerichte for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.mittag_gerichte to authenticated;

-- Testkunde: Standardgerichte
insert into public.mittag_gerichte (kunde_id, schluessel, text, preis, bild_url, sortierung) values
  ('test0001', 'currywurst', 'Currywurst mit Semmel', '6,80 €', 'Gerichte/currywurst.jpg', 1),
  ('test0001', 'cordonbleu', 'Cordon Bleu mit Kartoffelsalat', '6,80 €', 'Gerichte/cordonbleu.jpg', 2),
  ('test0001', 'gulasch', 'Gulasch mit Spätzle', '6,80 €', 'Gerichte/gulasch.jpg', 3),
  ('test0001', 'lasagne', 'Lasagne', '6,80 €', 'Gerichte/lasagne.jpg', 4),
  ('test0001', 'schaeufele', 'Schäufele mit Knödel', '8,50 €', 'Gerichte/schaeufele.jpg', 5),
  ('test0001', 'lende', 'Lende mit Rahmsauce und Spätzle', '8,50 €', 'Gerichte/lende.jpg', 6),
  ('test0001', 'feiertag', 'Feiertag', '', 'Gerichte/feiertag.jpg', 7)
on conflict (kunde_id, schluessel) do nothing;
