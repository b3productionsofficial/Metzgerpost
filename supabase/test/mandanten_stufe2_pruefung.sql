-- Prüft supabase/mandanten_stufe2.sql (nach Stufe 1)
create or replace function pg_temp.als(rolle text, uid text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false); execute format('set role %I', rolle); end $$;
create or replace function pg_temp.versuch(sql text) returns text language plpgsql as $$
declare n int; begin execute sql; get diagnostics n = row_count; return 'erlaubt(' || n || ')';
exception when others then return 'verboten'; end $$;
create temp table erg (fall text, ist text, soll text); grant all on erg to anon, authenticated;
insert into auth.users values ('77777777-0000-0000-0000-000000000000', 'neue metzgerei');

select pg_temp.als('authenticated', '057b6a13-08f4-466f-82bd-2abd00eb06a4');
insert into erg select 'Admin legt neue Metzgerei mit Code an', pg_temp.versuch($q$insert into public.kunden (kunde_id, name, plan, einladungscode, einladung_bis) values ('a1b2c3d4','Metzgerei Neu','basis','ABCD-1234', now() + interval '14 days')$q$), 'erlaubt(1)';
reset role;

select pg_temp.als('authenticated', '99999999-0000-0000-0000-000000000000');
insert into erg select 'Fremder kann Code nicht selbst setzen', pg_temp.versuch($q$update public.kunden set einladungscode='HACK' where kunde_id='6544d8e6'$q$), 'erlaubt(0)';
insert into erg select 'Falscher Code wird abgelehnt', pg_temp.versuch($q$select public.mp_einladung_annehmen('FALSCH')$q$), 'verboten';
reset role;

select pg_temp.als('anon', null);
insert into erg select 'Ohne Login kein Einlösen', pg_temp.versuch($q$select public.mp_einladung_annehmen('ABCD-1234')$q$), 'verboten';
reset role;

select pg_temp.als('authenticated', '77777777-0000-0000-0000-000000000000');
insert into erg select 'Neue Metzgerei löst Code ein', (select public.mp_einladung_annehmen(' abcd-1234 ')), 'a1b2c3d4';
insert into erg select 'darf danach eigene Woche speichern', pg_temp.versuch($q$insert into public.wochen (kunde_id, woche_label) values ('a1b2c3d4','KW1')$q$), 'erlaubt(1)';
insert into erg select 'darf nicht bei Sorg & Seitz speichern', pg_temp.versuch($q$insert into public.wochen (kunde_id, woche_label) values ('6544d8e6','x')$q$), 'verboten';
insert into erg select 'darf in eigenen Bildordner', pg_temp.versuch($q$insert into storage.objects (bucket_id,name) values ('screen-assets','a1b2c3d4/gerichte/x.jpg')$q$), 'erlaubt(1)';
insert into erg select 'sieht nur eigenen Kunden', (select string_agg(kunde_id, ',') from public.kunden), 'a1b2c3d4';
reset role;

select pg_temp.als('authenticated', '99999999-0000-0000-0000-000000000000');
insert into erg select 'Code ist nach Einlösen verbraucht', pg_temp.versuch($q$select public.mp_einladung_annehmen('ABCD-1234')$q$), 'verboten';
reset role;

select case when ist = soll then ' OK     ' else ' FEHLER ' end || fall || case when ist = soll then '' else ' (ist ' || coalesce(ist,'null') || ', soll ' || soll || ')' end from erg;
select ' ERGEBNIS: ' || count(*) filter (where ist = soll) || ' OK, ' || count(*) filter (where ist is distinct from soll) || ' FEHLER' from erg;
