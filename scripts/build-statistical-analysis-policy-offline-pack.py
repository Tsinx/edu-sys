"""Build a local, hash-verified INPRES learner pack with the actual data file.

This writes to output/, not the public web assets. It does not download data or
change the source file. Use a copy already obtained from the pinned source.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "apps/teacher-web/public/course-assets/statistical-analysis/project-12-13"
EXPECTED_DATA_SHA256 = "1a0be1709ef2ed7e182b02b13da9791f4300a94818b4f13efea3e6868a984e5a"
EXPECTED_COMMIT = "c3b4868a66ab908f8fd09354e0439fed4cb92085"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True,
                        help="Existing, unmodified inpresdata.dta from the pinned source")
    parser.add_argument("--output", type=Path, default=(
        ROOT / "output/statistical-analysis-policy/INPRES-第12-13讲学生项目包.zip"))
    args = parser.parse_args()

    # Validate both the public project and the data before writing deliverables.
    data_bytes = args.data.read_bytes()
    data_sha256 = hashlib.sha256(data_bytes).hexdigest()
    if data_sha256 != EXPECTED_DATA_SHA256:
        raise ValueError("数据SHA-256不一致；停止打包，保留源文件。")
    manifest = json.loads((PUBLIC / "manifest.json").read_text(encoding="utf-8"))
    files = {}
    with zipfile.ZipFile(PUBLIC / "project-12-13.zip") as source:
        expected_members = {f"inpres-project/{name}" for name in manifest}
        if set(source.namelist()) != expected_members:
            raise ValueError("学生代码包文件清单不一致。")
        for name, sha256 in manifest.items():
            content = source.read(f"inpres-project/{name}")
            if hashlib.sha256(content).hexdigest() != sha256:
                raise ValueError(f"学生代码包校验失败：{name}")
            files[name] = content

    readme = files["README.md"].decode("utf-8")
    old = "第一次准备从固定公开Git版本下载约15 MB的Stata处理文件，SHA-256通过后缓存到`data/inpresdata.dta`。先准备、后上课，可以离线跟做；校验失败立即停止，不自动换源或覆盖。项目包保留来源与下载程序，不夹带未明确授权再分发的原始微数据。"
    new = (
        "本离线包已包含`data/inpresdata.dta`，共15,914,038字节、152990行、26列，"
        "与课件使用的固定公开版本逐字节一致。`prepare_data.py`与Notebook直接读取这个文件，"
        "每次载入仍核对SHA-256；文件完整时不需要下载。先安装上述Python依赖，再断网跟做。"
        "这是真实SUPAS的公开研究处理版，不是BPS未处理的原始问卷数据库。"
        "`manifest.json`列出包内各文件的SHA-256；来源与变量说明见`DATA.md`。"
    )
    if old not in readme:
        raise ValueError("README的数据准备说明已变化，请人工核对离线说明。")
    files["README.md"] = readme.replace(old, new).encode("utf-8")

    dictionary = files["DATA.md"].decode("utf-8")
    old = "处理版可以公开读取；这里不将其他仓库的MIT代码许可扩大解释为该微数据的再分发许可。项目ZIP提供固定下载程序，原始文件在使用者本地缓存，未夹带再分发。原始字节校验后只读，不覆盖。"
    new = (
        "本地离线项目包收录上述固定版本，路径为`data/inpresdata.dta`；"
        "原始字节校验后只读，不覆盖。它是公开研究处理文件，不是BPS未处理的原始问卷数据库。"
        "来源仓库未列出单独的数据开放许可；这里不将其他仓库的MIT代码许可扩大解释为微数据许可，"
        "也不将这个本地离线副本写入公开网站或Git仓库。"
    )
    if old not in dictionary:
        raise ValueError("DATA的来源边界说明已变化，请人工核对。")
    files["DATA.md"] = dictionary.replace(old, new).encode("utf-8")

    # Keep the executable cells unchanged; only correct the preparation note.
    for name in ["01_did.ipynb", "02_iv.ipynb"]:
        notebook = json.loads(files[name])
        for cell in notebook["cells"]:
            if cell["cell_type"] == "markdown":
                text = "".join(cell["source"])
                text = text.replace(
                    "第一次运行需联网下载固定版本并核对SHA-256，之后可断网运行。",
                    "本离线包已附固定数据文件；先安装Python依赖，再断网按顺序运行。载入时仍核对SHA-256。",
                )
                cell["source"] = text.splitlines(keepends=True)
        files[name] = (json.dumps(notebook, ensure_ascii=False, indent=1) + "\n").encode("utf-8")

    files["data/inpresdata.dta"] = data_bytes
    hashes = {name: hashlib.sha256(content).hexdigest() for name, content in files.items()}
    files["manifest.json"] = (json.dumps(hashes, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if output == (PUBLIC / "project-12-13.zip").resolve():
        raise ValueError("离线副本不能覆盖公开网站的代码下载包。")
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            entry = zipfile.ZipInfo(f"inpres-project/{name}", date_time=(2026, 10, 21, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, content)

    standalone = output.parent / "data/inpresdata.dta"
    standalone.parent.mkdir(exist_ok=True)
    if standalone.resolve() != args.data.resolve():
        shutil.copyfile(args.data, standalone)
    report = {
        "archive": str(output),
        "archiveBytes": output.stat().st_size,
        "archiveSha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "files": len(files),
        "dataset": {"path": "inpres-project/data/inpresdata.dta", "bytes": len(data_bytes),
                    "sha256": data_sha256, "commit": EXPECTED_COMMIT},
        "standaloneData": str(standalone),
        "scope": "Local offline deliverable; public assets are unchanged.",
    }
    (output.parent / "offline-pack-build.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
