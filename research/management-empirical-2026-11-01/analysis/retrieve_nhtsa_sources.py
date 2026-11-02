"""Re-fetch missing public sources from frozen receipts and verify snapshot hashes.

Live flat files change daily. A changed upstream snapshot fails verification;
never overwrite a retained original or silently substitute today's data.
"""
import hashlib
import json
from pathlib import Path
import time
from urllib.parse import urlparse
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def main():
    for receipt_name in ("nhtsa-download-receipt.json", "nhtsa-original-documents.json",
                         "nhtsa-chronology-supplements.json"):
        if not (ROOT/"records"/receipt_name).exists():
            continue
        receipt = json.loads((ROOT/"records"/receipt_name).read_text())
        for r in receipt["files"]:
            if r.get("status", "downloaded") != "downloaded":
                continue
            if urlparse(r["url"]).hostname != "static.nhtsa.gov":
                raise ValueError("Unexpected source host")
            path = ROOT/r["path"]
            if path.exists():
                body = path.read_bytes()
            else:
                with urlopen(r["url"],timeout=45) as source:
                    body = source.read(25*1024**2+1)
                time.sleep(0.4)
            if len(body) != r["bytes"] or hashlib.sha256(body).hexdigest() != r["sha256"]:
                raise ValueError(f"Source differs from frozen snapshot: {path.name}")
            if not path.exists():
                path.parent.mkdir(exist_ok=True,parents=True)
                path.write_bytes(body)
            print(path.name,"verified")


if __name__ == "__main__":
    main()
