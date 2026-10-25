-- ══════════════════════════════════════════════════════════════
-- MetzgerPost – Mandantenfähigkeit, Stufe 1  (Stand 25.10.2026)
-- STATUS: VORBEREITET, NOCH NICHT AUF DIE ECHTE DATENBANK ANGEWENDET.
--         Lokal getestet: tests/regeln/mandanten_test.sh
--         Rückweg:        supabase/mandanten_rueckgaengig.sql
--
-- Ziel:
--   • Wer darf was? Jede Metzgerei ändert nur ihre eigenen Daten/Bilder.
--   • Die Fernseher lesen weiter ohne Login (nur lesen).
--   • Plattform-Admins (Lukas) dürfen alles.
--   • Neuer Kunde = 2 Zeilen in der Datenbank, kein neues Supabase-Projekt.
--
-- Was sich für die App ändert: nichts Sichtbares. Schreiben ging bisher auch
-- ohne Login (Anon-Key steht öffentlich im Quellcode) – das wird geschlossen.
-- ══════════════════════════════════════════════════════════════
begin;

-- ── 1. Kunden, Mitglieder, Admins ──
create table if not exists public.kunden (
  kunde_id   text primary key,                       -- z. B. '6544d8e6' (bisherige ID bleibt)
  name       text not null,
  config_key text unique,                            -- Schlüssel in modules/mittagstisch/config.js (bis Stufe 2)
  plan       text not null default 'basis',
  aktiv      boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.kunden_mitglieder (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kunde_id   text not null references public.kunden(kunde_id) on delete cascade,
  rolle      text not null default 'inhaber' check (rolle in ('inhaber', 'mitarbeiter')),
  created_at timestamptz not null default now(),
  primary key (user_id, kunde_id)
);

create table if not exists public.plattform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ── 2. Prüf-Funktionen (security definer: lesen die Rechte-Tabellen ohne eigene RLS-Schleife) ──
create or replace function public.mp_ist_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.plattform_admins where user_id = auth.uid())
$$;

create or replace function public.mp_darf(k text) returns boolean
  language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    public.mp_ist_admin()
    or exists (select 1 from public.kunden_mitglieder m where m.user_id = auth.uid() and m.kunde_id = k)
  )
$$;

revoke all on function public.mp_ist_admin() from public;
revoke all on function public.mp_darf(text) from public;
grant execute on function public.mp_ist_admin() to anon, authenticated;
grant execute on function public.mp_darf(text) to anon, authenticated;

-- ── 3. Rechte auf die Rechte-Tabellen ──
alter table public.kunden enable row level security;
drop policy if exists "kunden lesen" on public.kunden;
drop policy if exists "kunden admin" on public.kunden;
create policy "kunden lesen" on public.kunden for select to authenticated using (public.mp_darf(kunde_id));
create policy "kunden admin" on public.kunden for all to authenticated using (public.mp_ist_admin()) with check (public.mp_ist_admin());

alter table public.kunden_mitglieder enable row level security;
drop policy if exists "mitglieder lesen" on public.kunden_mitglieder;
drop policy if exists "mitglieder admin" on public.kunden_mitglieder;
create policy "mitglieder lesen" on public.kunden_mitglieder for select to authenticated using (user_id = auth.uid() or public.mp_ist_admin());
create policy "mitglieder admin" on public.kunden_mitglieder for all to authenticated using (public.mp_ist_admin()) with check (public.mp_ist_admin());

alter table public.plattform_admins enable row level security;
drop policy if exists "admins lesen" on public.plattform_admins;
create policy "admins lesen" on public.plattform_admins for select to authenticated using (user_id = auth.uid());
-- Schreiben in plattform_admins nur per SQL im Supabase-Dashboard (keine Policy = gesperrt)

-- ── 4. Inhalte: TV liest ohne Login, schreiben nur der eigene Betrieb ──
do $$
declare t text;
begin
  foreach t in array array['displays', 'display_configs', 'wochen', 'screen2_config', 'screen3_config', 'angebote', 'angebots_produkte'] loop
    execute format('alter table public.%I enable row level security', t);
    -- alle bisherigen Policies dieser Tabelle entfernen (sie erlaubten jedem alles)
    perform 1;
    execute (select coalesce(string_agg(format('drop policy %I on public.%I;', policyname, t), ' '), 'select 1')
             from pg_policies where schemaname = 'public' and tablename = t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || ' lesen', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.mp_darf(kunde_id)) with check (public.mp_darf(kunde_id))', t || ' schreiben', t);
  end loop;
end $$;

-- generator_configs: nur eingeloggt (wird nicht vom TV gelesen); behebt nebenbei
-- „Positionen werden nie gespeichert“ (bisher RLS an, aber keine Policy)
alter table public.generator_configs enable row level security;
drop policy if exists "generator_configs eigene" on public.generator_configs;
create policy "generator_configs eigene" on public.generator_configs for all to authenticated
  using (public.mp_darf(kunde_id)) with check (public.mp_darf(kunde_id));

-- ── 5. Bilder (Storage): öffentlich abrufbar wie bisher, hochladen/ändern/löschen nur im eigenen Ordner ──
-- Ordner-Konvention: screen-assets/<kunde_id>/...
drop policy if exists "Allow all anon and auth" on storage.objects;
drop policy if exists "screen-assets lesen" on storage.objects;
drop policy if exists "screen-assets hochladen" on storage.objects;
drop policy if exists "screen-assets aendern" on storage.objects;
drop policy if exists "screen-assets loeschen" on storage.objects;
create policy "screen-assets lesen" on storage.objects for select to authenticated
  using (bucket_id = 'screen-assets' and public.mp_darf((storage.foldername(name))[1]));
create policy "screen-assets hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'screen-assets' and public.mp_darf((storage.foldername(name))[1]));
create policy "screen-assets aendern" on storage.objects for update to authenticated
  using (bucket_id = 'screen-assets' and public.mp_darf((storage.foldername(name))[1]))
  with check (bucket_id = 'screen-assets' and public.mp_darf((storage.foldername(name))[1]));
create policy "screen-assets loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'screen-assets' and public.mp_darf((storage.foldername(name))[1]));
-- Hinweis: Der Bucket bleibt „public“ – Bild-URLs funktionieren am TV weiterhin ohne Login.

-- ── 6. Bestehende Konten eintragen ──
insert into public.kunden (kunde_id, name, config_key, plan) values
  ('6544d8e6', 'Metzgerei Sorg & Seitz', 'sorgundseitz', 'gruender'),
  ('test0001', 'Testkunde', null, 'test'),
  ('057b6a13', 'Admin (Altdaten – nicht löschen)', null, 'intern')
on conflict (kunde_id) do nothing;

insert into public.kunden_mitglieder (user_id, kunde_id, rolle)
  select id, '6544d8e6', 'inhaber' from auth.users where id = '6544d8e6-b797-4bea-abeb-5da964eefe27'
on conflict do nothing;

insert into public.plattform_admins (user_id)
  select id from auth.users where id = '057b6a13-08f4-466f-82bd-2abd00eb06a4'
on conflict do nothing;

grant select, insert, update, delete on public.kunden, public.kunden_mitglieder to authenticated;
grant select on public.plattform_admins to authenticated;

commit;
