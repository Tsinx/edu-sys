#!/usr/bin/env python3
"""Import API keys into the private service environment without argv secrets."""
import argparse
import getpass
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone


def selected_keys(values):
    def first(*names):
        return next((values[name].strip() for name in names if values.get(name, '').strip()), None)
    return {name: value for name, value in {
        'DASHSCOPE_API_KEY': first('DASHSCOPE_API_KEY', 'dashscope_api_key'),
        'EDU_ASSISTANT_API_KEY': first('EDU_ASSISTANT_API_KEY'),
    }.items() if value}


def persist_keys(target, backup_root, values):
    keys = selected_keys(values)
    if not keys:
        raise ValueError('未读取到有效 API 密钥；请在设置变量的终端运行，或使用 --env-file 指定已有密钥文件。')
    if any('\n' in value or '\r' in value for value in keys.values()):
        raise ValueError('API 密钥不能包含换行。')
    old = target.read_text()
    replaced = set(keys)
    if 'DASHSCOPE_API_KEY' in keys:
        replaced.add('dashscope_api_key')
    lines = [line for line in old.splitlines() if line.split('=', 1)[0].strip().removeprefix('export ').strip() not in replaced]
    lines.extend(f'{key}={json.dumps(value)}' for key, value in keys.items())
    backup = backup_root / datetime.now(timezone.utc).strftime('ai-config-%Y%m%dT%H%M%S%fZ')
    backup.mkdir(parents=True, mode=0o700)
    shutil.copyfile(target, backup / 'campus.env')
    (backup / 'campus.env').chmod(0o600)
    descriptor, temporary = tempfile.mkstemp(prefix='.env-', dir=target.parent)
    try:
        with os.fdopen(descriptor, 'w') as output:
            output.write('\n'.join(lines) + '\n')
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)
    return backup, list(keys)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group()
    source.add_argument('--env-file', type=Path, help='含密钥的已有 .env 文件；只导入密钥字段')
    source.add_argument('--prompt', action='store_true', help='在当前终端隐藏输入 DashScope 密钥')
    args = parser.parse_args()
    os.umask(0o077)
    root = Path(__file__).resolve().parents[2]
    values = dict(os.environ)
    if args.env_file:
        # Node's own dotenv parser handles quoting consistently with the server.
        script = '''const {parseEnv}=require('node:util');const {readFileSync}=require('node:fs');
const env=parseEnv(readFileSync(process.argv[1],'utf8'));
console.log(JSON.stringify(Object.fromEntries(['DASHSCOPE_API_KEY','dashscope_api_key','EDU_ASSISTANT_API_KEY'].map(k=>[k,env[k]]))));'''
        result = subprocess.run([str(root / '.runtime/toolchain/node_modules/node/bin/node'), '-e', script, str(args.env_file.resolve())], capture_output=True, text=True)
        if result.returncode:
            raise SystemExit('无法读取指定的环境文件，配置未修改。')
        values = json.loads(result.stdout)
    elif args.prompt:
        values = {'DASHSCOPE_API_KEY': getpass.getpass('DashScope API 密钥（隐藏输入）：')}
    try:
        backup, names = persist_keys(root / '.runtime/campus/.env', root / '.runtime/backups', values)
    except ValueError as error:
        raise SystemExit(str(error)) from None
    subprocess.run(['systemctl', '--user', 'restart', 'edu-campus'], check=True)
    print(json.dumps({'updatedKeys': names, 'backup': str(backup), 'serviceRestarted': True}, ensure_ascii=False))


if __name__ == '__main__':
    main()
