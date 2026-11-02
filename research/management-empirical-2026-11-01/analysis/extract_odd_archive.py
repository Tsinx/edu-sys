"""Serial, bounded extraction of original Stata aggregate data members."""
from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path, PurePosixPath
import tarfile

ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/"data/odd/data.tar.gz"
OUT=ROOT/"data/odd/raw"
RECEIPT=ROOT/"records/odd-archive-members.json"


def main():
    download=json.loads((ROOT/"records/odd-archive-download.json").read_text())
    sha=hashlib.sha256()
    with ARCHIVE.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            sha.update(chunk)
    if ARCHIVE.stat().st_size!=download["bytes"] or sha.hexdigest()!=download["sha256"]:
        raise ValueError("Original archive differs from download receipt")
    old=json.loads(RECEIPT.read_text()) if RECEIPT.exists() else {"files":[]}
    prior={a["member"]:a for a in old["files"]}
    OUT.mkdir(exist_ok=True)
    files=[]
    total=0
    def save(complete=False):
        RECEIPT.write_text(json.dumps({"status":"complete; archive gzip CRC and original member hashes checked" if complete else "partial serial extraction",
            "archive_sha256":download["sha256"],"source":download["source"],"members":len(files),
            "uncompressed_original_bytes":total,"files":files},indent=2),encoding="utf-8")
    with gzip.open(ARCHIVE,"rb") as raw, tarfile.open(fileobj=raw,mode="r|") as tf:
        for member in tf:
            path=PurePosixPath(member.name)
            if member.isdir() and member.name=="publish":
                continue
            if (not member.isfile() or path.parts[:1]!=("publish",) or len(path.parts)!=2
                    or path.suffix!=".dta" or not 0<member.size<15_000_000_000
                    or len(files)>=6 or total+member.size>45_000_000_000):
                raise ValueError("Unexpected original archive member: "+member.name)
            dest=OUT/path.name
            sha=hashlib.sha256()
            n=0
            if dest.exists():
                if member.name not in prior or dest.stat().st_size!=member.size:
                    raise ValueError("Existing member has no matching original receipt")
                with dest.open("rb") as f:
                    for chunk in iter(lambda:f.read(1024*1024),b""):
                        sha.update(chunk)
                        n+=len(chunk)
                if sha.hexdigest()!=prior[member.name]["sha256"]:
                    raise ValueError("Retained original member changed")
            else:
                partial=dest.with_suffix(".dta.partial")
                if partial.exists():
                    raise ValueError("Inspect previous partial extraction before retrying")
                next_log=1024*1024*1024
                with tf.extractfile(member) as src, partial.open("xb") as target:
                    for chunk in iter(lambda:src.read(1024*1024),b""):
                        n+=len(chunk)
                        if n>member.size:
                            raise ValueError("Member exceeds declared length")
                        sha.update(chunk)
                        target.write(chunk)
                        if n>=next_log:
                            print(json.dumps({"member":member.name,"written":n,"expected":member.size}),flush=True)
                            next_log+=1024*1024*1024
                if n!=member.size:
                    raise ValueError("Short member")
                partial.rename(dest)
            files.append({"member":member.name,"path":str(dest.relative_to(ROOT)),
                          "bytes":n,"sha256":sha.hexdigest()})
            total+=n
            save()
        # Consume the gzip trailer too, so tar's early end marker does not stand
        # in for actual gzip CRC/length verification.
        for _ in iter(lambda:raw.read(1024*1024),b""):
            pass
    save(complete=True)
    print(json.dumps({"members":len(files),"uncompressed_bytes":total,
                      "files":[a["member"] for a in files]},indent=2),flush=True)


if __name__=="__main__":
    main()
