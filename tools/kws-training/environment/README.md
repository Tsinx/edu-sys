# 独立 GPU 训练依赖环境

本目录是环境的可复现配置，实际 Python 环境与 icefall 源码放在 **Edu-KWS 的 Linux 文件系统**中。

| 项目 | 位置或版本 |
| --- | --- |
| WSL 发行版 | Edu-KWS / Ubuntu 22.04.5 |
| 工作目录 | /home/edu/projects/edu-kws |
| Python 环境 | /home/edu/projects/edu-kws/.venv |
| Python | 3.11.16，由 Linux uv 管理 |
| Torch / Torchaudio | 2.8.0+cu128 |
| k2 | 1.24.4.dev20260625+cuda12.8.torch2.8.0 |
| kaldifeat | 1.25.5.dev20250807+cuda12.8.torch2.8.0 |
| Lhotse / Lilcom | 1.33.0 / 1.8.2 |
| icefall | vendor/icefall，源码版本见 icefall-revision.txt |
| ONNX / ONNX Runtime | 1.22.0 / 1.29.0，导出验证使用 CPU |
| sherpa-onnx / core | 1.13.7 / 1.13.7 |

`uv.lock` 固定全部 Python 依赖及文件哈希；icefall 以本地可编辑包安装，源码固定到 `3f848bb6d0acc970c9b294a30ca0a04a7c9c78d1`。未修改 Windows LAM 环境。

`patch_icefall.py` 另包含两处帮助文本修复：将上游 `finetune.py` 中的 `5%`、`95%` 转义为 argparse 所需的 `5%%`、`95%%`，解决 `--help` 的格式化异常，不改动训练逻辑。安装脚本只允许这一已知源码差异，遇到其他修改会停止。

## 进入环境

在 PowerShell 中：

```powershell
wsl -d Edu-KWS --cd /home/edu/projects/edu-kws
```

进入 Linux 后：

```bash
source .venv/bin/activate
```

也可以在该工作目录使用 `uv run --locked python ...`。激活环境不会启动训练。

## 复现安装

系统依赖包括 FFmpeg、SoX、libsndfile、GCC/G++、CMake、Ninja、Git LFS；完整列表见 `system-packages.txt`。

```powershell
wsl -d Edu-KWS -u root --exec bash /mnt/d/codes/edu-sys/tools/kws-training/environment/install_system_dependencies.sh
wsl -d Edu-KWS --exec bash -lc 'bash /mnt/d/codes/edu-sys/tools/kws-training/environment/bootstrap.sh'
```

`bootstrap.sh` 将本目录配置复制到 Linux 工作目录，检出固定的 icefall 源码，运行 `uv sync --locked`，最后检查依赖。已有 icefall 源码改动时会停止，避免覆盖。需要调整版本时修改配置、重新生成锁文件并验证，不直接改动 Windows 的 `.venv`。

GPU 运行库由 PyTorch 的 CUDA wheel 依赖提供；k2 与 kaldifeat 使用匹配的预编译 CUDA wheel。本环境不需要另装 Linux NVIDIA 驱动，也没有为源码编译额外安装完整 CUDA Toolkit/nvcc。

## 当前验证边界

检查脚本隐藏所有 GPU，仅使用短小的合成 CPU 数据，并以 `--help` 检查官方微调、解码、导出入口。不会调用真实训练数据、创建优化器训练步骤或执行官方 `run.sh`。

```powershell
wsl -d Edu-KWS --cd /home/edu/projects/edu-kws --exec bash -lc 'uv pip check --python .venv/bin/python && .venv/bin/python /mnt/d/codes/edu-sys/tools/kws-training/environment/verify_environment.py --output /mnt/d/codes/edu-sys/.runtime/kws-training/linux-environment-check.json'
```

详细结果：项目 `.runtime/kws-training/linux-environment-check.json`。检查覆盖版本匹配、原生包导入、k2 CPU 图算子、80 维 Fbank、Lilcom 压缩、WAV 读写、Lhotse 读取、ONNX CPU 推理和官方 KWS 脚本入口。

已知兼容限制：当前 wheel 组合在同一 Python 进程先导入 `kaldifst`、再导入 `kaldilm` 会卡住。语言模型转换工具按[官方用法](https://github.com/csukuangfj/kaldilm)使用独立命令 `python -m kaldilm ...`；检查脚本也验证该独立入口，避免将它混入训练进程。

**软件依赖检查与 GPU 训练验证分开。** 本目录的安装检查没有执行 CUDA 运算或训练。2026-09-09 用户另行授权的 GPU 个人适配实验见 [PERSONAL_TRAINING.md](../PERSONAL_TRAINING.md)，运行记录保存在独立实验目录，原安装报告保持原有时间与验证边界。

官方来源：[icefall](https://github.com/k2-fsa/icefall)、[k2 CUDA wheels](https://k2-fsa.github.io/k2/cuda.html)、[kaldifeat wheels](https://kaldifeat.readthedocs.io/en/latest/installation/from_wheels.html)、[PyTorch 版本](https://pytorch.org/get-started/previous-versions/)。
