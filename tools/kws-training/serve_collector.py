"""Loopback-only, CPU-only speech collection. Python standard library; no ML imports."""
import argparse
from array import array
import csv
from datetime import datetime, timezone
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import math
from pathlib import Path
import re
import secrets
import sys
import threading
from urllib.parse import parse_qs, urlparse
import uuid
import wave
import zipfile

ROOT = Path(__file__).resolve().parents[2]
STATIC = Path(__file__).resolve().parent / "collector"
MAX_BYTES = 270_000
DEFAULT_PHRASES = {"wake": "你好助手", "end": "非常感谢",
                   "wake_xiaomai": "小麦老师", "end_thanks": "谢谢"}


def now():
    return datetime.now(timezone.utc).isoformat()


def inspect_wav(data):
    try:
        with wave.open(io.BytesIO(data), "rb") as audio:
            if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getcomptype()) != (1, 2, 16000, "NONE"):
                raise ValueError("需要 16 kHz、单声道、16 bit PCM WAV。")
            frames = audio.getnframes()
            duration = frames / 16000
            if not 0.7 <= duration <= 8.2:
                raise ValueError("每条录音应为 0.7–8 秒，请重新录制。")
            pcm = audio.readframes(frames)
            if len(pcm) != frames * 2:
                raise ValueError("录音文件不完整，请重新录制。")
    except (wave.Error, EOFError) as error:
        raise ValueError("无法读取 WAV 录音。") from error
    samples = array("h", pcm)
    if sys.byteorder != "little":
        samples.byteswap()
    rms = math.sqrt(sum(s * s for s in samples) / len(samples)) / 32768
    peak = max(abs(s) for s in samples) / 32768
    if rms < 0.0001:
        raise ValueError("录音几乎无声，请检查麦克风后重录。")
    return {"duration": round(duration, 3), "sampleRate": 16000, "channels": 1,
            "sampleWidth": 2, "rmsDb": round(20 * math.log10(rms), 1),
            "peak": round(peak, 4), "clippedRatio": round(sum(abs(s) >= 32760 for s in samples) / len(samples), 5)}


