#!/usr/bin/env bash
# One entry point for the server that hosts every API and site (a DigitalOcean droplet, Ubuntu 26.04 or 24.04 LTS). See infra/README.md.
#
#   server setup --email you@example.com     once, as root, on a fresh droplet; safe to re-run
#   server add-db <name>                     a database and login role for one app on the shared PostgreSQL
#   server add-site <domain> <host:port>     proxy a domain to a container on the "edge" network
#   server add-site <domain> static          serve files from /opt/sites/<domain>
#   server add-site <domain> <file.caddy>    install a full site block, e.g. backend/deploy/api.caddy
#   server remove-site <domain>
#   server deploy <app dir>                  git pull, back up, rebuild and wait until healthy
#   server backup                            dump every database now (also runs nightly)
#   server status
set -euo pipefail

PLATFORM_DIR=${PLATFORM_DIR:-/opt/platform}
APPS_DIR=${APPS_DIR:-/opt/apps}
SITES_DIR=${SITES_DIR:-/opt/sites}
BACKUPS_DIR=${BACKUPS_DIR:-/opt/backups}
DEPLOY_USER=${DEPLOY_USER:-deploy}

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33mwarning:\033[0m %s\n' "$*" >&2; }
die() {
  printf '\033[1;31merror:\033[0m %s\n' "$*" >&2
  exit 1
}
platform() { docker compose -f "$PLATFORM_DIR/compose.yaml" "$@"; }
psql_admin() { platform exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Sets KEY=value in a .env file, keeping the other lines.
set_env() {
  local file=$1 key=$2 value=$3
  touch "$file"
  grep -v "^$key=" "$file" >"$file.tmp" || true
  echo "$key=$value" >>"$file.tmp"
  mv "$file.tmp" "$file"
}

setup() {
  [ "$(id -u)" = 0 ] || die 'setup must run as root.'
  # shellcheck disable=SC1091
  . /etc/os-release
  [ "$ID" = ubuntu ] || die 'setup supports Ubuntu (26.04 or 24.04 LTS).'
  local email='' swap=2G
  while [ $# -gt 0 ]; do
    case $1 in
      --email) email=${2:?}; shift 2 ;;
      --swap) swap=${2:?}; shift 2 ;;
      *) die "unknown option $1" ;;
    esac
  done
  grep -qs '^ACME_EMAIL=' "$PLATFORM_DIR/.env" || [ -n "$email" ] ||
    die "pass --email (Let's Encrypt sends certificate notices there)."

  log 'Updating the system'
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -q
  apt-get -yq -o Dpkg::Options::=--force-confold upgrade
  apt-get install -yq ca-certificates curl git openssl rsync ufw fail2ban python3-systemd unattended-upgrades
  # Security updates install themselves every day, rebooting at 03:30 IST (22:00 UTC) when the kernel needs it;
  # every container restarts on its own.
  printf 'APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n' \
    >/etc/apt/apt.conf.d/20auto-upgrades
  printf 'Unattended-Upgrade::Automatic-Reboot "true";\nUnattended-Upgrade::Automatic-Reboot-Time "22:00";\n' \
    >/etc/apt/apt.conf.d/52auto-reboot
  # fail2ban bans an address for an hour after 5 failed SSH logins, reading them from the journal.
  printf '[sshd]\nenabled = true\nbackend = systemd\nmaxretry = 5\nbantime = 1h\n' >/etc/fail2ban/jail.d/sshd.local
  systemctl enable fail2ban >/dev/null
  systemctl restart fail2ban

  # Swap keeps image builds (npm ci, sharp) from being killed on small droplets.
  if [ "$swap" != 0 ] && ! swapon --show | grep -q .; then
    log "Adding $swap of swap"
    fallocate -l "$swap" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
    echo 'vm.swappiness=10' >/etc/sysctl.d/99-swap.conf
    sysctl -q -p /etc/sysctl.d/99-swap.conf
  fi

  if ! command -v docker >/dev/null; then
    log 'Installing Docker from the official repository'
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" \
      >/etc/apt/sources.list.d/docker.list
    apt-get update -q
    apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  # Rotate container logs so they cannot fill the disk; keep containers running while Docker itself upgrades.
  local daemon='{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" }, "live-restore": true }'
  if [ "$(cat /etc/docker/daemon.json 2>/dev/null)" != "$daemon" ]; then
    install -d /etc/docker
    echo "$daemon" >/etc/docker/daemon.json
    systemctl restart docker
  fi
  systemctl enable --now docker >/dev/null

  log "Preparing the $DEPLOY_USER user"
  id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos '' "$DEPLOY_USER"
  usermod -aG sudo,docker "$DEPLOY_USER"
  echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" >"/etc/sudoers.d/90-$DEPLOY_USER"
  chmod 440 "/etc/sudoers.d/90-$DEPLOY_USER"
  visudo -cqf "/etc/sudoers.d/90-$DEPLOY_USER" >/dev/null
  local home
  home=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
  if [ ! -s "$home/.ssh/authorized_keys" ] && [ -s /root/.ssh/authorized_keys ]; then
    install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$home/.ssh"
    install -m 600 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /root/.ssh/authorized_keys "$home/.ssh/authorized_keys"
  fi

  # Only lock SSH down once the deploy user can log in with a key, so this can never lock you out.
  # The 00- prefix wins over DigitalOcean's 50-cloud-init.conf (sshd uses the first value it reads).
  if [ -s "$home/.ssh/authorized_keys" ]; then
    log 'Hardening SSH: keys only, no root login'
    printf 'PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nMaxAuthTries 3\nX11Forwarding no\n' \
      >/etc/ssh/sshd_config.d/00-hardening.conf
    mkdir -p /run/sshd
    sshd -t
    systemctl reload ssh || systemctl restart ssh
  else
    warn "SSH left unchanged: $DEPLOY_USER has no SSH key. Add one to $home/.ssh/authorized_keys and re-run setup."
  fi

  # Host firewall for host services. Docker's published ports bypass ufw, so also use a DigitalOcean
  # Cloud Firewall (22, 80, 443 inbound); only the proxy publishes ports.
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443 >/dev/null
  ufw --force enable >/dev/null

  log 'Starting the shared services: proxy, PostgreSQL, backups'
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$PLATFORM_DIR" "$PLATFORM_DIR/conf/sites" "$APPS_DIR" "$SITES_DIR"
  install -d -m 700 "$BACKUPS_DIR"
  [ -z "$email" ] || set_env "$PLATFORM_DIR/.env" ACME_EMAIL "$email"
  grep -qs '^POSTGRES_PASSWORD=' "$PLATFORM_DIR/.env" ||
    set_env "$PLATFORM_DIR/.env" POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  chmod 600 "$PLATFORM_DIR/.env"
  start_platform
  chown -R "$DEPLOY_USER:$DEPLOY_USER" "$PLATFORM_DIR"
  [ "$(readlink -f "$0")" = /usr/local/bin/server ] || install -m 755 "$0" /usr/local/bin/server

  log 'Done.'
  echo "  Log in from now on as: ssh $DEPLOY_USER@<this server>   (root login is off)"
  echo '  Then, per app:         server add-db <app>; server add-site <domain> ...; server deploy <app dir>'
}

