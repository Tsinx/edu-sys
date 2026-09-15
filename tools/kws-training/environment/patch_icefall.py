"""Apply the two literal-percent escapes to the pinned upstream CLI help."""
import argparse
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("root", type=Path)
parser.add_argument("--check-only", action="store_true")
args = parser.parse_args()
relative = "egs/wenetspeech/KWS/zipformer/finetune.py"
original = subprocess.check_output(["git", "show", "HEAD:" + relative], cwd=args.root).decode()
patched = original.replace("mix 5% of the new data", "mix 5%% of the new data").replace(
    "with 95% of the original data", "with 95%% of the original data")
assert patched != original, "Pinned help text changed; review patch before proceeding"
status = subprocess.check_output(["git", "status", "--porcelain"], cwd=args.root).decode()
assert status in ("", " M " + relative + "\n"), "Unmanaged icefall changes; preserving checkout"
path = args.root / relative
assert path.read_text() in (original, patched), "Unmanaged finetune.py changes; preserving checkout"
if not args.check_only:
    path.write_text(patched)
    print("Applied managed argparse literal-percent help fix")
