"""A bounded personal Zipformer adaptation experiment, with source-level splits.

No deployment happens here. The selected checkpoint is a candidate for evaluation.
"""
from personalize_common import ROOT, PRETRAINED, MODEL_ARGS, TOKENS, TOKEN_PATH, load_model, token_ids, feature_extractor
import argparse
import copy
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import random
import shutil
import time
import urllib.request

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
import torch
import torch.nn.functional as F
import k2
from icefall import ContextGraph
from icefall.utils import add_sos
from beam_search import keywords_search, greedy_search

PROJECT = Path('/mnt/d/codes/edu-sys')
SOURCE = PROJECT / 'output/kws-audio-review-20260908'
PHRASES = {'wake': '你好助手', 'end': '非常感谢'}
FIXTURES = {
    'negative': '大家你好今天我们讲港口的作用请进入第二讲谢谢大家',
    'thanksNegative': '大家好感谢大家这个现象让人非常感慨谢谢大家',
    'wakeCommonNegative': '你好同学各位老师好小助手在哪里请助手介绍一下',
    'wake': '助教你好', 'finish': '谢谢助教', 'cancel': '助教取消',
    'wakeLittleAssistant': '你好小助手',
}
PUBLIC_REPO = 'pkufool/icefall-asr-zipformer-streaming-wenetspeech-20230615'
PUBLIC_NAMES = ['DEV_T0000000000', 'DEV_T0000000001', 'DEV_T0000000002',
                'TEST_MEETING_T0000000113', 'TEST_MEETING_T0000000219', 'TEST_MEETING_T0000000351']

def save_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def read_audio(path):
    wave, rate = sf.read(path, dtype='float32', always_2d=True)
    wave = wave.mean(axis=1)
    if rate != 16000:
        gcd = math.gcd(rate, 16000)
        wave = resample_poly(wave, 16000 // gcd, rate // gcd).astype(np.float32)
    return wave

def prepare(run, seed):
    data = json.loads((SOURCE / 'dataset.json').read_text())
    assert data['phrases'] == PHRASES
    rng = random.Random(seed)
    records = []
    for category in PHRASES:
        clips = sorted([c for c in data['clips'] if c['category'] == category], key=lambda c: c['file'])
        assert len(clips) == 20
        rng.shuffle(clips)
        for index, clip in enumerate(clips):
            split = 'train' if index < 14 else 'validation' if index < 17 else 'test'
            source = SOURCE / clip['file']
            assert sha(source) == clip['sha256']
            path = run / 'audio/personal' / source.name
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, path)
            original = SOURCE / 'originals' / source.name
            assert sha(original) == clip['sourceSha256']
            raw = run / 'audio/original' / source.name
            raw.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(original, raw)
            records.append(dict(id=source.stem, category=category, text=clip['text'],
                                tokens=token_ids(clip['text']), split=split, sourceGroup=clip['sourceSha256'],
                                path=str(path), originalPath=str(raw), kind='personal', sha256=sha(path)))
    assert len({r['sourceGroup'] for r in records}) == 40
    for name, text in FIXTURES.items():
        path = run / 'audio/replay' / (name + '.wav')
        path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PROJECT / '.runtime/kws' / path.name, path)
        records.append(dict(id='tts_' + name, text=text, tokens=token_ids(text), split='train',
                            sourceGroup=sha(path), path=str(path), kind='synthetic_replay', sha256=sha(path)))
    # Public speech is held out from gradient updates. Source transcripts are not
    # provided here: retain the baseline phonetic decode for later label review.
    for i, name in enumerate(PUBLIC_NAMES):
        path = run / 'audio/public' / (name + '.wav')
        path.parent.mkdir(parents=True, exist_ok=True)
        url = f'https://huggingface.co/{PUBLIC_REPO}/resolve/main/test_wavs/{name}.wav'
        if not path.exists():
            urllib.request.urlretrieve(url, path)
        records.append(dict(id=name, path=str(path), kind='public_speech_probe', split='validation' if i < 3 else 'test',
                            sourceGroup=sha(path), sha256=sha(path), source=url))
    save_json(run / 'split-manifest.json', records)
    return records

