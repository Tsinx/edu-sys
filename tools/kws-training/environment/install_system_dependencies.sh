#!/usr/bin/env bash
set -euo pipefail
if [[ "$EUID" -ne 0 ]]; then
  echo "Run this script as root inside Edu-KWS." >&2
  exit 1
fi
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export DEBIAN_FRONTEND=noninteractive
apt-get update
mapfile -t packages < <(tr -d '\r' < "$source_dir/system-packages.txt")
apt-get install -y --no-install-recommends "${packages[@]}"
