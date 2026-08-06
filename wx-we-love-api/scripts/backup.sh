#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

script_dir=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
project_dir=$(CDPATH= cd -- "$script_dir/.." && pwd)
env_file=${ENV_FILE:-"$project_dir/.env"}
backup_dir=${BACKUP_DIR:-"$HOME/backup"}
mysql_container=${MYSQL_CONTAINER:-mysql-server}
backup_stamp=$(date +%F_%H%M%S)

usage() {
  cat <<'EOF'
Usage: pnpm backup

Environment overrides:
  BACKUP_DIR       Backup destination (default: ~/backup)
  MYSQL_CONTAINER  MySQL Docker container (default: mysql-server)
  ENV_FILE         Backend env file (default: <project>/.env)
  DB_NAME          Database name (default: value from .env or wx_we_love)
  UPLOAD_DIR       Upload directory (default: value from .env or <project>/uploads)
EOF
}

read_env_value() {
  local key=$1
  local value

  [[ -f "$env_file" ]] || return 1
  value=$(awk -v key="$key" '
    $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "")
      found = $0
    }
    END {
      if (found != "") print found
    }
  ' "$env_file")
  value=${value%$'\r'}

  case "$value" in
    \"*\") value=${value:1:${#value}-2} ;;
    \'*\') value=${value:1:${#value}-2} ;;
  esac

  [[ -n "$value" ]] || return 1
  printf '%s' "$value"
}

if [[ ${1:-} == "--help" || ${1:-} == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 0 ]]; then
  usage >&2
  exit 2
fi

command -v docker >/dev/null 2>&1 || {
  echo "Error: docker is not installed or is not on PATH." >&2
  exit 1
}

database_name=${DB_NAME:-}
if [[ -z "$database_name" ]]; then
  database_name=$(read_env_value DB_NAME || true)
fi
database_name=${database_name:-wx_we_love}

upload_setting=${UPLOAD_DIR:-}
if [[ -z "$upload_setting" ]]; then
  upload_setting=$(read_env_value UPLOAD_DIR || true)
fi
upload_setting=${upload_setting:-uploads}

if [[ "$upload_setting" = /* ]]; then
  upload_dir=$upload_setting
else
  upload_dir="$project_dir/$upload_setting"
fi

if [[ $(docker inspect --format '{{.State.Running}}' "$mysql_container" 2>/dev/null || true) != "true" ]]; then
  echo "Error: MySQL container '$mysql_container' is not running." >&2
  exit 1
fi

if ! docker exec "$mysql_container" sh -c 'test -n "$MYSQL_ROOT_PASSWORD"'; then
  echo "Error: MYSQL_ROOT_PASSWORD is not available inside '$mysql_container'." >&2
  exit 1
fi

mkdir -p "$backup_dir"

safe_database_name=${database_name//[^a-zA-Z0-9_.-]/_}
sql_file="$backup_dir/${safe_database_name}_${backup_stamp}.sql"
sql_temp="$sql_file.tmp"
uploads_file="$backup_dir/uploads_${backup_stamp}.tar.gz"
uploads_temp="$uploads_file.tmp"

cleanup() {
  rm -f -- "$sql_temp" "$uploads_temp"
}
trap cleanup EXIT INT TERM

echo "Backing up MySQL database '$database_name' from container '$mysql_container'..."
docker exec \
  -e BACKUP_DATABASE="$database_name" \
  "$mysql_container" \
  sh -c 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; exec mysqldump --single-transaction --no-tablespaces -uroot "$BACKUP_DATABASE"' \
  > "$sql_temp"

if [[ ! -s "$sql_temp" ]] || ! tail -n 10 "$sql_temp" | grep -q -- '-- Dump completed on'; then
  echo "Error: database dump is empty or incomplete." >&2
  exit 1
fi
mv -- "$sql_temp" "$sql_file"
echo "Database backup: $sql_file"

if [[ -d "$upload_dir" ]]; then
  upload_parent=$(CDPATH= cd -- "$(dirname -- "$upload_dir")" && pwd)
  upload_name=$(basename -- "$upload_dir")

  echo "Backing up uploads from '$upload_dir'..."
  tar -C "$upload_parent" -czf "$uploads_temp" "$upload_name"
  tar -tzf "$uploads_temp" >/dev/null
  mv -- "$uploads_temp" "$uploads_file"
  echo "Uploads backup:  $uploads_file"
else
  echo "Uploads directory not found; skipped: $upload_dir"
fi

echo "Backup completed successfully."