def augment(wave, rng, strong=False):
    # Tiny speed/pitch variation (at most 5%), not broad pitch shifts.
    speed = float(rng.uniform(.95, 1.05))
    positions = np.arange(0, len(wave), speed)
    wave = np.interp(positions, np.arange(len(wave)), wave).astype(np.float32)
    wave *= 10 ** (float(rng.uniform(-9, 3)) / 20)
    snr = float(rng.uniform(18, 32) if strong else rng.uniform(22, 35))
    if rng.random() < .7:
        rms = max(float(np.sqrt(np.mean(wave ** 2))), 1e-5)
        noise = rng.normal(0, 1, len(wave)).astype(np.float32)
        wave += noise * rms / (10 ** (snr / 20))
    if rng.random() < .25:
        # Mild single reflection; do not label this as measured classroom RIR.
        delay = int(rng.uniform(.025, .055) * 16000)
        wave[delay:] += float(rng.uniform(.04, .12)) * wave[:-delay].copy()
    wave = np.pad(wave, (int(rng.uniform(.05, .35) * 16000), int(rng.uniform(.15, .45) * 16000)))
    return np.clip(wave, -.98, .98).astype(np.float32)

def features(wave, extractor, rng=None):
    result = extractor(torch.from_numpy(wave.copy()))
    if rng is not None and rng.random() < .35:
        # Short words: one narrow frequency mask, no time masking.
        width = int(rng.integers(1, 5))
        start = int(rng.integers(0, 80 - width))
        result[:, start:start + width] = result.mean()
    return result

def batch_features(waves, extractor, rng=None):
    feats = [features(w, extractor, rng) for w in waves]
    lengths = torch.tensor([len(f) for f in feats], device='cuda', dtype=torch.int64)
    return torch.nn.utils.rnn.pad_sequence(feats, batch_first=True, padding_value=math.log(1e-10)).cuda(), lengths

def logits_for(model, x, lengths, ys):
    encoded, encoded_lengths = model.forward_encoder(x, lengths)
    sos = add_sos(ys, sos_id=0).pad(mode='constant', padding_value=0)
    decoded = model.decoder(sos)
    logits = model.joiner(encoded.unsqueeze(2), decoded.unsqueeze(1))
    return logits, encoded_lengths

def rnnt(model, x, lengths, labels, teacher=None):
    ys = k2.RaggedTensor(labels).to('cuda')
    logits, output_lengths = logits_for(model, x, lengths, ys)
    boundary = torch.zeros((len(labels), 4), dtype=torch.int64, device='cuda')
    boundary[:, 2] = torch.tensor([len(y) for y in labels], device='cuda')
    boundary[:, 3] = output_lengths
    loss = k2.rnnt_loss(logits=logits.float(), symbols=ys.pad(mode='constant', padding_value=0).long(),
                        termination_symbol=0, boundary=boundary, reduction='mean')
    regularization = torch.zeros((), device='cuda')
    if teacher is not None:
        with torch.no_grad():
            reference, _ = logits_for(teacher, x, lengths, ys)
        # Last item in every batch is ordinary speech / an existing command.
        n = len(labels) - 1
        t, u = int(output_lengths[n]), len(labels[n]) + 1
        regularization = F.kl_div(logits[n, :t, :u].log_softmax(-1),
                                  reference[n, :t, :u].softmax(-1), reduction='none').sum(-1).mean()
    return loss, regularization

def graph(category):
    g = ContextGraph(context_score=1.8 if category == 'wake' else 2., ac_threshold=.12 if category == 'wake' else .2)
    g.build(token_ids=[token_ids(PHRASES[category])], phrases=[category])
    return g

@torch.no_grad()
def detect(model, wave, extractor):
    # Match browser's warmup and trailing silence; chunk-16 causal encoder.
    wave = np.pad(wave, (16000, 16000))
    x, lengths = batch_features([wave], extractor)
    encoded, encoded_lengths = model.forward_encoder(x, lengths)
    hits = []
    for category in PHRASES:
        found = keywords_search(model, encoded, encoded_lengths, graph(category), beam=8, num_tailing_blanks=1)
        if found[0]:
            hits.append(category)
    return hits