# Writes the shared services' files (owned by this script; sites in conf/sites/ are kept) and starts them.
start_platform() {
  # "edge": the proxy and the apps it serves. "data": apps and PostgreSQL, internal (no route to the internet).
  docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null
  docker network inspect data >/dev/null 2>&1 || docker network create --internal data >/dev/null
  cat >"$PLATFORM_DIR/compose.yaml" <<EOF
# Managed by server.sh: the services every app on this host shares. Sites are in conf/sites/.
name: platform
services:
  caddy:
    image: caddy:2.10-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    environment:
      ACME_EMAIL: \${ACME_EMAIL:?Set ACME_EMAIL in $PLATFORM_DIR/.env}
    volumes:
      - ./conf:/etc/caddy:ro
      - $SITES_DIR:/srv:ro
      - caddy_data:/data
      - caddy_config:/config
    networks: [edge]
  # One PostgreSQL for every app; each app has its own database and role (server add-db). Never published.
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    command: ["postgres", "-c", "shared_buffers=256MB", "-c", "max_connections=100"]
    shm_size: 256mb
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in $PLATFORM_DIR/.env}
    volumes:
      - postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks: [data]
  # Dumps every database nightly to $BACKUPS_DIR/postgres/<database>/. Copy that folder off the server.
  backup:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      PGHOST: postgres
      PGUSER: postgres
      PGPASSWORD: \${POSTGRES_PASSWORD}
      BACKUP_KEEP_DAYS: \${BACKUP_KEEP_DAYS:-14}
    volumes:
      - ./backup.sh:/backup.sh:ro
      - $BACKUPS_DIR/postgres:/backups
    entrypoint: ["/bin/sh", "-c", "while true; do sleep 86400; /bin/sh /backup.sh || echo 'backup failed' >&2; done"]
    depends_on:
      postgres:
        condition: service_healthy
    networks: [data]
