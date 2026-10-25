#!/bin/bash
# Testet supabase/mandanten.sql + Rückweg an einer frischen lokalen Postgres-Datenbank.
# Voraussetzung: lokaler Postgres auf Port 54329 (Socket /tmp), Benutzer postgres.
set -e
cd "$(dirname "$0")/../../supabase"
P="psql -h /tmp -p 54329 -U postgres -v ON_ERROR_STOP=1 -q -t"
$P -d postgres -c "drop database if exists mp_test" -c "create database mp_test"
for r in anon authenticated; do $P -d postgres -c "do \$\$begin if not exists (select from pg_roles where rolname='$r') then create role $r nologin; end if; end\$\$" ; done
sed '/^create role/d' test/supabase_nachbau.sql | $P -d mp_test
echo "── mandanten.sql anwenden"; $P -d mp_test -f mandanten.sql
echo "── Rechte prüfen"; $P -d mp_test -f test/mandanten_pruefung.sql | sed '/^$/d'
echo "── Rückweg"; $P -d mp_test -f mandanten_rueckgaengig.sql
$P -d mp_test -c "set role anon; insert into public.wochen (kunde_id) values ('x');" && echo "Rückweg OK: anon darf wieder schreiben (alter Zustand)"