class Dataset:
    def __init__(self, directory):
        self.directory = directory.resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.manifest = self.directory / "dataset.json"
        self.lock = threading.RLock()
        if self.manifest.exists():
            self.data = json.loads(self.manifest.read_text(encoding="utf-8"))
        else:
            self.data = {"schemaVersion": 1, "id": str(uuid.uuid4()), "createdAt": now(), "target": 20,
                         "phrases": dict(DEFAULT_PHRASES), "clips": []}
        # Fail explicitly on damage; never silently discard an existing dataset.
        for clip in self.data["clips"]:
            if not self.clip_path(clip).is_file():
                raise ValueError(f"数据集文件缺失：{clip['id']}。请恢复文件后重启。")
        # Extend old collections without changing their labels, takes, IDs, or files.
        missing = DEFAULT_PHRASES.keys() - self.data["phrases"].keys()
        for category in DEFAULT_PHRASES:
            self.data["phrases"].setdefault(category, DEFAULT_PHRASES[category])
        if missing or not self.manifest.exists():
            self.persist()

    def clip_path(self, clip):
        path = (self.directory / clip["file"]).resolve()
        if not path.is_relative_to(self.directory) or path.suffix != ".wav":
            raise ValueError("无效的录音路径。")
        return path

    def persist(self):
        temporary = self.manifest.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(self.manifest)

    def configure(self, phrases):
        with self.lock:
            # Older open tabs can still save their two labels without dropping new groups.
            if not isinstance(phrases, dict) or set(phrases) not in ({"wake", "end"}, set(DEFAULT_PHRASES)):
                raise ValueError("录音分组已更新，请刷新页面。")
            if any(not isinstance(v, str) or not 1 <= len(v.strip()) <= 32 or any(ord(c) < 32 for c in v) for v in phrases.values()):
                raise ValueError("词语应为 1–32 个字。")
            phrases = {**self.data["phrases"], **{k: v.strip() for k, v in phrases.items()}}
            if len(set(phrases.values())) != len(phrases):
                raise ValueError("各组词语不能相同。")
            for category in phrases:
                if phrases[category] != self.data["phrases"][category] and any(c["category"] == category for c in self.data["clips"]):
                    raise ValueError("这一组已有录音，不能修改标签。请先导出备份并移除这一组录音。")
            previous = self.data["phrases"]
            self.data["phrases"] = phrases
            try:
                self.persist()
            except OSError:
                self.data["phrases"] = previous
                raise

    def add(self, category, phrase, clip_id, data):
        stats = inspect_wav(data)
        if not re.fullmatch(r"[a-f0-9]{32}", clip_id):
            raise ValueError("无效的录音编号。")
        digest = hashlib.sha256(data).hexdigest()
        with self.lock:
            existing = next((c for c in self.data["clips"] if c["id"] == clip_id), None)
            if existing:
                if existing["sha256"] == digest and existing["category"] == category and existing["text"] == phrase:
                    return existing  # A lost HTTP response can safely be retried.
                raise ValueError("录音编号重复，请刷新后重试。")
            if category not in self.data["phrases"] or phrase != self.data["phrases"][category]:
                raise ValueError("词语已在其他窗口修改，请刷新后重录。")
            if sum(c["category"] == category for c in self.data["clips"]) >= self.data["target"]:
                raise ValueError("这一组已收集 20 条。如需重录，请先移除其中一条。")
            clip = {"id": clip_id, "category": category, "text": phrase,
                    "file": f"audio/{category}/{clip_id}.wav", "createdAt": now(),
                    "sha256": digest, **stats}
            path = self.clip_path(clip)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            self.data["clips"].append(clip)
            try:
                self.persist()
            except OSError:
                self.data["clips"].remove(clip)
                path.unlink(missing_ok=True)
                raise
            return clip

    def remove(self, clip_id):
        with self.lock:
            clip = next((c for c in self.data["clips"] if c["id"] == clip_id), None)
            if clip is None:
                raise ValueError("这条录音已不存在，请刷新列表。")
            old = self.data["clips"]
            self.data["clips"] = [c for c in old if c["id"] != clip_id]
            try:
                self.persist()
            except OSError:
                self.data["clips"] = old
                raise
            # Preserve removed takes locally for recovery; excluded from all exports/counts.
            archive = self.directory / "discarded"
            archive.mkdir(exist_ok=True)
            try:
                self.clip_path(clip).replace(archive / f"{clip_id}.wav")
            except OSError:
                pass  # An orphan WAV is harmless; the committed manifest is authoritative.

    def export(self):
        with self.lock:
            output = io.BytesIO()
            with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as bundle:
                bundle.writestr("dataset.json", json.dumps(self.data, ensure_ascii=False, indent=2))
                rows = []
                table = io.StringIO(newline="")
                writer = csv.writer(table)
                writer.writerow(["id", "audio_filepath", "text", "category", "duration", "sample_rate"])
                for clip in self.data["clips"]:
                    bundle.write(self.clip_path(clip), clip["file"])
                    rows.append(json.dumps({"audio_filepath": clip["file"], "text": clip["text"],
                                           "category": clip["category"], "duration": clip["duration"]}, ensure_ascii=False))
                    writer.writerow([clip["id"], clip["file"], clip["text"], clip["category"], clip["duration"], 16000])
                bundle.writestr("recordings.jsonl", "\n".join(rows) + ("\n" if rows else ""))
                bundle.writestr("metadata.csv", "\ufeff" + table.getvalue())
                bundle.writestr("README.txt", "个人关键词原始录音；16 kHz / mono / PCM16 WAV。\n"
                                "标签由录制人确认，未做 ASR 验证。没有启动训练。\n"
                                "recordings.jsonl 是原始索引，不是 icefall/Lhotse 的最终训练清单。\n"
                                "训练前还需负样本、独立验证集和数据准备；不要把同条录音的增强版本跨训练/验证集分配。\n")
            return output.getvalue()


