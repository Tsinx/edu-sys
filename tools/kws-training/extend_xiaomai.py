"""Continue the five-epoch candidate to a fixed epoch budget without early stop.

Original-model anchors are retained. The old checkpoint has no optimizer/RNG
state: this is weight continuation with a fresh optimizer, not exact resumption.
Previously inspected test recordings are regression data, never new holdout.
"""
from finetune_xiaomai import (PHRASES, GROUPS, compact, evaluate, make_graphs,
                              admissible, rank, constrain)
from personalize_common import load_model, feature_extractor
from personalize_train import save_json, sha, read_audio, augment, batch_features, rnnt
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import random
import shutil
import time
import traceback

import numpy as np
import torch


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--parent-run', type=Path, required=True)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--until-epoch', type=int, default=20)
    parser.add_argument('--seed', type=int, default=20260915)
    args = parser.parse_args()
    parent, run = args.parent_run.resolve(), args.run.resolve()
    assert not (run / 'config.json').exists(), 'Refusing to overwrite a run'
    parent_status = json.loads((parent / 'status.json').read_text())
    parent_config = json.loads((parent / 'config.json').read_text())
    assert parent_status['state'] == 'complete'
    start_checkpoint = parent / 'last.pt'
    saved = torch.load(start_checkpoint, map_location='cpu', weights_only=True)
    start_epoch = saved['epoch']
    assert start_epoch == 5 and args.until_epoch > start_epoch
    assert not parent_status['encoderUnfrozen'], 'This continuation isolates extra projection-only epochs'
    records = json.loads((parent / 'split-manifest.json').read_text())
    for record in records:
        assert sha(record['path']) == record['sha256']
        if record['kind'] == 'personal':
            assert sha(record['originalPath']) == record['sourceGroup']
    assert len({r['sourceGroup'] for r in records if r['kind'] == 'personal'}) == 80
    assert all(len({r['split'] for r in records if r['sourceGroup'] == group}) == 1
               for group in {r['sourceGroup'] for r in records})
    run.mkdir(parents=True, exist_ok=True)
    for name in ('split-manifest.json', 'split-audit.json', 'baseline.pt', 'baseline-validation.json'):
        shutil.copy2(parent / name, run / name)
    shutil.copy2(start_checkpoint, run / 'starting-epoch-05.pt')
    shutil.copy2(parent / 'validation/epoch-05.json', run / 'starting-validation.json')
    baseline = json.loads((run / 'baseline-validation.json').read_text())
    rng = np.random.default_rng(args.seed)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    torch.cuda.set_per_process_memory_fraction(.65)
    teacher = load_model(parent / 'baseline.pt', device='cuda').requires_grad_(False)
    model = load_model(start_checkpoint, device='cuda').requires_grad_(False)
    all_named = dict(model.named_parameters())
    teacher_named = dict(teacher.named_parameters())
    grouped = [dict(name=name, named=[(n, p) for n, p in all_named.items() if n.startswith(prefix)],
                    baseLr=lr, relativeCap=cap) for name, (prefix, lr, cap) in GROUPS.items()]
    anchors = {n: teacher_named[n].detach().clone() for g in grouped for n, _ in g['named']}
    trainable = grouped[0]['named']
    for _, p in trainable:
        p.requires_grad_(True)
    assert all(torch.equal(model.state_dict()[n], v.to('cuda')) for n, v in saved['model'].items())
    assert all(torch.equal(v, teacher.state_dict()[n]) for n, v in model.state_dict().items()
               if n not in {n for n, _ in trainable})
    optimizer = torch.optim.AdamW([p for _, p in trainable], lr=3e-5, weight_decay=1e-4)
    extractor, graphs = feature_extractor(), make_graphs()
    config = dict(parent_config, startedAt=datetime.now(timezone.utc).isoformat(),
        experiment='Fixed-budget continuation of epoch 5 to epoch 20', parentRun=str(parent),
        parentCheckpointSha256=sha(start_checkpoint), originalAnchorCheckpointSha256=sha(parent / 'baseline.pt'),
        parentScriptSha256=parent_config['scriptSha256'], scriptSha256=sha(Path(__file__)),
        seed=args.seed, startEpoch=start_epoch, maxEpochs=args.until_epoch, additionalEpochs=args.until_epoch-start_epoch,
        patience=None, earlyStopping=False, unfreezeGate='Disabled for this extension; all encoder layers stay frozen',
        optimizerRestored=False, optimizerResetReason='Parent checkpoint contains model/epoch only; original optimizer and RNG states were not saved',
        lrSchedule='Original total-20-epoch cosine schedule, starting at global step 70; fresh optimizer warmed up over 10 additional updates',
        anchorPolicy='L2-SP and relative 2% projection cap remain referenced to ORIGINAL pretrained weights, not epoch 5',
        modelSelection='Monitor full-utterance validation each epoch; evaluate fixed milestones 10/15/20 in actual browser on validation and behavior probes. Keep original/epoch-5 comparators. Do not use regression-test scores to select.',
        browserSelectionRule='Eligible only if old-word validation success and behavior/noise/probe controls do not regress. Rank eligible checkpoints by all-category validation success; tie-break by lower validation RNNT loss. If no validation improvement, retain existing deployment.',
        testPolicy='Previously viewed test split is regression only. No test inference inside training or hyperparameter adjustment using it.',
        gpu=torch.cuda.get_device_name(), actualTrainableParameters=sum(p.numel() for _, p in trainable),
        actualTrainableNames=[n for n, _ in trainable], checkpointing='Every epoch saves optimizer, NumPy/Python/Torch/CUDA RNG states and global step; milestones also retained separately')
    save_json(run / 'config.json', config)
    (run / 'scripts').mkdir(exist_ok=True)
    for name in ('extend_xiaomai.py', 'finetune_xiaomai.py', 'personalize_common.py', 'personalize_train.py'):
        shutil.copy2(Path(__file__).parent / name, run / 'scripts' / name)
    train = {c: [r for r in records if r['kind'] == 'personal' and r['split'] == 'train' and r['category'] == c] for c in PHRASES}
    replay = [r for r in records if r['kind'] == 'synthetic_replay']
    waves = {(r['id'], variant): read_audio(r[key]) for r in records if r['split'] == 'train'
             for variant, key in [('clean', 'path')] + ([('original', 'originalPath')] if r['kind'] == 'personal' else [])}
    print('CONTINUATION_CONFIG', json.dumps({k: config[k] for k in ('startEpoch', 'maxEpochs', 'additionalEpochs', 'actualTrainableParameters', 'optimizerRestored', 'anchorPolicy')}), flush=True)
    save_json(run / 'status.json', dict(state='training', epoch=start_epoch, targetEpoch=args.until_epoch, additionalSteps=0))
    best_safe, best_safe_epoch = baseline, 0
    best_loss = json.loads((run / 'starting-validation.json').read_text())['rnntLoss']
    best_loss_epoch = start_epoch
    shutil.copy2(run / 'baseline.pt', run / 'best-safe.pt')
    shutil.copy2(start_checkpoint, run / 'best-loss.pt')
    started = time.monotonic()
    def save_checkpoint(path, epoch):
        temporary = path.with_suffix('.tmp')
        torch.save(dict(model={n: v.detach().cpu() for n, v in model.state_dict().items()}, epoch=epoch,
                   globalStep=epoch*14, optimizer=optimizer.state_dict(), numpyGeneratorState=rng.bit_generator.state,
                   pythonRandomState=random.getstate(), torchRandomState=torch.get_rng_state(),
                   cudaRandomStates=torch.cuda.get_rng_state_all(), configSha256=sha(run / 'config.json')), temporary)
        temporary.replace(path)
    try:
        for epoch in range(start_epoch + 1, args.until_epoch + 1):
            model.eval()
            orders = {c: rng.permutation(14) for c in PHRASES}
            losses, kls, penalties, gradients = [], [], [], []
            for step in range(14):
                chosen = [train[c][orders[c][step]] for c in PHRASES] + [replay[((epoch-1)*14+step) % len(replay)]]
                audio = [augment(waves[(r['id'], 'original' if r['kind'] == 'personal' and rng.random() < .3 else 'clean')], rng) for r in chosen]
                x, lengths = batch_features(audio, extractor, rng)
                global_step = (epoch-1)*14 + step
                new_step = (epoch-start_epoch-1)*14 + step
                factor = 1/6 + 5/6 * (1 + math.cos(math.pi*global_step/(args.until_epoch*14))) / 2
                optimizer.param_groups[0]['lr'] = 3e-5 * factor * min(1., (new_step+1)/10)
                optimizer.zero_grad(set_to_none=True)
                loss, kl = rnnt(model, x, lengths, [r['tokens'] for r in chosen], teacher)
                anchor = sum((p-anchors[n]).square().sum() for n, p in trainable)
                objective = loss + .5*kl + anchor
                assert torch.isfinite(objective), 'Non-finite objective'
                objective.backward()
                gradient = torch.nn.utils.clip_grad_norm_([p for _, p in trainable], 1., error_if_nonfinite=True)
                optimizer.step()
                drift = constrain(grouped, anchors)
                losses.append(float(loss.detach())); kls.append(float(kl.detach()))
                penalties.append(float(anchor.detach())); gradients.append(float(gradient))
                if new_step == 0:
                    print('FIRST_CONTINUED_GPU_UPDATE', json.dumps(dict(epoch=epoch, loss=losses[-1], lr=optimizer.param_groups[0]['lr'], drift=drift)), flush=True)
            validation = evaluate(model, records, extractor, graphs, 'validation')
            allowed = admissible(validation, baseline)
            if allowed and rank(validation) > rank(best_safe):
                best_safe, best_safe_epoch = validation, epoch
                save_checkpoint(run / 'best-safe.pt', epoch)
            if validation['rnntLoss'] < best_loss:
                best_loss, best_loss_epoch = validation['rnntLoss'], epoch
                save_checkpoint(run / 'best-loss.pt', epoch)
            save_checkpoint(run / 'last.pt', epoch)
            if epoch % 5 == 0 or epoch == args.until_epoch:
                save_checkpoint(run / f'epoch-{epoch:02}.pt', epoch)
            row = dict(epoch=epoch, additionalEpochs=epoch-start_epoch, additionalSteps=(epoch-start_epoch)*14,
                stage='projection_only', trainLoss=float(np.mean(losses)), replayKL=float(np.mean(kls)),
                l2StartingPoint=float(np.mean(penalties)), maxGradientNorm=max(gradients),
                lrs={'projection':optimizer.param_groups[0]['lr'], 'last_encoder':0.}, drift=drift,
                validation=compact(validation), admissibleByOriginalAcousticRule=allowed,
                bestSafeEpoch=best_safe_epoch, bestLossEpoch=best_loss_epoch,
                seconds=round(time.monotonic()-started, 1), maxGpuAllocatedMiB=round(torch.cuda.max_memory_allocated()/2**20))
            with (run / 'history.jsonl').open('a') as f:
                f.write(json.dumps(row) + '\n')
            save_json(run / f'validation/epoch-{epoch:02}.json', validation)
            save_json(run / 'status.json', dict(state='training', targetEpoch=args.until_epoch, **row))
            print('EPOCH', json.dumps(row), flush=True)
        changed = [n for n, v in model.state_dict().items() if not torch.equal(v, teacher.state_dict()[n])]
        assert changed and all(n in {n for n, _ in trainable} for n in changed)
        assert all(item['relativeL2'] <= item['cap'] + 1e-6 for item in drift.values())
        save_json(run / 'weight-audit.json', dict(passed=True, changedTensors=changed, frozenTensorsUnchanged=True,
            originalAnchorRetained=True, drift=drift, parentCheckpointSha256=sha(start_checkpoint), lastCheckpointSha256=sha(run/'last.pt')))
        # Prove that the new checkpoints contain readable optimizer/RNG state.
        restored = torch.load(run/'last.pt', map_location='cpu', weights_only=True)
        assert restored['epoch'] == args.until_epoch and restored['optimizer']['state']
        replay_rng = np.random.default_rng(); replay_rng.bit_generator.state = restored['numpyGeneratorState']
        save_json(run/'checkpoint-audit.json', dict(passed=True, modelEpoch=restored['epoch'], globalStep=restored['globalStep'], optimizerSaved=True,
                  numpyStateRestorable=True, pythonStateSaved=True, torchAndCudaStatesSaved=True))
        save_json(run / 'status.json', dict(state='complete', startEpoch=start_epoch, completedEpochs=args.until_epoch,
            additionalEpochs=args.until_epoch-start_epoch, additionalSteps=(args.until_epoch-start_epoch)*14,
            totalSteps=args.until_epoch*14, bestSafeEpoch=best_safe_epoch, bestLossEpoch=best_loss_epoch,
            encoderUnfrozen=False, testUsedDuringTraining=False, seconds=round(time.monotonic()-started, 1),
            maxGpuAllocatedMiB=round(torch.cuda.max_memory_allocated()/2**20), candidate=str(run/'last.pt')))
        print('CONTINUATION_COMPLETE', (run / 'status.json').read_text(), flush=True)
    except Exception as error:
        save_json(run / 'status.json', dict(state='failed', error=str(error), traceback=traceback.format_exc(), lastEpoch=locals().get('epoch')))
        raise


if __name__ == '__main__':
    main()
