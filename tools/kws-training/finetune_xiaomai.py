"""Four-phrase, source-grouped adaptation; never changes deployed assets.

Run in the pinned Edu-KWS WSL environment. Whole-utterance RNNT labels only.
The test split is evaluated after checkpoint selection and never ranks epochs.
"""
from personalize_common import PRETRAINED, MODEL_ARGS, load_model, token_ids, feature_extractor
from personalize_train import (read_audio, augment, batch_features, rnnt, save_json, sha,
                               ContextGraph, keywords_search)
import argparse
import copy
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import random
import shutil
import time

import numpy as np
import torch

PROJECT = Path('/mnt/d/codes/edu-sys')
PHRASES = {'wake': '你好助手', 'end': '非常感谢', 'wake_xiaomai': '小麦老师', 'end_thanks': '谢谢'}
SETTINGS = {'wake': (1.8, .12), 'wake_xiaomai': (1.8, .12), 'end': (2., .2), 'end_thanks': (1.5, .3)}
GROUPS = {'projection': ('joiner.encoder_proj.', 3e-5, .02),
          'last_encoder': ('encoder.encoders.5.', 8e-6, .01)}


def prepare(source, previous, run, seed):
    data = json.loads((source / 'dataset.json').read_text())
    assert data['phrases'] == PHRASES
    previous_records = json.loads((previous / 'split-manifest.json').read_text())
    old = {r['sourceGroup']: r for r in previous_records if r['kind'] == 'personal'}
    rng = random.Random(seed)
    records = []
    for category, phrase in PHRASES.items():
        clips = sorted((c for c in data['clips'] if c['category'] == category), key=lambda c: c['stableName'])
        assert len(clips) == 20
        rng.shuffle(clips)
        for i, clip in enumerate(clips):
            group = clip['sourceSha256']
            split = 'train' if i < 14 else 'validation' if i < 17 else 'test'
            if category in ('wake', 'end'):
                assert group in old, 'Old recordings must retain the previous train/validation/test boundary'
                split = old[group]['split']
            name = clip['stableName']
            assert clip['text'] == phrase
            files = {'path': (source / clip['file'], run / 'audio/personal' / (name + '.wav'), clip['sha256']),
                     'originalPath': (source / 'originals' / (name + '.wav'), run / 'audio/original' / (name + '.wav'), group)}
            entry = dict(id=name, clipId=clip['id'], category=category, text=phrase, tokens=token_ids(phrase),
                         split=split, sourceGroup=group, kind='personal', sha256=clip['sha256'])
            for key, (src, dst, expected) in files.items():
                assert sha(src) == expected, str(src)
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                assert sha(dst) == expected
                entry[key] = str(dst)
            records.append(entry)
    assert len({r['sourceGroup'] for r in records}) == 80
    # Reuse the previous run's immutable replay copies and their matching labels.
    # .runtime/kws has since been regenerated with different text under some names.
    for old_record in previous_records:
        if old_record['kind'] == 'personal':
            continue
        record = copy.deepcopy(old_record)
        src = Path(record['path'])
        assert sha(src) == record['sha256']
        dst = run / 'audio' / ('replay' if record['kind'] == 'synthetic_replay' else 'public') / src.name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        record['path'] = str(dst)
        records.append(record)
    groups = {}
    for record in records:
        groups.setdefault(record['sourceGroup'], set()).add(record['split'])
    assert all(len(splits) == 1 for splits in groups.values()), 'Source leakage'
    counts = {category: {split: sum(r['kind'] == 'personal' and r['category'] == category and r['split'] == split
                                  for r in records) for split in ('train', 'validation', 'test')} for category in PHRASES}
    assert all(c == {'train': 14, 'validation': 3, 'test': 3} for c in counts.values())
    replacement = next(r for r in records if r['id'] == 'end_thanks_12')
    assert replacement['clipId'] == '3a562c19b7de4d42a7166b391c528adf'
    save_json(run / 'split-manifest.json', records)
    save_json(run / 'split-audit.json', dict(passed=True, counts=counts, personalSourceGroups=80,
              oldBoundariesPreserved=40, retakenThanks12=replacement, augmentationAfterSplit=True,
              sourceManifestSha256=sha(source / 'dataset.json'), previousManifestSha256=sha(previous / 'split-manifest.json'),
              limitation='One speaker; within-session holdout. Old test recordings were evaluated in a historical run.'))
    return records


