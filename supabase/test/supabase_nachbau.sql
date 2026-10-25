-- Minimaler Nachbau der Supabase-Umgebung + aktueller Stand (25.10.2026) für lokale Tests
create role anon nologin; create role authenticated nologin;
create schema auth; create schema storage;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.objects (id serial primary key, bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
alter table storage.objects enable row level security;
create policy "Allow all anon and auth" on storage.objects for all to anon, authenticated using (bucket_id = 'screen-assets') with check (bucket_id = 'screen-assets');

create table public.displays (id uuid primary key default gen_random_uuid(), kunde_id text, screen_id text, content jsonb, updated_at timestamptz, unique (kunde_id, screen_id));
create table public.display_configs (id uuid primary key default gen_random_uuid(), kunde_id text, screen_id text, config jsonb, updated_at timestamptz, warme_theke_bild text, unique (kunde_id, screen_id));
create table public.wochen (id uuid primary key default gen_random_uuid(), kunde_id text, woche_label text, kw int, jahr int, gerichte jsonb, erstellt_am timestamptz default now(), gueltig_ab date);
create table public.screen2_config (id uuid primary key default gen_random_uuid(), kunde_id text unique, slides jsonb, timer_sekunden int, aktiv boolean, updated_at timestamptz, warme_theke_bild text, aktive_layouts jsonb);
create table public.screen3_config (id uuid primary key default gen_random_uuid(), kunde_id text unique, aktive_layouts jsonb, timer_sekunden int, updated_at timestamptz);
create table public.angebote (id uuid primary key default gen_random_uuid(), kunde_id text, titel text, status text default 'aktiv');
create table public.angebots_produkte (id uuid primary key default gen_random_uuid(), kunde_id text, name text);
create table public.generator_configs (id uuid primary key default gen_random_uuid(), kunde_id text unique, gerichte jsonb, layout_positions jsonb, updated_at timestamptz);
grant usage on schema public, auth, storage to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on storage.objects to anon, authenticated; grant usage on all sequences in schema storage to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

alter table public.displays enable row level security;
create policy "Display lesen" on public.displays for select to public using (true);
create policy "Display schreiben" on public.displays for insert to public with check (true);
create policy "Display updaten" on public.displays for update to public using (true);
alter table public.display_configs enable row level security;
create policy "cfg_read" on public.display_configs for select to public using (true);
create policy "cfg_insert" on public.display_configs for insert to public with check (true);
create policy "cfg_update" on public.display_configs for update to public using (true);
alter table public.angebote enable row level security;
create policy "angebote lesen" on public.angebote for select to anon, authenticated using (true);
create policy "angebote schreiben" on public.angebote for all to authenticated using (true) with check (true);
alter table public.angebots_produkte enable row level security;
create policy "angebots_produkte lesen" on public.angebots_produkte for select to anon, authenticated using (true);
create policy "angebots_produkte schreiben" on public.angebots_produkte for all to authenticated using (true) with check (true);
alter table public.generator_configs enable row level security;

insert into auth.users values ('057b6a13-08f4-466f-82bd-2abd00eb06a4', 'lukas'), ('6544d8e6-b797-4bea-abeb-5da964eefe27', 'sorg'), ('99999999-0000-0000-0000-000000000000', 'fremde metzgerei');
insert into public.displays (kunde_id, screen_id, content) values ('6544d8e6', 'screen1', '{}'), ('6544d8e6', 'mt_settings', '{"tage":[2,3,4,5]}');
insert into public.wochen (kunde_id, woche_label, gueltig_ab) values ('6544d8e6', 'KW44', '2026-10-27');
insert into public.screen3_config (kunde_id, aktive_layouts) values ('6544d8e6', '[]');
insert into storage.objects (bucket_id, name) values ('screen-assets', '6544d8e6/screen3/a.jpg'), ('screen-assets', '057b6a13/screen3/alt.jpg');
