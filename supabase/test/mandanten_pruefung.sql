-- Prüft die Rechte nach mandanten.sql. Jede Zeile: OK/FEHLER <Fall>
create or replace function pg_temp.als(rolle text, uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
  execute format('set role %I', rolle);
end $$;
create or replace function pg_temp.versuch(sql text) returns text language plpgsql as $$
declare n int;
begin
  execute sql; get diagnostics n = row_count; return 'erlaubt(' || n || ')';
exception when insufficient_privilege or others then return 'verboten';
end $$;
create temp table erg (fall text, ist text, soll text);
grant all on erg to anon, authenticated;

-- TV ohne Login
select pg_temp.als('anon', null);
insert into erg select 'TV liest displays', (select case when count(*) = 2 then 'ja' else 'nein' end from public.displays), 'ja';
insert into erg select 'TV liest wochen', (select case when count(*) = 1 then 'ja' else 'nein' end from public.wochen), 'ja';
insert into erg select 'TV darf nicht ändern (displays)', pg_temp.versuch($q$update public.displays set content='{"x":1}'$q$), 'erlaubt(0)';
insert into erg select 'TV darf nicht einfügen (wochen)', pg_temp.versuch($q$insert into public.wochen (kunde_id) values ('6544d8e6')$q$), 'verboten';
insert into erg select 'TV darf keine Bilder hochladen', pg_temp.versuch($q$insert into storage.objects (bucket_id,name) values ('screen-assets','6544d8e6/x.jpg')$q$), 'verboten';
insert into erg select 'TV darf keine Bilder löschen', pg_temp.versuch($q$delete from storage.objects$q$), 'erlaubt(0)';
reset role;

-- Sorg & Seitz eingeloggt
select pg_temp.als('authenticated', '6544d8e6-b797-4bea-abeb-5da964eefe27');
insert into erg select 'Kunde ändert eigene displays', pg_temp.versuch($q$update public.displays set content='{"ok":1}' where kunde_id='6544d8e6' and screen_id='screen1'$q$), 'erlaubt(1)';
insert into erg select 'Kunde speichert Woche', pg_temp.versuch($q$insert into public.wochen (kunde_id, woche_label) values ('6544d8e6','neu')$q$), 'erlaubt(1)';
insert into erg select 'Kunde speichert Positionen (generator_configs)', pg_temp.versuch($q$insert into public.generator_configs (kunde_id, layout_positions) values ('6544d8e6','{}')$q$), 'erlaubt(1)';
insert into erg select 'Kunde lädt Bild in eigenen Ordner', pg_temp.versuch($q$insert into storage.objects (bucket_id,name) values ('screen-assets','6544d8e6/screen2/neu.jpg')$q$), 'erlaubt(1)';
insert into erg select 'Kunde darf nicht in fremden Ordner', pg_temp.versuch($q$insert into storage.objects (bucket_id,name) values ('screen-assets','test0001/x.jpg')$q$), 'verboten';
insert into erg select 'Kunde darf Altdaten-Bild nicht löschen', pg_temp.versuch($q$delete from storage.objects where name like '057b6a13/%'$q$), 'erlaubt(0)';
insert into erg select 'Kunde darf fremde Daten nicht anlegen', pg_temp.versuch($q$insert into public.displays (kunde_id, screen_id, content) values ('test0001','screen1','{}')$q$), 'verboten';
insert into erg select 'Kunde sieht nur eigenen Kunden', (select string_agg(kunde_id, ',') from public.kunden), '6544d8e6';
insert into erg select 'Kunde kann sich nicht zum Admin machen', pg_temp.versuch($q$insert into public.plattform_admins values ('6544d8e6-b797-4bea-abeb-5da964eefe27')$q$), 'verboten';
insert into erg select 'Kunde kann sich keinen fremden Kunden geben', pg_temp.versuch($q$insert into public.kunden_mitglieder values ('6544d8e6-b797-4bea-abeb-5da964eefe27','test0001')$q$), 'verboten';
reset role;

-- Fremde Metzgerei (eingeloggt, aber ohne Zuordnung)
select pg_temp.als('authenticated', '99999999-0000-0000-0000-000000000000');
insert into erg select 'Fremder ändert Sorg&Seitz nicht', pg_temp.versuch($q$update public.displays set content='{"boese":1}' where kunde_id='6544d8e6'$q$), 'erlaubt(0)';
insert into erg select 'Fremder löscht Woche nicht', pg_temp.versuch($q$delete from public.wochen where kunde_id='6544d8e6'$q$), 'erlaubt(0)';
insert into erg select 'Fremder lädt nicht hoch', pg_temp.versuch($q$insert into storage.objects (bucket_id,name) values ('screen-assets','6544d8e6/x.jpg')$q$), 'verboten';
reset role;

-- Admin
select pg_temp.als('authenticated', '057b6a13-08f4-466f-82bd-2abd00eb06a4');
insert into erg select 'Admin ändert Testkunde', pg_temp.versuch($q$insert into public.displays (kunde_id, screen_id, content) values ('test0001','screen1','{}')$q$), 'erlaubt(1)';
insert into erg select 'Admin lädt in jeden Ordner', pg_temp.versuch($q$insert into storage.objects (bucket_id,name) values ('screen-assets','test0001/x.jpg')$q$), 'erlaubt(1)';
insert into erg select 'Admin sieht alle Kunden', (select count(*)::text from public.kunden), '3';
insert into erg select 'Admin legt neuen Kunden an', pg_temp.versuch($q$insert into public.kunden (kunde_id, name) values ('neu00001','Metzgerei Neu')$q$), 'erlaubt(1)';
reset role;

select case when ist = soll then 'OK     ' else 'FEHLER ' end || fall || case when ist = soll then '' else '  (ist ' || ist || ', soll ' || soll || ')' end from erg;
select 'ERGEBNIS: ' || count(*) filter (where ist = soll) || ' OK, ' || count(*) filter (where ist <> soll) || ' FEHLER' from erg;