def make_graphs():
    graphs = {}
    for category, (score, threshold) in SETTINGS.items():
        graph = ContextGraph(context_score=score, ac_threshold=threshold)
        graph.build(token_ids=[token_ids(PHRASES[category])], phrases=[category])
        graphs[category] = graph
    return graphs


@torch.no_grad()
def detect(model, wave, extractor, graphs):
    x, lengths = batch_features([np.pad(wave, (16000, 16000))], extractor)
    encoded, encoded_lengths = model.forward_encoder(x, lengths)
    return [category for category, graph in graphs.items()
            if keywords_search(model, encoded, encoded_lengths, graph, beam=8, num_tailing_blanks=1)[0]]


@torch.no_grad()
def evaluate(model, records, extractor, graphs, split):
    rows, losses = [], []
    for record in records:
        if record['split'] != split:
            continue
        wave = read_audio(record['path'])
        common = {k: record[k] for k in ('id', 'kind', 'split')}
        if record['kind'] == 'personal':
            x, lengths = batch_features([wave], extractor)
            loss, _ = rnnt(model, x, lengths, [record['tokens']])
            losses.append(float(loss))
            variants = {'clean': wave, 'original': read_audio(record['originalPath']),
                        'mild_stress': augment(wave, np.random.default_rng(int(record['sourceGroup'][:8], 16)), strong=True)}
            for variant, audio in variants.items():
                hits = detect(model, audio, extractor, graphs)
                rows.append(dict(**common, category=record['category'], variant=variant, hits=hits,
                                 correct=record['category'] in hits, wrong=any(h != record['category'] for h in hits)))
        else:
            rows.append(dict(**common, hits=detect(model, wave, extractor, graphs), seconds=len(wave) / 16000))
    personal = [r for r in rows if r['kind'] == 'personal']
    public = [r for r in rows if r['kind'] == 'public_speech_probe']
    return dict(rows=rows, correct=sum(r['correct'] for r in personal), total=len(personal),
                wrong=sum(r['wrong'] for r in personal), rnntLoss=float(np.mean(losses)),
                perCategory={c: sum(r['correct'] for r in personal if r['category'] == c) for c in PHRASES},
                byVariant={v: sum(r['correct'] for r in personal if r['variant'] == v) for v in ('clean', 'original', 'mild_stress')},
                publicProbeTriggers=sum(bool(r['hits']) for r in public), publicProbeSeconds=sum(r['seconds'] for r in public))


def compact(result):
    return {k: v for k, v in result.items() if k != 'rows'}


def admissible(result, baseline):
    return (result['wrong'] <= baseline['wrong'] and result['publicProbeTriggers'] <= baseline['publicProbeTriggers']
            and all(result['perCategory'][c] >= baseline['perCategory'][c] for c in ('wake', 'end')))


def rank(result):
    return (result['correct'] - 3 * result['wrong'] - 3 * result['publicProbeTriggers'], -result['rnntLoss'])


