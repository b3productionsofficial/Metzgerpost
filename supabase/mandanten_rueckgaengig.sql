-- ══════════════════════════════════════════════════════════════
-- Rückweg zu supabase/mandanten.sql – stellt den Stand vom 25.10.2026 wieder her
-- (offene Rechte wie vorher). Daten in den Inhalts-Tabellen bleiben unberührt.
-- ══════════════════════════════════════════════════════════════
begin;

do $$
declare t text;
begin
  foreach t in array array['displays', 'display_configs', 'wochen', 'screen2_config', 'screen3_config', 'angebote', 'angebots_produkte', 'generator_configs'] loop
    execute (select coalesce(string_agg(format('drop policy %I on public.%I;', policyname, t), ' '), 'select 1')
             from pg_policies where schemaname = 'public' and tablename = t);
  end loop;
end $$;

-- displays (vorher: RLS an, jeder darf lesen/einfügen/ändern)
create policy "Display lesen"   on public.displays for select to public using (true);
create policy "Display schreiben" on public.displays for insert to public with check (true);
create policy "Display updaten" on public.displays for update to public using (true);
-- display_configs (vorher: RLS an, jeder darf lesen/einfügen/ändern)
create policy "cfg_read"   on public.display_configs for select to public using (true);
create policy "cfg_insert" on public.display_configs for insert to public with check (true);
create policy "cfg_update" on public.display_configs for update to public using (true);
-- angebote / angebots_produkte (vorher: lesen alle, schreiben eingeloggt)
create policy "angebote lesen"    on public.angebote for select to anon, authenticated using (true);
create policy "angebote schreiben" on public.angebote for all to authenticated using (true) with check (true);
create policy "angebots_produkte lesen"    on public.angebots_produkte for select to anon, authenticated using (true);
create policy "angebots_produkte schreiben" on public.angebots_produkte for all to authenticated using (true) with check (true);
-- generator_configs: vorher RLS an ohne Policy
-- wochen / screen2_config / screen3_config: vorher RLS aus
alter table public.wochen disable row level security;
alter table public.screen2_config disable row level security;
alter table public.screen3_config disable row level security;

drop policy if exists "screen-assets lesen" on storage.objects;
drop policy if exists "screen-assets hochladen" on storage.objects;
drop policy if exists "screen-assets aendern" on storage.objects;
drop policy if exists "screen-assets loeschen" on storage.objects;
create policy "Allow all anon and auth" on storage.objects for all to anon, authenticated
  using (bucket_id = 'screen-assets') with check (bucket_id = 'screen-assets');

-- Rechte-Tabellen bleiben stehen (schaden nicht); bei Bedarf:
-- drop table public.kunden_mitglieder, public.plattform_admins, public.kunden;
-- drop function public.mp_darf(text), public.mp_ist_admin();
commit;