networks:
  edge:
    external: true
  data:
    external: true
volumes:
  caddy_data:
  caddy_config:
  postgres:
EOF
  cat >"$PLATFORM_DIR/backup.sh" <<'EOF'
#!/bin/sh
# Managed by server.sh. Dumps every database (custom format; restore with pg_restore). Run by "server backup" and nightly.
set -eu
stamp=$(date -u +%Y%m%dT%H%M%SZ)
for db in $(psql -d postgres -Atc "SELECT datname FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres'"); do
  mkdir -p "/backups/$db"
  pg_dump --format=custom --file="/backups/$db/.partial" "$db"
  mv "/backups/$db/.partial" "/backups/$db/$db-$stamp.dump"
  find "/backups/$db" -name '*.dump' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
done
echo "backup complete: $stamp"
EOF
  cat >"$PLATFORM_DIR/conf/Caddyfile" <<'EOF'
# Managed by server.sh. One file per site in sites/; add them with "server add-site".
{
	email {$ACME_EMAIL}
}
import /etc/caddy/sites/*.caddy
EOF
  # Keeps the import valid while there are no sites yet.
  echo '# Placeholder so the sites/ import always matches a file.' >"$PLATFORM_DIR/conf/sites/_placeholder.caddy"
  platform up -d --wait --remove-orphans
  # Each app's role may connect only to its own database (add_db), not to the maintenance ones.
  psql_admin -c 'REVOKE CONNECT ON DATABASE postgres FROM PUBLIC' -c 'REVOKE CONNECT ON DATABASE template1 FROM PUBLIC'
}

add_db() {
  local name=${1:?usage: server add-db <name>}
  [[ $name =~ ^[a-z][a-z0-9_]{0,62}$ ]] || die 'database names use a-z, 0-9 and _, and start with a letter.'
  case $name in postgres | template0 | template1) die "$name is reserved." ;; esac
  if [ "$(psql_admin -Atc "SELECT 1 FROM pg_roles WHERE rolname = '$name'")" = 1 ]; then
    die "$name already exists; its password is in that app's .env. To replace it: docker compose -f $PLATFORM_DIR/compose.yaml exec postgres psql -U postgres -c \"ALTER ROLE $name PASSWORD 'new-password'\""
  fi
  local password
  password=$(openssl rand -hex 24)
  psql_admin <<SQL
CREATE ROLE "$name" LOGIN PASSWORD '$password';
CREATE DATABASE "$name" OWNER "$name";
REVOKE ALL ON DATABASE "$name" FROM PUBLIC;
SQL
  log "Database $name is ready. Save the password now; it is not shown again."
  echo "  password:      $password"
  echo "  DATABASE_URL=postgres://$name:$password@postgres:5432/$name"
  echo '  The app must join the "data" network to reach it (see infra/README.md).'
}

backup() {
  log 'Backing up every database'
  platform exec -T backup sh /backup.sh
}

reload_proxy() {
  local out
  out=$(platform exec -T caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1) &&
    out=$(platform exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1) || {
    echo "$out" >&2
    return 1
  }
}

add_site() {
  local usage='usage: server add-site <domain> <host:port | static | file.caddy>'
  local domain=${1:?$usage} target=${2:?$usage}
  [[ $domain =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]] || die "invalid domain: $domain"
  local file="$PLATFORM_DIR/conf/sites/$domain.caddy" previous=''
  [ -f "$file" ] && previous=$(cat "$file")
  if [[ $target == *.caddy ]]; then
    [ -f "$target" ] || die "no such file: $target"
    grep -q "$domain" "$target" || die "$target does not mention $domain"
    cp "$target" "$file"
  else
    # Every generated site: HTTPS only (HSTS), no MIME sniffing, no server banner, and an access log.
    local common='\tlog\n\tencode zstd gzip\n\theader {\n\t\tStrict-Transport-Security "max-age=31536000"\n\t\tX-Content-Type-Options nosniff\n\t\t-Server\n\t}\n'
    if [ "$target" = static ]; then
      install -d "$SITES_DIR/$domain"
      printf "%s {\n$common\troot * /srv/%s\n\tfile_server\n}\n" "$domain" "$domain" >"$file"
    else
      [[ $target =~ ^[a-zA-Z0-9._-]+:[0-9]+$ ]] || die "upstream must be host:port, e.g. myapp:3000 ($usage)"
      printf "%s {\n$common\treverse_proxy %s\n}\n" "$domain" "$target" >"$file"
    fi
  fi
  if ! reload_proxy; then
    if [ -n "$previous" ]; then echo "$previous" >"$file"; else rm -f "$file"; fi
    reload_proxy >/dev/null || true
    die "the proxy rejected $domain; the previous configuration is still live."
  fi
  log "$domain is live. Point its DNS A record at this server; HTTPS is issued on the first visit."
  [ "$target" != static ] || echo "  Put the site's files in $SITES_DIR/$domain"
}

remove_site() {
  local domain=${1:?usage: server remove-site <domain>}
  local file="$PLATFORM_DIR/conf/sites/$domain.caddy"
  [ -f "$file" ] || die "no site named $domain"
  rm "$file"
  reload_proxy
  log "$domain removed from the proxy (its app and files are untouched)."
}

# Deploys a Compose app. Its .env holds the settings, including COMPOSE_FILE when it needs several files.
deploy() {
  local dir=${1:?usage: server deploy <app dir>}
  cd "$dir"
  [ -f .env ] || die "$PWD/.env is missing"
  if git rev-parse --git-dir >/dev/null 2>&1; then
    log 'Pulling the latest code'
    git pull --ff-only
  fi
  # Back up before anything changes: every database, plus the app's own backup service if it has one.
  backup
  if docker compose ps --services --status running 2>/dev/null | grep -qx backup; then
    log "Running the app's own backup"
    docker compose exec -T backup sh /backup.sh
  fi
  log 'Building and starting; waiting until healthy'
  docker compose up -d --build --remove-orphans --wait --wait-timeout 300
  docker image prune -f >/dev/null
  log "Deployed $(git rev-parse --short HEAD 2>/dev/null || echo "$PWD")"
}

status() {
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
  echo
  echo 'Sites:'
  local f
  for f in "$PLATFORM_DIR"/conf/sites/*.caddy; do
    case $(basename "$f") in _*) continue ;; esac
    [ -e "$f" ] && echo "  $(basename "$f" .caddy)"
  done
  echo 'Databases:'
  psql_admin -Atc "SELECT '  ' || datname || '  ' || pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE NOT datistemplate AND datname <> 'postgres' ORDER BY 1"
  echo
  df -h / | tail -1 | awk '{print "Disk: " $3 " used, " $4 " free"}'
  free -h | awk '/Mem/ {print "Memory: " $3 " used of " $2}'
}

command=${1:-help}
[ $# -eq 0 ] || shift
case $command in
  setup) setup "$@" ;;
  add-db) add_db "$@" ;;
  add-site) add_site "$@" ;;
  remove-site) remove_site "$@" ;;
  deploy) deploy "$@" ;;
  backup) backup ;;
  status) status ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//' ;;
esac
