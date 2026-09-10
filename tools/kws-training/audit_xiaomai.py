"""Exported-model CPU streaming checks and source-labelled browser fixtures."""
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''
from finetune_xiaomai import PROJECT, PHRASES, SETTINGS
from personalize_train import read_audio, augment, save_json, sha
from personalize_common import TOKENS, token_ids
import argparse
import json
from pathlib import Path
import time

import numpy as np
import soundfile as sf
import sherpa_onnx


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--models', default='original,previous_personal,candidate_fp32,candidate_int8')
    parser.add_argument('--candidate-dir', type=Path)
    args = parser.parse_args()
    run, output = args.run, args.output
    assert json.loads((run / 'status.json').read_text())['state'] == 'complete'
    records = json.loads((run / 'split-manifest.json').read_text())
    fixture_root = output / 'browser-fixtures'
    fixture_root.mkdir(parents=True, exist_ok=True)
    cases = []
    def add(record, variant, wave, category=None):
        name = record['id'] + '-' + variant + '.wav'
        sf.write(fixture_root / name, wave, 16000, subtype='PCM_16')
        cases.append(dict(id=record['id'], split=record['split'], kind=record['kind'], variant=variant,
                          expectedCategory=category, expectedKind=('wake' if category.startswith('wake') else 'finish') if category else None,
                          file=name, sha256=sha(fixture_root / name), seconds=len(wave)/16000, audio=wave))
    for record in records:
        if record['split'] not in ('validation', 'test'):
            continue
        wave = read_audio(record['path'])
        if record['kind'] == 'personal':
            add(record, 'clean', wave, record['category'])
            add(record, 'original', read_audio(record['originalPath']), record['category'])
            add(record, 'mild_stress', augment(wave, np.random.default_rng(int(record['sourceGroup'][:8], 16)), strong=True), record['category'])
        else:
            add(record, 'clean', wave)
    rng = np.random.default_rng(109)
    for amplitude in (0., .001, .005):
        add(dict(id=f'noise_{amplitude}', kind='synthetic_noise', split='regression'), 'clean',
            rng.normal(0, amplitude, 16000*30).astype(np.float32))
    save_json(fixture_root / 'cases.json', [{k: v for k, v in c.items() if k != 'audio'} for c in cases])
    keyword_paths = {}
    for category, text in PHRASES.items():
        score, threshold = SETTINGS[category]
        path = run / (category + '-keywords.txt')
        path.write_text(' '.join(TOKENS[t] for t in token_ids(text)) + f' :{score} #{threshold} @{category}\n')
        keyword_paths[category] = path
    models = {'original': (PROJECT / 'apps/teacher-web/public/vendor/local-kws', False),
              'previous_personal': (PROJECT / 'apps/teacher-web/public/vendor/local-kws/personal-20260909', False),
              'candidate_fp32': (args.candidate_dir or run / 'export-candidate', False),
              'candidate_int8': (args.candidate_dir or run / 'export-candidate', True)}
    selected_models = args.models.split(',')
    assert selected_models and all(name in models for name in selected_models)
    models = {name: models[name] for name in selected_models}
    report = {}
    for name, (directory, quantized) in models.items():
        start = time.monotonic()
        spots = {category: sherpa_onnx.KeywordSpotter(tokens=str(directory / 'tokens.txt'),
                 encoder=str(directory / ('encoder.int8.onnx' if quantized else 'encoder.onnx')),
                 decoder=str(directory / 'decoder.onnx'), joiner=str(directory / ('joiner.int8.onnx' if quantized else 'joiner.onnx')),
                 keywords_file=str(path), num_threads=2, max_active_paths=8,
                 keywords_score=1.5, keywords_threshold=.25, num_trailing_blanks=1, provider='cpu')
                 for category, path in keyword_paths.items()}
        rows = []
        for case in cases:
            audio = np.pad(case['audio'], (16000, 48000))
            hits = []
            for category, kws in spots.items():
                stream = kws.create_stream()
                for offset in range(0, len(audio), 2048):
                    stream.accept_waveform(16000, audio[offset:offset+2048])
                    while kws.is_ready(stream):
                        kws.decode_stream(stream)
                        result = kws.get_result(stream)
                        if result:
                            hits.append(dict(category=category, keyword=result, receivedAtSeconds=(offset+2048)/16000-1))
                            kws.reset_stream(stream)
            row = {k: v for k, v in case.items() if k != 'audio'}
            row['hits'] = hits
            if case['expectedCategory']:
                row['correct'] = any(h['category'] == case['expectedCategory'] for h in hits)
                row['otherCategoryHit'] = any(h['category'] != case['expectedCategory'] for h in hits)
            rows.append(row)
        summary = {}
        for split in ('validation', 'test'):
            selected = [r for r in rows if r['split'] == split and r['kind'] == 'personal']
            summary[split] = {variant: dict(correct=sum(r['correct'] for r in selected if r['variant'] == variant),
                                total=sum(r['variant'] == variant for r in selected),
                                otherCategoryHits=sum(r['otherCategoryHit'] for r in selected if r['variant'] == variant))
                             for variant in ('clean', 'original', 'mild_stress')}
        for kind in ('public_speech_probe', 'synthetic_noise'):
            selected = [r for r in rows if r['kind'] == kind]
            summary[kind] = dict(clips=len(selected), seconds=sum(r['seconds'] for r in selected),
                                 clipsWithAcousticHits=sum(bool(r['hits']) for r in selected))
        report[name] = dict(summary=summary, rows=rows, elapsedSeconds=round(time.monotonic()-start, 2))
        save_json(output / 'native-streaming-audit.json', report)
        print('NATIVE_STREAMING', name, json.dumps(summary), flush=True)
    print('NATIVE_STREAMING_COMPLETE', flush=True)


if __name__ == '__main__':
    main()
