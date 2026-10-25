#!/bin/sh
set -eu
# Runs only on the first initialization of this PostgreSQL volume.
psql --username "$POSTGRES_USER" --dbname postgres --set=ON_ERROR_STOP=1 --set=password="$LAWMEDY_DB_PASSWORD" <<'SQL'
CREATE ROLE lawmedy LOGIN PASSWORD :'password';
CREATE DATABASE lawmedy OWNER lawmedy;
REVOKE CONNECT ON DATABASE lawmedy FROM PUBLIC;
SQL