def make_server(directory, port=8766):
    dataset = Dataset(directory)
    token = secrets.token_urlsafe(32)

    class Handler(BaseHTTPRequestHandler):
        def reply(self, status, data, mime="application/json; charset=utf-8", filename=None):
            if not isinstance(data, bytes):
                data = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'")
            if filename:
                self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.end_headers()
            self.wfile.write(data)

        def allowed(self, mutation=False):
            host = f"127.0.0.1:{self.server.server_port}"
            origin = self.headers.get("Origin")
            if self.headers.get("Host") != host or origin not in (None, f"http://{host}"):
                self.reply(403, {"error": "请从本机 127.0.0.1 地址访问录音页。"})
                return False
            if mutation and not secrets.compare_digest(self.headers.get("X-Collector-Token", ""), token):
                self.reply(403, {"error": "连接已更新，请刷新页面。"})
                return False
            return True

        def do_GET(self):
            if not self.allowed():
                return
            path = urlparse(self.path).path
            static = {"/": ("index.html", "text/html; charset=utf-8"),
                      "/app.js": ("app.js", "text/javascript; charset=utf-8"),
                      "/styles.css": ("styles.css", "text/css; charset=utf-8"),
                      "/microphone.js": ("microphone.js", "text/javascript; charset=utf-8")}
            try:
                if path in static:
                    filename, mime = static[path]
                    self.reply(200, (STATIC / filename).read_bytes(), mime)
                elif path == "/api/state":
                    with dataset.lock:
                        self.reply(200, {**dataset.data, "token": token, "storagePath": str(dataset.directory)})
                elif path == "/api/export":
                    self.reply(200, dataset.export(), "application/zip", "kws-recordings.zip")
                elif path.startswith("/api/audio/"):
                    clip_id = path.removeprefix("/api/audio/")
                    with dataset.lock:
                        clip = next((c for c in dataset.data["clips"] if c["id"] == clip_id), None)
                        if clip is None:
                            self.reply(404, {"error": "录音不存在。"})
                        else:
                            self.reply(200, dataset.clip_path(clip).read_bytes(), "audio/wav")
                elif path == "/favicon.ico":
                    self.reply(204, b"", "image/x-icon")
                else:
                    self.reply(404, {"error": "页面不存在。"})
            except (OSError, ValueError) as error:
                self.reply(500, {"error": f"读取录音失败：{error}"})

        def do_POST(self):
            if not self.allowed(mutation=True):
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= MAX_BYTES:
                    raise ValueError("录音过大或内容为空。")
                raw = self.rfile.read(size)
                if len(raw) != size:
                    raise ValueError("上传未完成，请重试。")
                url = urlparse(self.path)
                if url.path == "/api/config":
                    dataset.configure(json.loads(raw))
                    self.reply(200, {"ok": True})
                elif url.path == "/api/clips":
                    query = parse_qs(url.query)
                    clip = dataset.add(query.get("category", [""])[0], query.get("phrase", [""])[0],
                                       self.headers.get("X-Clip-Id", ""), raw)
                    self.reply(201, clip)
                else:
                    self.reply(404, {"error": "接口不存在。"})
            except (ValueError, KeyError, UnicodeError) as error:
                self.reply(400, {"error": str(error)})
            except OSError as error:
                self.reply(500, {"error": f"保存失败，录音仍在浏览器待保存区：{error}"})

        def do_DELETE(self):
            if not self.allowed(mutation=True):
                return
            path = urlparse(self.path).path
            if not path.startswith("/api/clips/"):
                self.reply(404, {"error": "接口不存在。"})
                return
            try:
                dataset.remove(path.removeprefix("/api/clips/"))
                self.reply(200, {"ok": True})
            except ValueError as error:
                self.reply(400, {"error": str(error)})
            except OSError as error:
                self.reply(500, {"error": f"移除失败：{error}"})

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.daemon_threads = True
    return server


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--data-dir", type=Path, default=ROOT / ".runtime" / "kws-recordings")
    args = parser.parse_args()
    server = make_server(args.data_dir, args.port)
    print(f"KWS recorder: http://127.0.0.1:{server.server_port}\nRecordings: {args.data_dir.resolve()}\nNo GPU / no training", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
