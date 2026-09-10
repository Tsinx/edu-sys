#!/usr/bin/env bash
# Execute inside Edu-KWS. Installs dependencies only; never launches a recipe.
set -euo pipefail
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
training_root="${KWS_TRAINING_ROOT:-/home/edu/projects/edu-kws}"
mkdir -p "$training_root/vendor"
icefall_revision="$(tr -d '\r\n' < "$source_dir/icefall-revision.txt")"
if [[ ! -d "$training_root/vendor/icefall/.git" ]]; then
  git clone https://github.com/k2-fsa/icefall.git "$training_root/vendor/icefall"
fi
if [[ -n "$(git -C "$training_root/vendor/icefall" status --porcelain)" ]]; then
  python3 "$source_dir/patch_icefall.py" "$training_root/vendor/icefall" --check-only
fi
if ! git -C "$training_root/vendor/icefall" cat-file -e "$icefall_revision^{commit}"; then
  git -C "$training_root/vendor/icefall" fetch origin "$icefall_revision"
fi
git -C "$training_root/vendor/icefall" checkout --detach "$icefall_revision"
python3 "$source_dir/patch_icefall.py" "$training_root/vendor/icefall"
cp "$source_dir/pyproject.toml" "$source_dir/.python-version" "$training_root/"
if [[ -f "$source_dir/uv.lock" ]]; then
  cp "$source_dir/uv.lock" "$training_root/uv.lock"
fi
cd "$training_root"
export CUDA_VISIBLE_DEVICES=""
export UV_HTTP_TIMEOUT=180
if [[ -f "$source_dir/uv.lock" ]]; then
  uv sync --locked
else
  uv sync
fi
uv pip check --python .venv/bin/python
