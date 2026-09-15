#!/usr/bin/env python3
"""Verify the running HTTPS deployment; credentials are never printed."""
import hashlib
import json
from pathlib import Path
import ssl
import subprocess
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parents[2]
prepared = root / '.runtime/deploy'
settings = dict(line.split('=', 1) for line in (root / '.runtime/campus/.env').read_text().splitlines() if line and not line.startswith('#') and '=' in line)
origin = settings['EDU_PUBLIC_ORIGIN']
context = ssl.create_default_context(cafile=str(prepared / 'edu-campus-root.crt'))
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=context))

def request(path, data=None, headers=None):
    headers = dict(headers or {})
    if data is not None:
        data = json.dumps(data).encode()
        headers['Content-Type'] = 'application/json'
    try:
        with opener.open(urllib.request.Request(origin + path, data=data, headers=headers), timeout=15) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()

status, _, body = request('/api/health')
assert status == 200
health = json.loads(body)
assert health['identityProvider'] == 'campus_local'
assert health['developmentIdentityEnabled'] is False
status, headers, _ = request('/')
assert status == 200
assert headers['X-Frame-Options'] == 'SAMEORIGIN'
assert request('/api/me')[0] == 401
assert json.loads(request('/api/runtime/config')[2])['profile'] == 'campus'
for path in ['/.env', '/server.mjs', '/data/state.json', '/assets/missing.js']:
    assert request(path)[0] >= 400, path
manifest = json.loads(request('/offline-manifest.json')[2])
for entry in manifest['files']:
    status, _, data = request(entry['url'])
    assert status == 200, entry['url']
    assert len(data) == entry['bytes'], entry['url']
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['url']
account = json.loads((root / '.runtime/campus/initial-teacher.json').read_text())
credentials = {key: account[key] for key in ('username', 'password')}
status, headers, _ = request('/api/identity/login', credentials, {'Origin': origin})
assert status == 200
cookie = headers['Set-Cookie']
assert 'Secure' in cookie and 'HttpOnly' in cookie
session = {'Cookie': cookie.split(';')[0], 'Origin': origin}
assert request('/api/me', headers=session)[0] == 200
assert request('/api/courses', headers=session)[0] == 200
assert request('/api/identity/login', credentials, {'Origin': 'https://wrong-origin.invalid'})[0] == 403
subprocess.run(['systemctl', '--user', 'restart', 'edu-campus.service'], check=True)
for attempt in range(30):
    if request('/api/health')[0] == 200:
        break
    time.sleep(1)
assert request('/api/me', headers=session)[0] == 200
assert request('/api/identity/logout', {}, session)[0] == 204
assert request('/api/me', headers=session)[0] == 401
subprocess.run(['systemctl', '--user', 'reload', 'edu-campus-caddy.service'], check=True)
assert request('/api/health')[0] == 200
report = dict(origin=origin, verifiedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), tlsVerified=True,
              campusMode=True, login=True, secureCookie=True, privateFilesBlocked=True,
              originEnforced=True, sessionSurvivesRestart=True, logoutRevokesSession=True,
              caddyReload=True, verifiedStaticFiles=len(manifest['files']),
              scope='Verified from the server through its LAN HTTPS address; other devices and cloud AI were not exercised.')
(prepared / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
