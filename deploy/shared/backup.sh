#!/bin/sh
set -eu
umask 077
mkdir -p /backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
archive="/backups/private-files-${stamp}.tar.gz"
tar -C /files -czf "${archive}.tmp" .
mv "${archive}.tmp" "$archive"
find /backups -type f -name 'private-files-*.tar.gz' -mtime +14 -delete
printf 'Private files backed up at %s\n' "$stamp"
