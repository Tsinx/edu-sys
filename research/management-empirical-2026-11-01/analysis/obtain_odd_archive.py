"""Stream the authors' public aggregate dataset, without loading it into RAM.

The Drive connector has a256MiB response cap. Follow the ordinary public-file
download page and its displayed large-file confirmation form instead. No
authentication, permission changes, private endpoint, or executable is used.
"""
from __future__ import annotations

import hashlib
from html.parser import HTMLParser
import http.cookiejar
import json
from pathlib import Path
import urllib.parse
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
FILE_ID="1_nZOYhYfOu0zeu6m6etyFH8z3mwWzEl1"
EXPECTED=1971012271
SOURCE=f"https://drive.google.com/file/d/{FILE_ID}/view"
OUT=ROOT/"data/odd/data.tar.gz"
RECEIPT=ROOT/"records/odd-archive-download.json"


class DownloadForm(HTMLParser):
    def __init__(self):
        super().__init__()
        self.action=None
        self.inside=False
        self.fields={}

    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=="form" and attrs.get("id")=="download-form":
            if attrs.get("method","").lower()!="get":
                raise ValueError("Unexpected download form method")
            self.inside=True
            self.action=attrs.get("action")
        if tag=="input" and self.inside and attrs.get("type")=="hidden":
            self.fields[attrs["name"]]=attrs.get("value","")

    def handle_endtag(self,tag):
        if tag=="form":
            self.inside=False


def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    if OUT.exists():
        prior=json.loads(RECEIPT.read_text())
        if OUT.stat().st_size!=EXPECTED or digest(OUT)!=prior["sha256"]:
            raise ValueError("Existing original differs")
        print(json.dumps({"status":"existing original verified","bytes":EXPECTED}),flush=True)
        return
    partial=OUT.with_suffix(".gz.partial")
    if partial.exists():
        raise ValueError("A partial download exists; inspect before retrying")
    opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    opener.addheaders=[("User-Agent","Mozilla/5.0")]
    landing=f"https://drive.google.com/uc?export=download&id={FILE_ID}"
    response=opener.open(landing,timeout=45)
    used_confirmation=False
    if "text/html" in response.headers.get("Content-Type",""):
        html=response.read(131073)
        response.close()
        if len(html)>131072:
            raise ValueError("Unexpected large download page")
        form=DownloadForm()
        form.feed(html.decode("utf-8"))
        if (form.action!="https://drive.usercontent.google.com/download"
                or form.fields.get("id")!=FILE_ID
                or form.fields.get("export")!="download"
                or form.fields.get("confirm")!="t"):
            raise ValueError("No ordinary public large-file download form")
        # This is Drive's displayed Download anyway form, not a browser security
        # interstitial or a CAPTCHA. The file is aggregate data, never executed.
        response=opener.open(form.action+"?"+urllib.parse.urlencode(form.fields),timeout=60)
        used_confirmation=True
    if "text/html" in response.headers.get("Content-Type",""):
        response.close()
        raise ValueError("Public download returned HTML; no dataset acquired")
    claimed=response.headers.get("Content-Length")
    if claimed and int(claimed)!=EXPECTED:
        response.close()
        raise ValueError("Remote length differs from Drive metadata")
    n=0
    sha=hashlib.sha256()
    step=64*1024*1024
    next_log=step
    with response, partial.open("xb") as f:
        while chunk:=response.read(1024*1024):
            if n==0 and not chunk.startswith(b"\x1f\x8b"):
                raise ValueError("Dataset is not the declared gzip archive")
            n+=len(chunk)
            if n>EXPECTED:
                raise ValueError("Response exceeded declared original size")
            f.write(chunk)
            sha.update(chunk)
            if n>=next_log:
                print(json.dumps({"downloaded_bytes":n,"expected_bytes":EXPECTED}),flush=True)
                next_log+=step
    if n!=EXPECTED:
        raise ValueError("Original download is incomplete")
    partial.rename(OUT)
    receipt={"status":"complete original archive downloaded; members not yet inspected",
             "source":SOURCE,"source_folder":"https://drive.google.com/drive/folders/1qN9jndr5lJBym8nrKhsKbItZnb5dZ5S-",
             "path":str(OUT.relative_to(ROOT)),"bytes":n,"sha256":sha.hexdigest(),
             "method":"serial public HTTPS download via ordinary Google Drive download form",
             "large_file_confirmation":used_confirmation,"retrieved":"2026-11-01"}
    RECEIPT.write_text(json.dumps(receipt,indent=2),encoding="utf-8")
    print(json.dumps(receipt,indent=2),flush=True)


if __name__=="__main__":
    main()
