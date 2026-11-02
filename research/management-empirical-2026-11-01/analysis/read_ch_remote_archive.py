"""Read the observed public monthly ZIP by verified HTTP byte ranges.

Inventory streams the central directory in4MiB chunks. Extraction reads only
matched original account members, serially, verifying ZIP CRC/size and SHA256.
This does not download or certify the whole3.36GB archive. Source version is
pinned by ETag and If-Match on every request; no Companies House API is used.
"""
import argparse
import binascii
import hashlib
import json
from pathlib import Path
import re
import struct
import time
import urllib.error
import urllib.request
import zlib
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
URL="https://download.companieshouse.gov.uk/Accounts_Monthly_Data-September2026.zip"
INVENTORY=ROOT/"records/ch-september-range-inventory.json"
EXTRACTION=ROOT/"records/ch-september-range-extraction.json"
OUT=ROOT/"data/ch-range-accounts"
BLOCK=4*1024**2
MAX_MEMBER=20*1024**2


class PublicRanges:
    def __init__(self,expected=None):
        request=urllib.request.Request(URL,method="HEAD",headers={"User-Agent":"Academic public accounts verification"})
        with urllib.request.urlopen(request,timeout=25) as response:
            self.size=int(response.headers["Content-Length"])
            self.etag=response.headers.get("ETag","")
            self.modified=response.headers.get("Last-Modified","")
        if not self.etag or self.size<=0:
            raise ValueError("No source version/length")
        if expected and (expected["etag"]!=self.etag or expected["archive_bytes"]!=self.size):
            raise ValueError("Archive version changed; retain existing inventory and audit a separate version")
        self.requests=0
        self.bytes=0

    def get(self,start,length):
        if not 0<=start<self.size or length<=0 or length>MAX_MEMBER+131072:
            raise ValueError("Invalid bounded range")
        end=min(self.size-1,start+length-1)
        headers={"User-Agent":"Academic public accounts verification","Range":f"bytes={start}-{end}","If-Match":self.etag}
        for attempt in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(URL,headers=headers),timeout=25) as response:
                    expected=f"bytes {start}-{end}/{self.size}"
                    if response.status!=206 or response.headers.get("Content-Range")!=expected:
                        raise ValueError("Server did not honor exact byte range")
                    if response.headers.get("ETag")!=self.etag:
                        raise ValueError("Source ETag changed")
                    raw=response.read(end-start+2)
                    if len(raw)!=end-start+1:
                        raise ValueError("Range response length differs")
                self.requests+=1
                self.bytes+=len(raw)
                time.sleep(.15)
                return raw
            except urllib.error.HTTPError as error:
                if error.code not in [429,500,502,503,504] or attempt==2:
                    raise
                time.sleep(min(2**(attempt+1),8))
            except (TimeoutError,urllib.error.URLError):
                if attempt==2:
                    raise
                time.sleep(2**(attempt+1))
        raise AssertionError("unreachable")


class CentralStream:
    def __init__(self,source,start,size):
        self.source=source
        self.remote=start
        self.end=start+size
        self.buf=b""
        self.pos=0
        self.consumed=0
        self.digest=hashlib.sha256()

    def read(self,count):
        if count<0 or count>262144:
            raise ValueError("Unexpected central record length")
        while len(self.buf)-self.pos<count:
            if self.remote>=self.end:
                raise ValueError("Incomplete central directory record")
            more=self.source.get(self.remote,min(BLOCK,self.end-self.remote))
            self.digest.update(more)
            self.remote+=len(more)
            self.buf=self.buf[self.pos:]+more
            self.pos=0
        data=self.buf[self.pos:self.pos+count]
        self.pos+=count
        self.consumed+=count
        return data


def directory_location(source):
    tail=source.get(max(0,source.size-131072),min(source.size,131072))
    offset=tail.rfind(b"PK\x05\x06")
    if offset<0:
        raise ValueError("ZIP end marker missing")
    end=struct.unpack_from("<4s4H2LH",tail,offset)
    if end[1] or end[2] or len(tail)-offset!=22+end[7]:
        raise ValueError("Multidisk or inconsistent ZIP end")
    count,size,start=end[4],end[5],end[6]
    if 65535 in [end[3],end[4]] or 0xFFFFFFFF in [size,start]:
        if offset<20:
            raise ValueError("ZIP64 locator missing")
        loc=struct.unpack_from("<4sLQL",tail,offset-20)
        if loc[0]!=b"PK\x06\x07" or loc[1]!=0 or loc[3]!=1:
            raise ValueError("Unsupported ZIP64 locator")
        rec=source.get(loc[2],56)
        z=struct.unpack("<4sQ2H2L4Q",rec)
        if z[0]!=b"PK\x06\x06" or z[4]!=0 or z[5]!=0 or z[6]!=z[7]:
            raise ValueError("Unsupported ZIP64 directory")
        count,size,start=z[7],z[8],z[9]
    if start+size>source.size or size>128*1024**2:
        raise ValueError("Directory outside bounded source")
    return count,size,start,hashlib.sha256(tail).hexdigest()


