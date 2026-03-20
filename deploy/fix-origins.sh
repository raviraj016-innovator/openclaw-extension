#!/bin/bash
cd /home/ubuntu/.openclaw
python3 -c "
import json
with open('openclaw.json') as f:
    c = json.load(f)
c.setdefault('gateway', {}).setdefault('controlUi', {})['allowedOrigins'] = [
    'http://localhost:18789',
    'http://127.0.0.1:18789',
    'http://184.72.237.118:18789',
    'https://claw.raviraj.lol'
]
with open('openclaw.json', 'w') as f:
    json.dump(c, f, indent=2)
print('Origins updated')
"
chown ubuntu:ubuntu openclaw.json
sudo -u ubuntu pm2 restart openclaw-agent
sleep 3
echo DONE
