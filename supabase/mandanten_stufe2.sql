-- ══════════════════════════════════════════════════════════════
-- MetzgerPost – Mandantenfähigkeit, Stufe 2: neue Metzgerei per Einladungscode
-- STATUS: VORBEREITET, NICHT ANGEWENDET. Voraussetzung: supabase/mandanten.sql (Stufe 1).
-- Lokal getestet: tests/regeln/mandanten_test.sh
--
-- Ablauf:
--   1. Admin legt im Admin-Bereich „Neue Metzgerei“ an → Zeile in kunden + Einladungscode.
--   2. Die Metzgerei registriert sich normal und gibt den Code einmal ein.
--   3. mp_einladung_annehmen(code) trägt sie in kunden_mitglieder ein; der Code ist danach verbraucht.
-- Kein neues Supabase-Projekt, keine Zusatzkosten.
-- ══════════════════════════════════════════════════════════════
begin;

alter table public.kunden add column if not exists einladungscode text unique;
alter table public.kunden add column if not exists einladung_bis timestamptz;

-- Code einlösen: nur eingeloggt, nur gültige, unverbrauchte Codes; gibt die kunde_id zurück
create or replace function public.mp_einladung_annehmen(code text) returns text
  language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if auth.uid() is null then raise exception 'Bitte zuerst anmelden.'; end if;
  select kunde_id into k from public.kunden
    where einladungscode = upper(trim(code)) and aktiv and (einladung_bis is null or einladung_bis > now())
    for update;
  if k is null then raise exception 'Code ungültig oder abgelaufen.'; end if;
  insert into public.kunden_mitglieder (user_id, kunde_id, rolle) values (auth.uid(), k, 'inhaber')
    on conflict do nothing;
  update public.kunden set einladungscode = null, einladung_bis = null where kunde_id = k;
  return k;
end $$;
revoke all on function public.mp_einladung_annehmen(text) from public;
grant execute on function public.mp_einladung_annehmen(text) to authenticated;

commit;

-- Rückweg:
--   drop function if exists public.mp_einladung_annehmen(text);
--   alter table public.kunden drop column if exists einladungscode, drop column if exists einladung_bis;