@torch.no_grad()
def evaluate(model, records, extractor, split, stress=True):
    rows = []
    loss_values = []
    for record in records:
        if record['split'] != split:
            continue
        wave = read_audio(record['path'])
        if record['kind'] == 'personal':
            x, lengths = batch_features([wave], extractor)
            loss, _ = rnnt(model, x, lengths, [record['tokens']])
            loss_values.append(float(loss))
            variants = {'clean': wave, 'original': read_audio(record['originalPath'])}
            if stress:
                variants['mild_stress'] = augment(wave, np.random.default_rng(int(record['sourceGroup'][:8], 16)), strong=True)
            for variant, audio in variants.items():
                hits = detect(model, audio, extractor)
                rows.append(dict(id=record['id'], kind='personal', category=record['category'], variant=variant,
                                 hits=hits, correct=record['category'] in hits, wrong=any(h != record['category'] for h in hits)))
        else:
            hits = detect(model, wave, extractor)
            rows.append(dict(id=record['id'], kind=record['kind'], hits=hits, duration=len(wave) / 16000))
    positives = [r for r in rows if r['kind'] == 'personal']
    probes = [r for r in rows if r['kind'] == 'public_speech_probe']
    return dict(rows=rows, correct=sum(r['correct'] for r in positives), total=len(positives),
                wrong=sum(r['wrong'] for r in positives), publicProbeTriggers=sum(bool(r['hits']) for r in probes),
                publicProbeSeconds=sum(r['duration'] for r in probes), rnntLoss=float(np.mean(loss_values)))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--epochs', type=int, default=20)
    parser.add_argument('--seed', type=int, default=20260909)
    args = parser.parse_args()
    run = args.run.resolve()
    if (run / 'history.jsonl').exists():
        raise RuntimeError('Refusing to overwrite an existing training run')
    run.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    random.seed(args.seed)
    rng = np.random.default_rng(args.seed)
    torch.cuda.set_per_process_memory_fraction(.65, 0)
    print('Preparing source-level split and replay audio', flush=True)
    records = prepare(run, args.seed)
    teacher = load_model(device='cuda')
    teacher.requires_grad_(False)
    model = copy.deepcopy(teacher)
    # Conservative acoustic adaptation: final encoder stack plus its joiner
    # projection. Prediction network and vocabulary output remain frozen.
    prefixes = ('encoder.encoders.5.', 'joiner.encoder_proj.')
    for name, p in model.named_parameters():
        p.requires_grad_(name.startswith(prefixes))
    trainable = [(n, p) for n, p in model.named_parameters() if p.requires_grad]
    assert trainable
    anchors = {n: p.detach().clone() for n, p in trainable}
    extractor = feature_extractor()
    config = dict(startedAt=datetime.now(timezone.utc).isoformat(), method='partial fine-tuning; final encoder stack and joiner encoder projection',
                  lora=False, seed=args.seed, epochs=args.epochs, batchSize=4, stepsPerEpoch=14,
                  learningRate=3e-5, minimumLearningRate=5e-6, patience=5, replayFraction=.25,
                  replayKLWeight=.5, anchorPenaltyWeight=1., trainableParameters=sum(p.numel() for _, p in trainable),
                  totalParameters=sum(p.numel() for p in model.parameters()), trainableNames=[n for n, _ in trainable],
                  modelArgs=MODEL_ARGS, pretrainedSha256=sha(PRETRAINED / 'exp/pretrained.pt'),
                  gpu=torch.cuda.get_device_name(0), precision='float32', split={'train':28,'validation':6,'test':6},
                  augmentation='speed/sample-clock 0.95-1.05; gain -9 to +3 dB; noise SNR 22-35 dB; occasional weak echo; silence padding; 1-4 bin frequency mask; no time mask',
                  caveats=['One speaker/session; holdout is not an independently recorded session.',
                           'Replay speech is synthetic. Public probes are short and lack human-verified labels.',
                           'No production false-alarm-per-hour or classroom robustness claim.'],
                  deployment='Not deployed; original browser model remains active.')
    save_json(run / 'config.json', config)
    print(json.dumps({k:config[k] for k in ('method','trainableParameters','totalParameters','gpu')}, ensure_ascii=False), flush=True)
    print('Evaluating baseline on validation only', flush=True)
    baseline = evaluate(teacher, records, extractor, 'validation')
    save_json(run / 'baseline-validation.json', baseline)
    print('baseline', json.dumps({k:v for k,v in baseline.items() if k != 'rows'}), flush=True)
    # Record public phonetic hypotheses to make the provisional probe labels auditable.
    public_hypotheses = []
    with torch.no_grad():
        for record in records:
            if record['kind'] != 'public_speech_probe' or record['split'] != 'validation':
                continue
            x, lengths = batch_features([read_audio(record['path'])], extractor)
            enc, enc_len = teacher.forward_encoder(x, lengths)
            hyp = greedy_search(teacher, enc[:, :int(enc_len[0])], max_sym_per_frame=1)
            public_hypotheses.append(dict(id=record['id'], phoneticHypothesis=[TOKENS[i] for i in hyp]))
    save_json(run / 'public-probe-label-review.json', public_hypotheses)
    training = [r for r in records if r['split'] == 'train' and r['kind'] == 'personal']
    replay = [r for r in records if r['kind'] == 'synthetic_replay']
    waves = {r['id']:read_audio(r['path']) for r in training + replay}
    optimizer = torch.optim.AdamW([p for _, p in trainable], lr=3e-5, weight_decay=0.)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs * 14, eta_min=5e-6)
    best_key = (baseline['correct'] - 3*baseline['wrong'] - 3*baseline['publicProbeTriggers'], -baseline['rnntLoss'])
    best_epoch, stale = 0, 0
    torch.save({'model':teacher.cpu().state_dict()}, run / 'baseline.pt')
    teacher.cuda()
    torch.save({'model':{k:v.cpu() for k,v in model.state_dict().items()}, 'epoch':0}, run / 'best.pt')
    start = time.monotonic()
    history = []
    for epoch in range(1, args.epochs + 1):
        # eval() disables pretrained dropout/balancer schedules; gradients still
        # update the selected layers. This is deliberate for 28 recordings.
        model.eval()
        losses, kls = [], []
        for step in range(14):
            chosen = [training[i] for i in rng.choice(len(training), 3, replace=False)] + [replay[(step + epoch) % len(replay)]]
            audio = [augment(waves[r['id']], rng) for r in chosen]
            x, lengths = batch_features(audio, extractor, rng)
            labels = [r['tokens'] for r in chosen]
            optimizer.zero_grad(set_to_none=True)
            loss, kl = rnnt(model, x, lengths, labels, teacher)
            anchor = sum((p - anchors[n]).square().sum() for n, p in trainable)
            objective = loss + .5 * kl + anchor
            if not torch.isfinite(objective):
                raise RuntimeError('Non-finite training objective')
            objective.backward()
            gradient = torch.nn.utils.clip_grad_norm_([p for _, p in trainable], 1., error_if_nonfinite=True)
            optimizer.step()
            scheduler.step()
            losses.append(float(loss.detach()))
            kls.append(float(kl.detach()))
            if epoch == 1 and step == 0:
                print('FIRST_GPU_UPDATE_COMPLETE', 'loss', losses[-1], 'gradientNorm', float(gradient), flush=True)
        validation = evaluate(model, records, extractor, 'validation')
        key = (validation['correct'] - 3*validation['wrong'] - 3*validation['publicProbeTriggers'], -validation['rnntLoss'])
        if key > best_key:
            best_key, best_epoch, stale = key, epoch, 0
            torch.save({'model':{k:v.detach().cpu() for k,v in model.state_dict().items()}, 'epoch':epoch}, run / 'best.pt')
            save_json(run / 'best-validation.json', validation)
        else:
            stale += 1
        torch.save({'model':{k:v.detach().cpu() for k,v in model.state_dict().items()}, 'optimizer':optimizer.state_dict(),
                    'epoch':epoch, 'scheduler':scheduler.state_dict()}, run / 'last.pt')
        row = dict(epoch=epoch, trainLoss=float(np.mean(losses)), replayKL=float(np.mean(kls)),
                   validation={k:v for k,v in validation.items() if k != 'rows'}, bestEpoch=best_epoch,
                   seconds=round(time.monotonic() - start, 1), maxGpuAllocatedMiB=round(torch.cuda.max_memory_allocated()/2**20))
        history.append(row)
        with (run / 'history.jsonl').open('a') as f:
            f.write(json.dumps(row) + '\n')
        print(json.dumps(row), flush=True)
        save_json(run / 'status.json', dict(state='training', **row))
        if stale >= 5:
            print('Early stop: validation has not improved for five epochs', flush=True)
            break
    selected = torch.load(run / 'best.pt', map_location='cpu', weights_only=True)
    model.load_state_dict(selected['model'])
    print('Evaluating untouched test split once after model selection', flush=True)
    baseline_test = evaluate(teacher, records, extractor, 'test')
    candidate_test = evaluate(model, records, extractor, 'test')
    save_json(run / 'baseline-test.json', baseline_test)
    save_json(run / 'candidate-test.json', candidate_test)
    save_json(run / 'status.json', dict(state='complete', bestEpoch=best_epoch, completedEpochs=len(history),
                                      seconds=round(time.monotonic()-start, 1), candidate=str(run/'best.pt'),
                                      trainedCandidateSelected=best_epoch>0, maxGpuAllocatedMiB=round(torch.cuda.max_memory_allocated()/2**20)))
    print('TRAINING_COMPLETE', (run / 'status.json').read_text(), flush=True)

if __name__ == '__main__':
    main()
