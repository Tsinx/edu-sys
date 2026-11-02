"""Recover complete CRC-verified members from a public ZIP still downloading.

Reads a fixed initial byte count, never an expanding EOF. Stops at the first
incomplete/unsupported local member. Does not infer unobserved directory entries
or call the partial file a complete ZIP. Input is an explicitly named browser
download of the already observed September2026 public monthly archive.
"""
import argparse
import binascii
import hashlib
import json
from pathlib import Path
import re
import struct
import zlib

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
URL = "https://download.companieshouse.gov.uk/Accounts_Monthly_Data-September2026.zip"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("--max-mib", type=int, default=512)
    args = ap.parse_args()
    bound = min(args.path.stat().st_size, args.max_mib * 1024**2)
    p = pd.read_csv(ROOT / "data/uk-payment-practices-2026-11-01.csv", dtype=str)
    companies = set(p["Company number"].dropna().str.upper().str.zfill(8))
    out = ROOT / "data/ch-selected-accounts"
    out.mkdir(exist_ok=True)
    receipts, entries, position, reason = [], 0, 0, "fixed_prefix_end"
    with args.path.open("rb") as h:
        while position + 30 <= bound:
            h.seek(position)
            block = h.read(30)
            v = struct.unpack("<4s5H3L2H", block)
            if v[0] in (b"PK\x01\x02", b"PK\x05\x06", b"PK\x06\x06"):
                reason = "central_directory_reached"
                break
            if v[0] != b"PK\x03\x04":
                reason = "unrecognized_local_header"
                break
            _, version, flags, method, tm, date, crc, csize, size, fnlen, exlen = v
            if flags & 9 or 0xFFFFFFFF in (csize, size):
                reason = "encrypted_descriptor_or_individual_zip64_not_supported"
                break
            end = position + 30 + fnlen + exlen + csize
            if end > bound:
                reason = "incomplete_member_at_prefix_end"
                break
            filename = h.read(fnlen).decode("utf-8" if flags & 2048 else "cp437")
            h.read(exlen)
            entries += 1
            m = re.search(r"_([A-Z0-9]{8})_(\d{8})\.(html|xml)$", filename, re.I)
            if m and m[1].upper() in companies and size <= 20 * 1024**2:
                payload = h.read(csize)
                if method == 8:
                    b = zlib.decompress(payload, -15)
                elif method == 0:
                    b = payload
                else:
                    raise ValueError((filename, "unsupported compression"))
                if len(b) != size or binascii.crc32(b) & 0xFFFFFFFF != crc:
                    raise ValueError((filename, "length/CRC mismatch"))
                sha = hashlib.sha256(b).hexdigest()
                dest = out / Path(filename).name
                if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() != sha:
                    raise ValueError("Conflicting original member filename")
                dest.write_bytes(b)
                receipts.append({"url": URL, "member": filename, "offset": position,
                                 "company_number": m[1].upper(), "balance_date_filename": m[2],
                                 "compressed_bytes": csize, "bytes": size, "crc32": f"{crc:08x}",
                                 "sha256": sha})
            position = end
    record = {"status": "bounded prefix inspection, not whole archive validation",
              "source": URL, "browser_local_input": str(args.path), "fixed_prefix_bytes": bound,
              "complete_members_scanned": entries, "last_complete_offset": position,
              "stop_reason": reason, "matched_files": len(receipts), "files": receipts}
    (ROOT / "records/ch-september-prefix-receipt.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in record.items() if k != "files"}, indent=2))


if __name__ == "__main__":
    main()
