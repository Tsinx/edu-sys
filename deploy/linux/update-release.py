#!/usr/bin/env python3
"""Activate a verified release with a stopped-service backup and startup rollback."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.request

root = Path(__file__).resolve().parents[2]
release = Path(sys.argv[1]).resolve()
if release.parent != root / 'output' or not release.name.startswith('campus-server-'):
    raise SystemExit('Specify a campus-server-* directory under this repository output/.')
verification = json.loads((release / 'verification.json').read_text())
if not all(verification.get(key) for key in ('productionInstall', 'standaloneStartup', 'secureCookie', 'backupIntegrity')):
    raise SystemExit('Run scripts/verify-campus-release.mjs on this release before activation.')
if Path(verification['release']).resolve() != release:
    raise SystemExit('Verification report belongs to a different release.')
current = root / 'output/campus-current'
previous = current.resolve(strict=True)
if release == previous:
    raise SystemExit('The requested release is already active.')
runtime = root / '.runtime/campus'
data = runtime / 'data'
env = dict(os.environ, EDU_ENV_FILE=str(runtime / '.env'))
node = root / '.runtime/toolchain/node_modules/node/bin/node'
backup = root / '.runtime/backups' / time.strftime('upgrade-%Y%m%d-%H%M%S')
backup.mkdir(parents=True, mode=0o700)
backup.chmod(0o700)
shutil.copy2(runtime / '.env', backup / 'campus.env')
(backup / 'previous-release.txt').write_text(str(previous) + '\n')
switched = False
subprocess.run(['systemctl', '--user', 'stop', 'edu-campus'], check=True)
try:
    subprocess.run([str(node), 'admin.mjs', 'backup', str(backup / 'data')], cwd=previous, env=env, check=True)
    link = current.with_name('campus-next-' + str(os.getpid()))
    link.symlink_to(release.name, target_is_directory=True)
    os.replace(link, current)
    switched = True
    subprocess.run(['systemctl', '--user', 'start', 'edu-campus'], check=True)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    expected = json.loads((release / 'web/offline-manifest.json').read_text())['releaseId']
    for attempt in range(30):
        try:
            with opener.open('http://127.0.0.1:4300/api/health', timeout=2) as response:
                health = json.load(response)
                assert health['status'] == 'ok' and health['identityProvider'] == 'campus_local'
                assert not health['developmentIdentityEnabled']
            with opener.open('http://127.0.0.1:4300/offline-manifest.json', timeout=2) as response:
                assert json.load(response)['releaseId'] == expected
            break
        except Exception:
            if attempt == 29:
                raise
            time.sleep(1)
except BaseException:
    if switched:
        subprocess.run(['systemctl', '--user', 'stop', 'edu-campus'], check=True)
        # Preserve failed-migration data for diagnosis before restoring the backup.
        shutil.move(str(data), str(backup / 'failed-data'))
        shutil.copytree(backup / 'data', data)
        data.chmod(0o700)
        link = current.with_name('campus-rollback-' + str(os.getpid()))
        link.symlink_to(previous.name, target_is_directory=True)
        os.replace(link, current)
    subprocess.run(['systemctl', '--user', 'start', 'edu-campus'], check=True)
    raise
print(json.dumps(dict(release=str(release), previous=str(previous), backup=str(backup), releaseId=expected), indent=2))
