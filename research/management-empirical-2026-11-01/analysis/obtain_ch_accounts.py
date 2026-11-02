"""Read only selected members of an observed public Companies House ZIP.

Native curl uses the working Windows TLS stack. HTTP Range, ETag, byte-count,
decompressed length and CRC are checked. No entire-archive integrity claim.
Downloads are serial, bounded and cached; no extracted HTML is executed.
"""
from __future__ import annotations

import argparse
import binascii
import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess
import tempfile
import zlib

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://download.companieshouse.gov.uk/"


class RangeZip:
    def __init__(self, filename: str):
        if not re.fullmatch(r"Accounts_Monthly_Data-[A-Za-z]+202[56]\.zip", filename):
            raise ValueError("Use a filename observed on the official monthly listing")
        self.filename = filename
        self.url = BASE + filename
        self.cache = ROOT / "data" / filename.removesuffix(".zip")
        self.cache.mkdir(exist_ok=True)
        p = subprocess.run(["curl.exe", "-sS", "-fI", "--max-time", "45", self.url],
                           capture_output=True, check=True)
        self.headers = p.stdout.decode("latin1")
        self.size = int(re.findall(r"(?im)^Content-Length:\s*(\d+)", self.headers)[-1])
        self.etag = re.findall(r"(?im)^ETag:\s*(.+)", self.headers)[-1].strip()
        self.transferred = 0

    def get(self, start: int, end: int) -> bytes:
        if not 0 <= start <= end < self.size:
            raise ValueError((start, end, self.size))
        length = end - start + 1
        if length > 64 * 1024**2:
            raise ValueError("A single range is limited to 64 MiB")
        key = self.cache / f"range-{start}-{end}.bin"
        meta = key.with_suffix(".json")
        if key.exists() and meta.exists():
            receipt = json.loads(meta.read_text())
            b = key.read_bytes()
            if (receipt["etag"] == self.etag and len(b) == length
                    and hashlib.sha256(b).hexdigest() == receipt["sha256"]):
                return b
            raise ValueError("Cached range integrity/snapshot mismatch")
        with tempfile.TemporaryDirectory(prefix="ch-range-") as d:
            body, hdr = Path(d) / "body", Path(d) / "headers"
            subprocess.run(["curl.exe", "-sS", "-f", "--max-time", "90",
                            "--max-filesize", str(length), "--range", f"{start}-{end}",
                            "--dump-header", str(hdr), "--output", str(body), self.url],
                           check=True, capture_output=True)
            h, b = hdr.read_text(encoding="latin1"), body.read_bytes()
        if not re.search(r"(?m)^HTTP/[^ ]+ 206\b", h):
            raise ValueError("Server did not honor HTTP Range")
        cr = re.findall(r"(?im)^Content-Range:\s*bytes (\d+)-(\d+)/(\d+)", h)
        et = re.findall(r"(?im)^ETag:\s*(.+)", h)[-1].strip()
        if not cr or tuple(map(int, cr[-1])) != (start, end, self.size):
            raise ValueError("Content-Range mismatch")
        if et != self.etag or len(b) != length:
            raise ValueError("Archive snapshot or byte-count changed")
        key.write_bytes(b)
        meta.write_text(json.dumps({"url": self.url, "start": start, "end": end,
                                   "etag": self.etag, "sha256": hashlib.sha256(b).hexdigest()}),
                        encoding="utf-8")
        self.transferred += len(b)
        return b

    def index(self) -> tuple[list[dict], int]:
        start = max(0, self.size - 131072)
        tail = self.get(start, self.size - 1)
        pos = tail.rfind(b"PK\x05\x06")
        if pos < 0:
            raise ValueError("ZIP end record not found")
        e = struct.unpack_from("<4s4H2LH", tail, pos)
        count, cdsize, cdoffset = e[4], e[5], e[6]
        if count == 65535 or max(cdsize, cdoffset) == 0xFFFFFFFF:
            loc = struct.unpack_from("<4sLQL", tail, pos - 20)
            if loc[0] != b"PK\x06\x07" or loc[1] != 0 or loc[3] != 1:
                raise ValueError("Unsupported multipart ZIP")
            record = self.get(loc[2], loc[2] + 55)
            zz = struct.unpack("<4sQ2H2L4Q", record)
            if zz[0] != b"PK\x06\x06":
                raise ValueError("ZIP64 end record missing")
            count, cdsize, cdoffset = zz[7], zz[8], zz[9]
        cd = self.get(cdoffset, cdoffset + cdsize - 1)
        members, pos = [], 0
        while pos < len(cd):
            v = struct.unpack_from("<4s6H3L5H2L", cd, pos)
            if v[0] != b"PK\x01\x02":
                raise ValueError("Invalid central directory")
            fnlen, exlen, colen = v[10:13]
            fn = cd[pos + 46:pos + 46 + fnlen].decode("utf-8" if v[3] & 2048 else "cp437")
            if 0xFFFFFFFF in (v[8], v[9], v[16]):
                raise ValueError("A ZIP64 individual member needs explicit support")
            members.append({"member": fn, "flags": v[3], "method": v[4], "crc": v[7],
                            "compressed": v[8], "bytes": v[9], "offset": v[16]})
            pos += 46 + fnlen + exlen + colen
        if len(members) != count:
            raise ValueError("Directory count mismatch")
        by_offset = sorted(members, key=lambda x: x["offset"])
        for j, m in enumerate(by_offset):
            m["range_end"] = (by_offset[j + 1]["offset"] if j + 1 < len(by_offset) else cdoffset) - 1
        return members, cdoffset

    def extract(self, member: dict) -> tuple[bytes, dict]:
        if member["bytes"] > 20 * 1024**2 or member["flags"] & 1:
            raise ValueError("Large/encrypted member excluded")
        block = self.get(member["offset"], member["range_end"])
        h = struct.unpack_from("<4s5H3L2H", block)
        if h[0] != b"PK\x03\x04":
            raise ValueError("Invalid local header")
        payload = block[30 + h[9] + h[10]:30 + h[9] + h[10] + member["compressed"]]
        if member["method"] == 8:
            b = zlib.decompress(payload, -15)
        elif member["method"] == 0:
            b = payload
        else:
            raise ValueError("Unsupported compression")
        if len(b) != member["bytes"] or binascii.crc32(b) & 0xFFFFFFFF != member["crc"]:
            raise ValueError("Member length/CRC mismatch")
        receipt = dict(member, sha256=hashlib.sha256(b).hexdigest(), url=self.url, etag=self.etag)
        return b, receipt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("filename")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    if not 0 <= args.limit <= 150:
        raise ValueError("One bounded run allows 0 to 150 files")
    z = RangeZip(args.filename)
    entries, offset = z.index()
    f = pd.read_csv(ROOT / "data/uk-payment-practices-2026-11-01.csv", dtype=str)
    companies = set(f["Company number"].dropna().str.upper().str.zfill(8))
    matched = []
    for e in entries:
        m = re.search(r"_([A-Z0-9]{8})_(\d{8})\.(html|xml|zip)$", e["member"], re.I)
        if m and m[1].upper() in companies:
            matched.append(dict(e, company_number=m[1].upper(), balance_date_filename=m[2]))
    stem = args.filename.removesuffix(".zip")
    out = ROOT / f"records/{stem}-index.json"
    record = {"source": z.url, "archive_bytes": z.size, "etag": z.etag,
              "members": len(entries), "central_directory_offset": offset,
              "matched_payment_members": matched}
    out.write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in record.items() if k != "matched_payment_members"}
                     | {"payment_matches": len(matched)}), flush=True)
    # Pilot includes files with two balance dates potentially identifying the first new-scope FY.
    eligible = [m for m in matched if "20250405" <= m["balance_date_filename"] <= "20260331"
                and m["member"].endswith((".html", ".xml"))]
    eligible.sort(key=lambda m: hashlib.sha256(m["member"].encode()).hexdigest())
    target = ROOT / "data/ch-selected-accounts"
    target.mkdir(exist_ok=True)
    receipts = []
    for i, m in enumerate(eligible[:args.limit]):
        b, receipt = z.extract(m)
        path = target / Path(m["member"]).name
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != receipt["sha256"]:
            raise ValueError("Conflicting original member filename")
        path.write_bytes(b)
        receipts.append(receipt)
        (ROOT / f"records/{stem}-selected-receipt.json").write_text(
            json.dumps({"source": z.url, "eligible_members": len(eligible),
                        "selection": "SHA256 order of original member name; specified date interval",
                        "files": receipts}, indent=2), encoding="utf-8")
        if (i + 1) % 10 == 0:
            print(f"CRC-verified {i + 1}/{min(args.limit, len(eligible))} members", flush=True)
    print(json.dumps({"eligible_members": len(eligible), "verified_files": len(receipts),
                      "new_transferred_bytes": z.transferred}), flush=True)


if __name__ == "__main__":
    main()
