#!/usr/bin/env python3
"""Create a production account or reset a password without exposing argv secrets."""
import getpass
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
action = input('操作 [create/reset-password]：').strip()
if action not in ('create', 'reset-password'):
    raise SystemExit('操作无效。')
account = {'username': input('账号：').strip()}
if action == 'create':
    account['displayName'] = input('姓名：').strip()
    account['role'] = input('角色 [teacher/student]：').strip()
    if account['role'] not in ('teacher', 'student'):
        raise SystemExit('角色无效。')
account['password'] = getpass.getpass('密码（长度要求由本机配置决定）：')
if account['password'] != getpass.getpass('再次输入密码：'):
    raise SystemExit('两次密码不一致。')
env = dict(os.environ, EDU_ENV_FILE=str(root / '.runtime/campus/.env'))
subprocess.run([str(root / '.runtime/toolchain/node_modules/node/bin/node'), 'admin.mjs', action],
               cwd=root / 'output/campus-current', env=env, input=json.dumps(account), text=True, check=True)
