import io
import csv
import json
import math
from pathlib import Path
import struct
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import uuid
import wave
import zipfile

from serve_collector import DEFAULT_PHRASES, Dataset, inspect_wav, make_server


def wav(seconds=1, rate=16000, amplitude=4000):
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(rate)
        audio.writeframes(b"".join(struct.pack("<h", int(amplitude * math.sin(i * 2 * math.pi * 320 / rate))) for i in range(int(rate * seconds))))
    return output.getvalue()


class CollectorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = Dataset(Path(self.temp.name))

    def tearDown(self):
        self.temp.cleanup()

    def test_format_and_silence(self):
        self.assertEqual(inspect_wav(wav())["sampleRate"], 16000)
        for invalid in (wav(.3), wav(9), wav(rate=48000), wav(amplitude=0), b"bad wav", wav()[:-200]):
            with self.assertRaises(ValueError):
                inspect_wav(invalid)

    def test_labels_durability_retry_export_and_remove(self):
        clip_id = uuid.uuid4().hex
        clip = self.store.add("wake", "你好助手", clip_id, wav())
        self.assertEqual(self.store.add("wake", "你好助手", clip_id, wav()), clip)
        self.assertEqual(len(self.store.data["clips"]), 1)
        with self.assertRaises(ValueError):
            self.store.configure({"wake": "助教你好", "end": "非常感谢"})
        with self.assertRaises(ValueError):
            self.store.add("end", "非常感谢", clip_id, wav())
        with self.assertRaises(ValueError):
            self.store.add("wake", "错误标签", uuid.uuid4().hex, wav())
        self.store.configure({"wake": "你好助手", "end": "谢谢助教"})
        reopened = Dataset(Path(self.temp.name))
        self.assertEqual(reopened.data["clips"], [clip])
        with zipfile.ZipFile(io.BytesIO(reopened.export())) as bundle:
            self.assertEqual(bundle.read(clip["file"]), wav())
            self.assertEqual(json.loads(bundle.read("recordings.jsonl"))["text"], "你好助手")
        reopened.remove(clip_id)
        self.assertFalse(Dataset(Path(self.temp.name)).data["clips"])
        self.assertTrue((Path(self.temp.name) / "discarded" / f"{clip_id}.wav").is_file())
        with zipfile.ZipFile(io.BytesIO(reopened.export())) as bundle:
            self.assertFalse(any(name.endswith(".wav") for name in bundle.namelist()))

    def test_goal_and_path_validation(self):
        for _ in range(20):
            self.store.add("wake", "你好助手", uuid.uuid4().hex, wav())
        with self.assertRaises(ValueError):
            self.store.add("wake", "你好助手", uuid.uuid4().hex, wav())
        with self.assertRaises(ValueError):
            self.store.add("end", "非常感谢", "../../outside", wav())
        with self.assertRaises(ValueError):
            self.store.clip_path({"file": "../outside.wav"})

    def test_legacy_collection_upgrade_preserves_every_take_and_custom_label(self):
        self.store.configure({"wake": "助教你好", "end": "非常感谢"})
        audio = wav()
        for group in ("wake", "end"):
            for _ in range(20):
                self.store.add(group, self.store.data["phrases"][group], uuid.uuid4().hex, audio)
        legacy = {**self.store.data, "phrases": {"wake": "助教你好", "end": "非常感谢"}}
        self.store.manifest.write_text(json.dumps(legacy, ensure_ascii=False), encoding="utf-8")
        reopened = Dataset(Path(self.temp.name))
        for key in ("id", "createdAt", "target", "clips"):
            self.assertEqual(reopened.data[key], legacy[key])
        self.assertEqual(reopened.data["phrases"], {**DEFAULT_PHRASES, **legacy["phrases"]})
        self.assertTrue(all(reopened.clip_path(clip).read_bytes() == audio for clip in legacy["clips"]))
        persisted = reopened.manifest.read_bytes()
        Dataset(Path(self.temp.name))
        self.assertEqual(reopened.manifest.read_bytes(), persisted)
        reopened.configure(legacy["phrases"])
        self.assertEqual(set(reopened.data["phrases"]), set(DEFAULT_PHRASES))

    def test_new_groups_have_independent_labels_and_complete_exports(self):
        audio = wav()
        for group, phrase in DEFAULT_PHRASES.items():
            self.store.add(group, phrase, uuid.uuid4().hex, audio)
        for group in ("wake_xiaomai", "end_thanks"):
            with self.assertRaises(ValueError):
                self.store.configure({**DEFAULT_PHRASES, group: "错误标签"})
            with self.assertRaises(ValueError):
                self.store.add(group, "错误标签", uuid.uuid4().hex, audio)
        reopened = Dataset(Path(self.temp.name))
        with zipfile.ZipFile(io.BytesIO(reopened.export())) as bundle:
            manifest = json.loads(bundle.read("dataset.json"))
            rows = [json.loads(row) for row in bundle.read("recordings.jsonl").decode("utf-8").splitlines()]
            csv_rows = list(csv.DictReader(io.StringIO(bundle.read("metadata.csv").decode("utf-8-sig"))))
            self.assertEqual(manifest["phrases"], DEFAULT_PHRASES)
            for index in (manifest["clips"], rows, csv_rows):
                self.assertEqual({row["category"]: row["text"] for row in index}, DEFAULT_PHRASES)
            for clip in manifest["clips"]:
                self.assertEqual(bundle.read(clip["file"]), audio)

    def test_http_origin_token_and_persistence(self):
        server = make_server(Path(self.temp.name), 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{server.server_port}"
        try:
            with urlopen(origin + "/api/state") as response:
                state = json.load(response)
            body = json.dumps({"wake": "你好助教", "end": "非常感谢"}).encode()
            for headers in ({}, {"X-Collector-Token": state["token"], "Origin": "https://outside.example"},
                            {"X-Collector-Token": state["token"], "Host": "outside.example"}):
                with self.assertRaises(HTTPError) as caught:
                    urlopen(Request(origin + "/api/config", body, headers, method="POST"))
                self.assertEqual(caught.exception.code, 403)
            with urlopen(Request(origin + "/api/config", body, {"X-Collector-Token": state["token"], "Origin": origin}, method="POST")) as response:
                self.assertEqual(response.status, 200)
            with self.assertRaises(HTTPError) as caught:
                urlopen(origin + "/../dataset.json")
            self.assertEqual(caught.exception.code, 404)
            self.assertEqual(Dataset(Path(self.temp.name)).data["phrases"]["wake"], "你好助教")
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