def resolve_zip64(usize,csize,local,extra):
    if 0xFFFFFFFF not in [usize,csize,local]:
        return usize,csize,local
    pos=0
    while pos+4<=len(extra):
        kind,length=struct.unpack_from("<HH",extra,pos)
        value=extra[pos+4:pos+4+length]
        if kind==1:
            n=0
            values=[]
            for current in [usize,csize,local]:
                if current==0xFFFFFFFF:
                    values.append(struct.unpack_from("<Q",value,n)[0]);n+=8
                else:
                    values.append(current)
            return tuple(values)
        pos+=4+length
    raise ValueError("Required ZIP64 sizes absent")


def inventory():
    source=PublicRanges()
    total,cd_size,cd_start,tail_sha=directory_location(source)
    payment=pd.read_csv(ROOT/"data/uk-payment-practices-2026-11-01.csv",dtype=str)
    companies=set(payment["Company number"].dropna().str.upper().str.zfill(8))
    stream=CentralStream(source,cd_start,cd_size)
    matches=[]
    for i in range(total):
        h=struct.unpack("<4s6H3L5H2L",stream.read(46))
        if h[0]!=b"PK\x01\x02":
            raise ValueError("Invalid central member signature")
        flags,method,crc,csize,usize=h[3],h[4],h[7],h[8],h[9]
        raw_name=stream.read(h[10]);extra=stream.read(h[11]);stream.read(h[12])
        name=raw_name.decode("utf-8" if flags&2048 else "cp437")
        usize,csize,local=resolve_zip64(usize,csize,h[16],extra)
        found=re.search(r"_([A-Z0-9]{8})_(\d{8})\.(html|xml)$",name,re.I)
        if found and found[1].upper() in companies and usize<=MAX_MEMBER:
            matches.append({"member":name,"company_number":found[1].upper(),"balance_date_filename":found[2],
                            "crc32":f"{crc:08x}","bytes":usize,"compressed_bytes":csize,"local_offset":local,
                            "compression":method,"flags":flags})
        if (i+1)%100000==0:
            print(json.dumps({"stage":"directory","members":i+1,"matched":len(matches)}),flush=True)
    trailing=cd_size-stream.consumed
    if trailing:
        rest=stream.read(trailing)
        if not rest.startswith(b"PK\x05\x05"):
            raise ValueError("Unrecognized central-directory trailing data")
    previous=json.loads((ROOT/"records/ch-september-prefix-receipt.json").read_text())
    prior={z["member"]:z for z in previous["files"]}
    comparable=[z for z in matches if z["member"] in prior]
    differences=[z["member"] for z in comparable if z["crc32"]!=prior[z["member"]]["crc32"] or z["bytes"]!=prior[z["member"]]["bytes"]]
    result={"status":"complete central-directory inventory, not whole-archive download or CRC validation",
            "source":URL,"archive_bytes":source.size,"etag":source.etag,"last_modified":source.modified,
            "central_directory_start":cd_start,"central_directory_bytes":cd_size,"central_directory_sha256":stream.digest.hexdigest(),
            "tail_sha256":tail_sha,"archive_member_count":total,"matched_members":len(matches),
            "matched_company_numbers":len({z["company_number"] for z in matches}),
            "previous_prefix_members_found":len(comparable),"previous_prefix_metadata_differences":differences,
            "http_range_requests":source.requests,"bytes_transferred_this_inventory":source.bytes,
            "matches":matches}
    if INVENTORY.exists():
        old=json.loads(INVENTORY.read_text())
        if old["etag"]!=source.etag or old["central_directory_sha256"]!=result["central_directory_sha256"]:
            raise ValueError("Refusing to overwrite a different source inventory")
    INVENTORY.write_text(json.dumps(result,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="matches"},indent=2),flush=True)