@torch.no_grad()
def constrain(groups, anchors):
    result = {}
    for group in groups:
        named = group['named']
        anchor_norm = torch.sqrt(sum(anchors[n].square().sum() for n, _ in named))
        delta_norm = torch.sqrt(sum((p - anchors[n]).square().sum() for n, p in named))
        limit = group['relativeCap'] * max(float(anchor_norm), 1e-8)
        projected = float(delta_norm) > limit
        if projected:
            for n, p in named:
                p.copy_(anchors[n] + (p - anchors[n]) * (limit / float(delta_norm)))
        result[group['name']] = dict(relativeL2=min(float(delta_norm), limit) / max(float(anchor_norm), 1e-8),
                                     cap=group['relativeCap'], projected=projected)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--source', type=Path, default=PROJECT / 'output/kws-audio-focus-20260909')
    parser.add_argument('--previous-run', type=Path, default=Path('/home/edu/projects/edu-kws/runs/personal-20260909-01'))
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--seed', type=int, default=20260910)
    args = parser.parse_args()
    run = args.run.resolve()
    if (run / 'config.json').exists():
        raise RuntimeError('Run already exists; refusing to overwrite')
    run.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    np.random.seed(args.seed)
    rng = np.random.default_rng(args.seed)
    assert torch.cuda.is_available()
    torch.cuda.set_per_process_memory_fraction(.65)
    records = prepare(args.source, args.previous_run, run, args.seed)
    teacher = load_model(device='cuda').requires_grad_(False)
    model = copy.deepcopy(teacher)
    model.requires_grad_(False)
    named = dict(model.named_parameters())
    grouped = [dict(name=name, named=[(n, p) for n, p in named.items() if n.startswith(prefix)],
                    baseLr=lr, relativeCap=cap) for name, (prefix, lr, cap) in GROUPS.items()]
    anchors = {n: p.detach().clone() for group in grouped for n, p in group['named']}
    for _, p in grouped[0]['named']:
        p.requires_grad_(True)
    optimizer = torch.optim.AdamW([dict(params=[p for _, p in g['named']], lr=g['baseLr'], name=g['name']) for g in grouped], weight_decay=1e-4)
    config = dict(startedAt=datetime.now(timezone.utc).isoformat(), seed=args.seed, maxEpochs=args.epochs,
        source=str(args.source), sourceSha256=sha(args.source / 'dataset.json'), modelArgs=MODEL_ARGS,
        pretrainedSha256=sha(PRETRAINED / 'exp/pretrained.pt'), scriptSha256=sha(Path(__file__)),
        phrases=PHRASES, keywordSettings=SETTINGS, gpu=torch.cuda.get_device_name(), precision='float32',
        method='Head-first partial fine-tuning with validation-gated last-encoder unfreezing; not LoRA',
        totalParameters=sum(p.numel() for p in model.parameters()),
        groups={g['name']: dict(parameters=sum(p.numel() for _, p in g['named']), initialLr=g['baseLr'], relativeL2Cap=g['relativeCap']) for g in grouped},
        allowedTrainableNames=list(anchors), initialTrainableNames=[n for n, _ in grouped[0]['named']],
        unfreezeGate='After 4 head-only epochs: admissible validation recall improvement, or >=5% RNNT loss reduction without recall decrease.',
        batchSize=5, stepsPerEpoch=14, replayFraction=.2, balancedPersonalCategories=True, patience=5,
        lrSchedule='10-update warmup then cosine decay to 1/6 base; separate 10-update encoder warmup after unfreezing',
        weightDecay=1e-4, l2StartingPointPenaltyWeight=1., replayKLWeight=.5, gradientNormClip=1.,
        trainAudio='70% processed / 30% original; all variants confined to source split',
        augmentation='sample-clock speed/pitch 0.95-1.05; gain -9..+3 dB; white noise SNR 22..35 dB; occasional mild single reflection; silence padding; narrow frequency mask; no time masking',
        caveats=['No measured classroom noise or room impulse responses available; synthetic augmentation is not real classroom noise.',
                 'Single-speaker within-session holdout. Old held-out recordings were used in historical model evaluation.',
                 'Three deterministic variants per recording are correlated, not independent new recordings.',
                 'Public probes lack human-verified transcripts; a keyword hit is not automatically a false alarm.',
                 'Acoustic thanks inside thanks-everyone must be tested through browser VAD before counting an unwanted exit.',
                 'Full-utterance PyTorch validation does not replace ONNX streaming / actual browser verification.'],
        deployment='Separate experimental candidate only; deployed models are unchanged')
    save_json(run / 'config.json', config)
    save_json(run / 'status.json', dict(state='baseline_validation', startedAt=config['startedAt']))
    print('CONFIG', json.dumps({k: config[k] for k in ('gpu', 'groups', 'totalParameters')}, ensure_ascii=False), flush=True)
    extractor, graphs = feature_extractor(), make_graphs()
    baseline = evaluate(teacher, records, extractor, graphs, 'validation')
    save_json(run / 'baseline-validation.json', baseline)
    save_json(run / 'best-validation.json', baseline)
    print('BASELINE_VALIDATION', json.dumps(compact(baseline)), flush=True)
    def checkpoint(path, epoch):
        torch.save(dict(model={k: v.detach().cpu() for k, v in model.state_dict().items()}, epoch=epoch), path)
    checkpoint(run / 'baseline.pt', 0)
    checkpoint(run / 'best.pt', 0)
    by_category = {c: [r for r in records if r['kind'] == 'personal' and r['split'] == 'train' and r['category'] == c] for c in PHRASES}
    replay = [r for r in records if r['kind'] == 'synthetic_replay']
    waves = {(r['id'], variant): read_audio(r[key]) for r in records if r['split'] == 'train'
             for variant, key in [('clean', 'path')] + ([('original', 'originalPath')] if r['kind'] == 'personal' else [])}
    best, best_epoch, stale = baseline, 0, 0
    encoder_active, encoder_steps = False, 0
    history = []
    started = time.monotonic()
    for epoch in range(1, args.epochs + 1):
        model.eval()  # Keep pretrained dropout/balancer schedules disabled for tiny data.
        orders = {c: rng.permutation(14) for c in PHRASES}
        losses, kls, penalties, gradients = [], [], [], []
        for step in range(14):
            chosen = [by_category[c][orders[c][step]] for c in PHRASES] + [replay[((epoch - 1) * 14 + step) % len(replay)]]
            audio = [augment(waves[(r['id'], 'original' if r['kind'] == 'personal' and rng.random() < .3 else 'clean')], rng) for r in chosen]
            x, lengths = batch_features(audio, extractor, rng)
            global_step = (epoch - 1) * 14 + step
            factor = (1 / 6 + 5 / 6 * (1 + math.cos(math.pi * global_step / (args.epochs * 14))) / 2)
            for group, spec in zip(optimizer.param_groups, grouped):
                warm = min(1., (global_step + 1) / 10) if spec['name'] == 'projection' else (min(1., (encoder_steps + 1) / 10) if encoder_active else 0.)
                group['lr'] = spec['baseLr'] * factor * warm
            optimizer.zero_grad(set_to_none=True)
            loss, kl = rnnt(model, x, lengths, [r['tokens'] for r in chosen], teacher)
            anchor = sum((p - anchors[n]).square().sum() for n, p in named.items() if p.requires_grad)
            objective = loss + .5 * kl + anchor
            assert torch.isfinite(objective), 'Non-finite objective'
            objective.backward()
            gradient = torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad], 1., error_if_nonfinite=True)
            optimizer.step()
            drift = constrain(grouped, anchors)
            if encoder_active:
                encoder_steps += 1
            losses.append(float(loss.detach())); kls.append(float(kl.detach()))
            penalties.append(float(anchor.detach())); gradients.append(float(gradient))
            if global_step == 0:
                print('FIRST_GPU_UPDATE_COMPLETE', json.dumps(dict(loss=losses[-1], gradientNorm=gradients[-1], allocatedMiB=torch.cuda.memory_allocated()/2**20)), flush=True)
        validation = evaluate(model, records, extractor, graphs, 'validation')
        allowed = admissible(validation, baseline)
        if allowed and rank(validation) > rank(best):
            best, best_epoch, stale = validation, epoch, 0
            checkpoint(run / 'best.pt', epoch)
            save_json(run / 'best-validation.json', validation)
        else:
            stale += 1
        checkpoint(run / 'last.pt', epoch)
        row = dict(epoch=epoch, stage='projection_and_last_encoder' if encoder_active else 'projection_only',
                   trainLoss=float(np.mean(losses)), replayKL=float(np.mean(kls)), l2StartingPoint=float(np.mean(penalties)),
                   maxGradientNorm=max(gradients), lrs={g['name']: g['lr'] for g in optimizer.param_groups}, drift=drift,
                   validation=compact(validation), admissible=allowed, bestEpoch=best_epoch,
                   seconds=round(time.monotonic() - started, 1), maxGpuAllocatedMiB=round(torch.cuda.max_memory_allocated()/2**20))
        history.append(row)
        with (run / 'history.jsonl').open('a') as f:
            f.write(json.dumps(row) + '\n')
        save_json(run / f'validation/epoch-{epoch:02}.json', validation)
        save_json(run / 'status.json', dict(state='training', **row))
        print('EPOCH', json.dumps(row), flush=True)
        if epoch == 4:
            gain = (best['correct'] > baseline['correct'] or
                    (best['correct'] >= baseline['correct'] and best['rnntLoss'] <= baseline['rnntLoss'] * .95))
            if best_epoch > 0 and admissible(best, baseline) and gain:
                selected = torch.load(run / 'best.pt', map_location='cpu', weights_only=True)
                model.load_state_dict(selected['model'])
                optimizer.state.clear()  # A rewind must not retain moments from later rejected weights.
                for _, p in grouped[1]['named']:
                    p.requires_grad_(True)
                encoder_active, stale = True, 0
                print('VALIDATION_GATE_PASSED: unfreezing last encoder at lower learning rate', flush=True)
            save_json(run / 'unfreeze-gate.json', dict(epoch=4, passed=encoder_active, baseline=compact(baseline), best=compact(best), bestEpoch=best_epoch))
        if stale >= 5:
            print('EARLY_STOP: five epochs without admissible improvement', flush=True)
            break
    model.load_state_dict(torch.load(run / 'best.pt', map_location='cpu', weights_only=True)['model'])
    base_state = teacher.state_dict()
    changed = [n for n, value in model.state_dict().items() if not torch.equal(value, base_state[n])]
    assert all(n in anchors for n in changed), 'Frozen state changed'
    save_json(run / 'weight-audit.json', dict(passed=True, frozenTensorsUnchanged=True, changedTensors=changed,
              changedTensorCount=len(changed), drift=constrain(grouped, anchors), trainedCandidate=bool(changed),
              baselineSha256=sha(run / 'baseline.pt'), candidateSha256=sha(run / 'best.pt')))
    save_json(run / 'selection.json', dict(bestEpoch=best_epoch, bestValidation=compact(best), selectionCompleteBeforeTest=True))
    print('MODEL_SELECTION_COMPLETE; now opening the reserved test split', flush=True)
    for name, tested in [('baseline', teacher), ('candidate', model)]:
        result = evaluate(tested, records, extractor, graphs, 'test')
        save_json(run / (name + '-test.json'), result)
        print(name.upper() + '_TEST', json.dumps(compact(result)), flush=True)
    previous = load_model(args.previous_run / 'best.pt', device='cuda').requires_grad_(False)
    old_result = evaluate(previous, records, extractor, graphs, 'test')
    save_json(run / 'previous-personal-test.json', old_result)
    save_json(run / 'status.json', dict(state='complete', bestEpoch=best_epoch, completedEpochs=len(history),
              steps=len(history)*14, seconds=round(time.monotonic()-started, 1), encoderUnfrozen=encoder_active,
              candidate=str(run / 'best.pt'), trainedCandidateSelected=best_epoch > 0, maxGpuAllocatedMiB=round(torch.cuda.max_memory_allocated()/2**20)))
    print('TRAINING_COMPLETE', (run / 'status.json').read_text(), flush=True)


if __name__ == '__main__':
    main()
