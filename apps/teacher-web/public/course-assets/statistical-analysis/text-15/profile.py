"""One-time source inventory; raw CSV files remain byte-for-byte unchanged."""
from pathlib import Path
import hashlib, json
import pandas as pd

ROOT = Path(__file__).resolve().parent
expected = {'train': '8f0cc5500a37a0552e9fb45b1539d2fca7cd8752', 'dev': '0d2d15dd3452d109bcc526da22ec05bc46e4832f', 'test': '5c02ff90be63f5e8b09b0c9e492a4ea6b72d60c0'}
frames, inventory = [], {}
for split, blob in expected.items():
    path = ROOT / 'data/raw' / (split + '.csv')
    raw = path.read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    assert actual == blob, (split, actual)
    frame = pd.read_csv(path)
    assert frame.notna().all().all()
    assert frame['id'].is_unique
    assert frame.star.between(1, 5).all()
    assert frame.iloc[:, 3:].isin([-2, -1, 0, 1]).all().all()
    inventory[split] = {'rows': len(frame), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(), 'git_blob': actual}
    frames.append(frame.assign(split=split))
df = pd.concat(frames, ignore_index=True)
inventory['combined'] = {'rows': len(df), 'columns': len(df.columns)-1, 'unique_ids': int(df['id'].nunique()), 'duplicate_texts': int(df.review.duplicated().sum()), 'missing_cells': int(df.isna().sum().sum()), 'stars': {str(k): int(v) for k,v in df.star.value_counts().sort_index().items()}}
(ROOT / 'source-manifest.json').write_text(json.dumps({'repository': 'https://github.com/Meituan-Dianping/asap', 'commit': '975122a60065240124df62cb4d5dbfd19ed9ef2c', 'paper': 'https://aclanthology.org/2021.naacl-main.167/', 'license': 'Apache-2.0 (repository LICENSE)', 'files': inventory}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps(inventory, ensure_ascii=False, indent=2))
print(df.iloc[0,:9].to_string())
