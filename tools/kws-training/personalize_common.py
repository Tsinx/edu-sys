"""Small-data adaptation helpers for the pinned WenetSpeech Zipformer recipe."""
import argparse
import os
from pathlib import Path
import sys

os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
os.environ.setdefault("PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION", "python")
ROOT = Path(os.environ.get("KWS_TRAINING_ROOT", "/home/edu/projects/edu-kws"))
RECIPE = ROOT / "vendor/icefall/egs/wenetspeech/KWS/zipformer"
PRETRAINED = ROOT / "pretrained/icefall-kws-zipformer-wenetspeech-20240219"
sys.path.insert(0, str(RECIPE))

import torch
import k2
import kaldifeat
from train import add_model_arguments, get_model
from icefall.utils import AttributeDict, text_to_pinyin, num_tokens

torch.set_num_threads(2)
MODEL_ARGS = ["--decoder-dim", "320", "--joiner-dim", "320", "--num-encoder-layers", "1,1,1,1,1,1",
              "--feedforward-dim", "192,192,192,192,192,192", "--encoder-dim", "128,128,128,128,128,128",
              "--encoder-unmasked-dim", "128,128,128,128,128,128", "--causal", "1", "--chunk-size", "16",
              "--left-context-frames", "64"]
TOKEN_PATH = PRETRAINED / "data/lang_partial_tone/tokens.txt"
TOKENS = k2.SymbolTable.from_file(str(TOKEN_PATH))

def token_ids(text):
    return [TOKENS[t] for t in text_to_pinyin(text, mode="partial_with_tone")]

def load_model(checkpoint=None, device="cpu"):
    parser = argparse.ArgumentParser()
    add_model_arguments(parser)
    params = AttributeDict(vars(parser.parse_args(MODEL_ARGS)))
    params.update(feature_dim=80, vocab_size=num_tokens(TOKENS) + 1, blank_id=TOKENS["<blk>"], context_size=2)
    model = get_model(params)
    path = checkpoint or PRETRAINED / "exp/pretrained.pt"
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    model.load_state_dict(checkpoint["model"], strict=True)
    model.eval()
    return model.to(device)

def feature_extractor():
    opts = kaldifeat.FbankOptions()
    opts.device = "cpu"
    opts.frame_opts.dither = 0
    opts.frame_opts.snip_edges = False
    opts.mel_opts.num_bins = 80
    opts.mel_opts.high_freq = -400
    return kaldifeat.Fbank(opts)

if __name__ == "__main__":
    model = load_model()
    print("parameters", sum(p.numel() for p in model.parameters()), flush=True)
    print("vocabulary", len(TOKENS), "wake", token_ids("你好助手"), "end", token_ids("非常感谢"), flush=True)
    print("GPU", torch.cuda.get_device_name(0), flush=True)
    model.to("cuda")
    wave = torch.zeros(32000)
    features = feature_extractor()(wave).unsqueeze(0).cuda()
    with torch.no_grad():
        encoded, lengths = model.forward_encoder(features, torch.tensor([features.shape[1]], device="cuda"))
    print("CUDA encoder check", encoded.shape, lengths.tolist(), flush=True)
    for name, module in model.named_children():
        print(name, sum(p.numel() for p in module.parameters()), flush=True)
