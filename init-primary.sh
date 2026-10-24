#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 -U postgres -c "CREATE ROLE repl_user WITH REPLICATION LOGIN PASSWORD 'repl_pass';"
echo "host replication repl_user all scram-sha-256" >> "$PGDATA/pg_hba.conf"
psql -v ON_ERROR_STOP=1 -U postgres -d fleet -c "CREATE TABLE IF NOT EXISTS locations(id serial primary key, vehicle_id text, lat double precision, lng double precision, recorded_at timestamptz default now());"