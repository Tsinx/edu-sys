"""CPU streaming regression for unchanged website model and exported candidates."""
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''
from personalize_train import PROJECT, read_audio, augment, save_json, sha, PHRASES
import argparse
import json
from pathlib import Path
import re
import time
import numpy as np
import torch
import sherpa_onnx

def keyword_files(output):
    worker = (PROJECT / 'apps/teacher-web/public/audio/classroom-keywords.js').read_text()
    result = {}
    for phase, variable in (('wake','wakeWords'), ('end','endWords'), ('cancel','cancelWords')):
        body = re.search(r'const ' + variable + r' = \[(.*?)\];', worker, re.S).group(1)
        lines = re.findall(r"'([^']+)'", body)
        assert lines
        path = output / (phase + '-keywords.txt')
        path.write_text('\n'.join(lines) + '\n')
        result[phase] = path
    return result

def spotters(model_dir, keyword_paths, quantized=False):
    return {phase:sherpa_onnx.KeywordSpotter(
        tokens=str(model_dir/'tokens.txt'),
        encoder=str(model_dir/('encoder.int8.onnx' if quantized else 'encoder.onnx')),
        decoder=str(model_dir/'decoder.onnx'),
        joiner=str(model_dir/('joiner.int8.onnx' if quantized else 'joiner.onnx')),
        keywords_file=str(path), num_threads=2, max_active_paths=8,
        keywords_score=1.5, keywords_threshold=.25, num_trailing_blanks=1, provider='cpu')
        for phase,path in keyword_paths.items()}

def detect_all(spots, audio):
    audio = np.pad(audio, (16000, 16000)).astype(np.float32)
    hits = {}
    for phase, kws in spots.items():
        stream = kws.create_stream()
        found = []
        for start in range(0, len(audio), 2048):
            stream.accept_waveform(16000, audio[start:start+2048])
            while kws.is_ready(stream):
                kws.decode_stream(stream)
                result = kws.get_result(stream)
                if result:
                    found.append(dict(phrase=result, receivedAtSeconds=(start+2048)/16000-1))
                    kws.reset_stream(stream)
        if found:
            hits[phase] = found
    return hits

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', type=Path, required=True)
    args = parser.parse_args()
    run = args.run
    assert json.loads((run/'status.json').read_text())['state'] == 'complete'
    records = json.loads((run/'split-manifest.json').read_text())
    keys = keyword_files(run)
    cases = []
    for record in records:
        if record['split'] not in ('validation','test'):
            continue
        audio = read_audio(record['path'])
        if record['kind'] == 'personal':
            variants = {'clean':audio, 'original':read_audio(record['originalPath']),
                        'mild_stress':augment(audio, np.random.default_rng(int(record['sourceGroup'][:8],16)), strong=True)}
            for variant,wave in variants.items():
                cases.append(dict(id=record['id'], split=record['split'], variant=variant, kind='personal',
                                  expected=record['category'], audio=wave))
        else:
            cases.append(dict(id=record['id'], split=record['split'], variant='clean', kind=record['kind'], expected=None, audio=audio))
    expectations = {'negative':None, 'thanksNegative':None, 'wakeCommonNegative':None,
                    'wake':'wake', 'finish':'end', 'cancel':'cancel', 'wakeLittleAssistant':'wake'}
    for name, expected in expectations.items():
        cases.append(dict(id='tts_'+name, split='replay_regression', variant='clean', kind='synthetic_replay', expected=expected,
                          audio=read_audio(PROJECT/'.runtime/kws'/f'{name}.wav')))
    rng = np.random.default_rng(109)
    for amplitude in (0., .001, .005):
        cases.append(dict(id=f'noise_{amplitude}', split='synthetic_probe', variant='clean', kind='synthetic_noise', expected=None,
                          audio=rng.normal(0,amplitude,16000*30).astype(np.float32)))
    models = {'website_current':(PROJECT/'apps/teacher-web/public/vendor/local-kws',False),
              'baseline_fp32':(run/'export-baseline',False), 'candidate_fp32':(run/'export-candidate',False),
              'candidate_int8':(run/'export-candidate',True)}
    reports = {}
    for name,(directory,quantized) in models.items():
        print('Streaming audit:', name, flush=True)
        started = time.monotonic()
        spots = spotters(directory, keys, quantized)
        rows = []
        for case in cases:
            hits = detect_all(spots, case['audio'])
            row = {k:v for k,v in case.items() if k != 'audio'}
            row.update(hits=hits, seconds=len(case['audio'])/16000)
            if case['expected']:
                row['correct'] = case['expected'] in hits
                row['otherPhaseHit'] = any(phase != case['expected'] for phase in hits)
            rows.append(row)
        personal = [r for r in rows if r['kind']=='personal']
        summary = {}
        for split in ('validation','test'):
            summary[split] = {variant:dict(correct=sum(r['correct'] for r in personal if r['split']==split and r['variant']==variant),
                                                 total=sum(r['split']==split and r['variant']==variant for r in personal),
                                                 otherPhaseHits=sum(r['otherPhaseHit'] for r in personal if r['split']==split and r['variant']==variant))
                              for variant in ('clean','original','mild_stress')}
        for kind in ('public_speech_probe','synthetic_replay','synthetic_noise'):
            selected = [r for r in rows if r['kind']==kind and r['expected'] is None]
            summary[kind] = dict(clips=len(selected), seconds=sum(r['seconds'] for r in selected),
                                 clipsWithTriggers=sum(bool(r['hits']) for r in selected))
        summary['replayCommandHits'] = sum(r.get('correct',False) for r in rows if r['kind']=='synthetic_replay' and r['expected'])
        summary['elapsedSeconds'] = round(time.monotonic()-started,2)
        reports[name] = dict(summary=summary, rows=rows)
        save_json(run/'streaming-audit.json', reports)
        print(name, json.dumps(summary), flush=True)
    base = torch.load(run/'baseline.pt', map_location='cpu', weights_only=True)['model']
    candidate = torch.load(run/'best.pt', map_location='cpu', weights_only=True)['model']
    config = json.loads((run/'config.json').read_text())
    allowed = set(config['trainableNames'])
    changed = [k for k in base if not torch.equal(base[k],candidate[k])]
    assert changed and all(k in allowed for k in changed), 'Frozen weights changed or training did not update weights'
    save_json(run/'weight-audit.json', dict(passed=True, changedTensors=changed, frozenTensorsUnchanged=True,
                                           baselineSha256=sha(run/'baseline.pt'), candidateSha256=sha(run/'best.pt')))
    print('STREAMING_AND_WEIGHT_AUDIT_COMPLETE', flush=True)

if __name__ == '__main__':
    main()
