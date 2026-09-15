#!/usr/bin/env python3
"""Install persistent user services on unprivileged ports; no sudo required."""
import ipaddress
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

root = Path(__file__).resolve().parents[2]
address = str(ipaddress.IPv4Address(sys.argv[1]))
origin = f'https://{address}:8443'
runtime = root / '.runtime/campus'
env_file = runtime / '.env'
contents = env_file.read_text().splitlines()
env_file.write_text('\n'.join(f'EDU_PUBLIC_ORIGIN={origin}' if line.startswith('EDU_PUBLIC_ORIGIN=') else line for line in contents) + '\n')
env_file.chmod(0o600)
prepared = root / '.runtime/deploy'
caddy_dir = root / '.runtime/caddy'
caddy_dir.mkdir(mode=0o700, exist_ok=True)
caddy_dir.chmod(0o700)
config = prepared / 'Caddyfile.user'
config.write_text('''{
    admin 127.0.0.1:2020
    auto_https disable_redirects
    skip_install_trust
}
http://:2080 {
    redir @PUBLIC_ORIGIN@{uri} permanent
}
@PUBLIC_ORIGIN@ {
    tls internal
    encode zstd gzip
    header {
        X-Content-Type-Options nosniff
        Referrer-Policy same-origin
        X-Frame-Options SAMEORIGIN
    }
    reverse_proxy 127.0.0.1:4300 {
        flush_interval -1
    }
}
'''.replace('@PUBLIC_ORIGIN@', origin))
subprocess.run(['caddy', 'fmt', '--overwrite', str(config)], check=True)
env = dict(os.environ, XDG_DATA_HOME=str(caddy_dir / 'data'), XDG_CONFIG_HOME=str(caddy_dir / 'config'))
subprocess.run(['caddy', 'validate', '--config', str(config)], env=env, check=True)
units = Path.home() / '.config/systemd/user'
units.mkdir(parents=True, exist_ok=True)
api_service = f'''[Unit]
Description=Edu campus teaching server (user service)

[Service]
Type=simple
WorkingDirectory={root}/output/campus-current
Environment=NODE_ENV=production
Environment=EDU_ENV_FILE={env_file}
ExecStart={root}/.runtime/toolchain/node_modules/node/bin/node server.mjs
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
UMask=0077
NoNewPrivileges=true

[Install]
WantedBy=default.target
'''
caddy_service = f'''[Unit]
Description=Caddy HTTPS proxy for Edu campus
Wants=edu-campus.service
After=edu-campus.service

[Service]
Type=notify
Environment=XDG_DATA_HOME={caddy_dir}/data
Environment=XDG_CONFIG_HOME={caddy_dir}/config
ExecStart=/usr/local/bin/caddy run --config {config}
ExecReload=/usr/local/bin/caddy reload --config {config}
Restart=on-failure
RestartSec=5
TimeoutStopSec=10
UMask=0077
NoNewPrivileges=true

[Install]
WantedBy=default.target
'''
for name, contents in [('edu-campus.service', api_service), ('edu-campus-caddy.service', caddy_service)]:
    (prepared / ('user-' + name)).write_text(contents)
    (units / name).write_text(contents)
subprocess.run(['systemctl', '--user', 'daemon-reload'], check=True)
subprocess.run(['systemctl', '--user', 'enable', '--now', 'edu-campus.service', 'edu-campus-caddy.service'], check=True)
subprocess.run(['systemctl', '--user', 'restart', 'edu-campus.service', 'edu-campus-caddy.service'], check=True)
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
for attempt in range(30):
    try:
        with opener.open('http://127.0.0.1:4300/api/health', timeout=2) as response:
            assert response.status == 200
        break
    except Exception:
        if attempt == 29:
            raise
        time.sleep(1)
ca = caddy_dir / 'data/caddy/pki/authorities/local/root.crt'
for attempt in range(20):
    if ca.exists():
        break
    time.sleep(1)
exported = prepared / 'edu-campus-root.crt'
exported.write_bytes(ca.read_bytes())
exported.chmod(0o644)
subprocess.run(['systemctl', '--user', '--no-pager', '--full', 'status', 'edu-campus.service', 'edu-campus-caddy.service'], check=True)
subprocess.run(['loginctl', 'show-user', str(os.getuid()), '-p', 'Linger'], check=True)
print(f'Running at {origin}\nClient trust certificate: {exported}')