def extract(limit):
    meta=json.loads(INVENTORY.read_text())
    source=PublicRanges(meta)
    old=json.loads(EXTRACTION.read_text()) if EXTRACTION.exists() else {"etag":source.etag,"files":[]}
    if old["etag"]!=source.etag:
        raise ValueError("Refusing to mix extraction source versions")
    done={z["member"]:z for z in old["files"]}
    OUT.mkdir(exist_ok=True)
    new_count=0
    reused_count=0
    def save():
        result={"status":"serial original-member extraction; ZIP CRC, byte count and SHA256 checked",
                "source":URL,"etag":source.etag,"archive_bytes":source.size,"last_modified":source.modified,
                "matched_members_in_inventory":len(meta["matches"]),"extracted_members":len(done),
                "http_range_requests_this_run":source.requests,"bytes_transferred_this_run":source.bytes,
                "whole_archive_downloaded":False,"reused_prefix_originals_this_run":reused_count,
                "files":sorted(done.values(),key=lambda z:z["member"])}
        EXTRACTION.write_text(json.dumps(result,indent=2),encoding="utf-8")
    # Reuse originals already extracted and CRC-verified from this same public
    # archive. Compare the current central-directory metadata and rehash bytes;
    # do not redownload or create duplicate copies of those original members.
    prefix=json.loads((ROOT/"records/ch-september-prefix-receipt.json").read_text())
    available={z["member"]:z for z in prefix["files"]}
    for member in meta["matches"]:
        name=member["member"]
        prior=available.get(name)
        if name in done or prior is None:
            continue
        p=ROOT/"data/ch-selected-accounts"/Path(name).name
        if not p.exists():
            continue
        payload=p.read_bytes()
        sha=hashlib.sha256(payload).hexdigest()
        if (member["bytes"]!=prior["bytes"] or member["crc32"]!=prior["crc32"]
                or member["compressed_bytes"]!=prior["compressed_bytes"]
                or member["local_offset"]!=prior["offset"]
                or sha!=prior["sha256"] or len(payload)!=member["bytes"]
                or f"{binascii.crc32(payload)&0xFFFFFFFF:08x}"!=member["crc32"]):
            raise ValueError("Retained prefix original differs from current archive metadata")
        done[name]={**member,"path":str(p.relative_to(ROOT)),"sha256":sha,
                    "acquisition":"retained CRC-verified prefix original; current directory metadata agrees"}
        reused_count+=1
    save()
    for member in meta["matches"]:
        name=member["member"]
        dest=OUT/Path(name).name
        if name in done:
            retained=ROOT/done[name]["path"]
            if not retained.exists() or hashlib.sha256(retained.read_bytes()).hexdigest()!=done[name]["sha256"]:
                raise ValueError("Existing original member changed")
            continue
        if new_count>=limit:
            break
        if member["flags"]&1 or member["compression"] not in [0,8]:
            raise ValueError("Unsupported encrypted/compressed member")
        # One bounded read generally covers header+name+extra+payload. Extra
        # bytes belong to the same public archive and are never interpreted.
        raw=source.get(member["local_offset"],min(source.size-member["local_offset"],member["compressed_bytes"]+2048))
        header=struct.unpack_from("<4s5H3L2H",raw)
        if header[0]!=b"PK\x03\x04" or header[3]!=member["compression"]:
            raise ValueError("Local/central header differs")
        fnlen,exlen=header[-2:]
        required=30+fnlen+exlen+member["compressed_bytes"]
        if required>len(raw):
            raw+=source.get(member["local_offset"]+len(raw),required-len(raw))
        local_name=raw[30:30+fnlen].decode("utf-8" if header[2]&2048 else "cp437")
        if local_name!=name:
            raise ValueError("Local filename differs")
        compressed=raw[30+fnlen+exlen:required]
        if member["compression"]==8:
            obj=zlib.decompressobj(-15)
            payload=obj.decompress(compressed,member["bytes"]+1)
            if not obj.eof or obj.unconsumed_tail or obj.unused_data:
                raise ValueError("Deflate stream differs from declared member")
        else:
            payload=compressed
        if len(payload)!=member["bytes"] or f"{binascii.crc32(payload)&0xFFFFFFFF:08x}"!=member["crc32"]:
            raise ValueError("Member size/CRC mismatch")
        sha=hashlib.sha256(payload).hexdigest()
        if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()!=sha:
            raise ValueError("Refusing to overwrite a different original member")
        dest.write_bytes(payload)
        done[name]={**member,"path":str(dest.relative_to(ROOT)),"sha256":sha}
        new_count+=1
        save()
        if new_count%20==0:
            print(json.dumps({"stage":"extract","new_this_run":new_count,"total_extracted":len(done),
                              "bytes_transferred_this_run":source.bytes}),flush=True)
    save()
    print(json.dumps({"new_extracted":new_count,"total_extracted":len(done),
                      "matched_members":len(meta["matches"]),"bytes_transferred":source.bytes},indent=2),flush=True)


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--inventory",action="store_true")
    parser.add_argument("--extract-limit",type=int,default=0)
    args=parser.parse_args()
    if args.inventory:
        inventory()
    if args.extract_limit:
        if not 1<=args.extract_limit<=2000:
            raise ValueError("Extraction batch must be1..2000")
        extract(args.extract_limit)
