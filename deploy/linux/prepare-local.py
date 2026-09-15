#!/usr/bin/env python3
"""Prepare a built release for this Linux host without administrator access."""
import getpass
import ipaddress
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
address = str(ipaddress.IPv4Address(sys.argv[1]))
releases = sorted((root / 'output').glob('campus-server-*'))
release = releases[-1]
node = root / '.runtime/toolchain/node_modules/node/bin/node'
env = dict(os.environ, PATH=f"{root}/.runtime/toolchain/node_modules/.bin:{os.environ['PATH']}")
(root / 'output/campus-deployment-review').mkdir(exist_ok=True)
subprocess.run([str(node), 'scripts/verify-campus-release.mjs', str(release)], cwd=root, env=env, check=True)
runtime = root / '.runtime/campus'
runtime.mkdir(mode=0o700, exist_ok=True)
runtime.chmod(0o700)
(runtime / 'data').mkdir(mode=0o700, exist_ok=True)
env_file = runtime / '.env'
if not env_file.exists():
    contents = (root / 'deploy/campus/campus.env.example').read_text()
    contents = contents.replace('https://classroom.example.edu', f'https://{address}:8443')
    contents = contents.replace('./data/', f'{runtime}/data/')
    contents = contents.replace('./web', f'{root}/output/campus-current/web')
    with env_file.open('x') as file:
        os.chmod(env_file, 0o600)
        file.write(contents)
env['EDU_ENV_FILE'] = str(env_file)
credentials = runtime / 'initial-teacher.json'
if not credentials.exists():
    account = dict(username=getpass.getuser(), displayName='李行之', role='teacher', password=secrets.token_urlsafe(24))
    subprocess.run([str(node), 'admin.mjs', 'create'], cwd=release, env=env, input=json.dumps(account), text=True, check=True)
    with credentials.open('x') as file:
        os.chmod(credentials, 0o600)
        json.dump(account, file, ensure_ascii=False, indent=2)
current = root / 'output/campus-current'
if current.is_symlink():
    current.unlink()
current.symlink_to(release.name, target_is_directory=True)
prepared = root / '.runtime/deploy'
prepared.mkdir(exist_ok=True)
print(f'Prepared release: {release}\nHTTPS address: https://{address}:8443\nPrivate credentials: {credentials}')
