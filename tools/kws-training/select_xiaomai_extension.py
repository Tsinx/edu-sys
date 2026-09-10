"""Select a milestone using browser validation only, before regression replay."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = args.output
assert not (root / 'selection.json').exists(), 'Selection already recorded'
assert not (root / 'browser-selected-regression.json').exists(), 'Regression must follow selection'
read = lambda path: json.loads(Path(path).read_text(encoding='utf-8-sig'))
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
base_report = read(root / 'baseline-browser-validation.json')
base_provenance = base_report['provenance']
assert base_provenance['selectedSplit'] == 'validation' and not base_provenance['errors']


def metrics(model):
    rows = model['rows']
    assert len(rows) == 62 and all(r['split'] != 'test' for r in rows)
    personal = [r for r in rows if r['kind'] == 'personal']
    assert len(personal) == 36 and all(r['split'] == 'validation' for r in personal)
    return dict(correct=sum(r['correct'] for r in personal), total=len(personal),
        byVariant={v: sum(r['correct'] for r in personal if r['variant'] == v) for v in ('clean', 'original', 'mild_stress')},
        perCategory={c: sum(r['correct'] for r in personal if r['expectedCategory'] == c) for c in ('wake', 'end', 'wake_xiaomai', 'end_thanks')},
        controls={kind: sum(r['correct'] for r in rows if r['kind'] == kind)
                  for kind in ('synthetic_behavior_regression', 'synthetic_noise', 'public_speech_probe')})


original, epoch5 = metrics(base_report['original']), metrics(base_report['candidate'])
comparison = {'original': original, 'epoch5': epoch5}
eligible = []
for epoch in (10, 15, 20):
    report_path = root / f'browser-epoch-{epoch:02}-validation.json'
    report = read(report_path)
    provenance = report['provenance']
    assert not provenance['errors'] and provenance['selectedSplit'] == 'validation'
    for field in ('runtimeSha256', 'ttsSha256', 'fixtureManifestSha256'):
        assert provenance[field] == base_provenance[field], 'Comparison inputs changed: ' + field
    artifact = read(root / 'epochs' / f'epoch-{epoch:02}' / 'artifact.json')
    assert artifact['epoch'] == epoch and artifact['frozenTensorsUnchanged'] and artifact['relativeL2ToOriginal'] <= .02
    for name, expected in artifact['modelFiles'].items():
        assert provenance['servedModelHashes']['candidate']['/vendor/local-kws/' + name] == expected
    result = metrics(report['candidate'])
    result['rnntLoss'] = read(root / 'epochs' / f'epoch-{epoch:02}' / 'validation.json')['rnntLoss']
    # Protect each old word and the weakest condition, not merely pooled accuracy.
    old_words_ok = all(report['candidate']['summary']['validation'][v]['byCategory'][c]
                       >= base_report['original']['summary']['validation'][v]['byCategory'][c]
                       for v in ('clean', 'original', 'mild_stress') for c in ('wake', 'end'))
    controls_ok = all(result['controls'][k] >= original['controls'][k] for k in original['controls'])
    result['eligible'] = old_words_ok and controls_ok
    result['oldWordsPreserved'] = old_words_ok
    result['controlsPreserved'] = controls_ok
    comparison[f'epoch{epoch}'] = result
    if result['eligible']:
        eligible.append((result['correct'], -result['rnntLoss'], epoch))
selected_epoch = max(eligible)[2] if eligible else 20
chosen = comparison[f'epoch{selected_epoch}']
improvement = chosen['eligible'] and chosen['correct'] > max(original['correct'], epoch5['correct'])
selection = dict(recordedAt=datetime.now(timezone.utc).isoformat(), selectedEpoch=selected_epoch,
    improvedOnBrowserValidation=improvement, diagnosticOnly=not improvement,
    selectionBeforeRegression=True, noUnseenTestClaim=True, comparison=comparison,
    rule='Old-word recall and behavior/noise/probe controls must not regress; maximize browser validation successes, break ties with lower RNNT validation loss. No deployment without actual improvement.',
    fallback='If no milestone qualifies, retain epoch20 only as a diagnostic artifact',
    productionDeploymentChanged=False,
    evidenceSha256={p.name: sha(p) for p in [root / 'baseline-browser-validation.json', *[root / f'browser-epoch-{e:02}-validation.json' for e in (10,15,20)]]})
source = root / 'epochs' / f'epoch-{selected_epoch:02}'
assert not (root / 'model').exists()
shutil.copytree(source / 'model', root / 'model')
shutil.copy2(source / 'candidate.pt', root / 'candidate.pt')
artifact = read(source / 'artifact.json')
artifact.update(selectedForRegression=True, diagnosticOnly=not improvement,
                browserValidationRecallImproved=improvement, deployment='Not deployed; validation selection is recorded in selection.json')
(root / 'candidate-artifact.json').write_text(json.dumps(artifact, indent=2) + '\n')
shutil.copy2(source / 'export-report.json', root / 'export-report.json')
(root / 'selection.json').write_text(json.dumps(selection, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(selection, ensure_ascii=False), flush=True)
