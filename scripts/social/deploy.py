#!/usr/bin/env python3
"""Deploy the posting Worker (services/workers/social/) through Cloudflare's API.

    make social-deploy           # create or update everything, idempotent
    make social-status           # what's queued, what's been sent
    make social-run              # run today's batch now instead of waiting for the cron
    make social-test             # email a sample of the first queued post; marks nothing sent

No wrangler and no Node: the site stays Node-free, so this talks to the API
directly. It needs a Cloudflare API token in .env (CLOUDFLARE_API_TOKEN=,
made from the "Edit Cloudflare Workers" template) and reads the dev.to key
from .env (DEVTO_API_KEY=). It creates the RUN_KEY that guards /run and
/status the first time and saves it to .env as SOCIAL_RUN_KEY.

What it sets up, in order:
  1. the SOCIAL KV namespace, if it doesn't exist
  2. the script, with its bindings (KV, send_email to Konrad, plain vars)
  3. the secrets (DEVTO_API_KEY, RUN_KEY)
  4. the daily cron (CRON, UTC)
  5. the workers.dev URL, which the emails link to
"""
from __future__ import annotations

import json
import secrets
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / ".env"
WORKER = ROOT / "services" / "workers" / "social" / "worker.js"
ACCOUNT_ID = "52489324f1be9a4e61990935a4f3ebd2"
SCRIPT = "wrightfunctions-social"
KV_TITLE = "wrightfunctions-social"
API = "https://api.cloudflare.com/client/v4"
QUEUE_URL = "https://wrightfunctions.com/social/queue.json"
MAIL_FROM = "social@wrightfunctions.com"
MAIL_TO = "konradwright@protonmail.com"  # a verified Email Routing destination
CRON = "17 15 * * *"  # 15:17 UTC: 8:17 a.m. Pacific in summer, 7:17 in winter
COMPAT_DATE = "2025-01-15"
UA = "wrightfunctions-social-deploy/1.0 (+https://wrightfunctions.com)"


def die(msg: str) -> None:
    sys.exit(f"social-deploy: {msg}")


def env_value(name: str) -> str:
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.strip().removeprefix("export ").partition("=")
            if sep and key.strip() == name:
                return value.strip().strip('"').strip("'")
    return ""


def require(name: str, hint: str) -> str:
    value = env_value(name)
    if not value:
        die(f"no {name} in .env. {hint}")
    return value


def call(method: str, path: str, token: str, body=None, content_type="application/json", raw: bytes | None = None) -> dict:
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": content_type, "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            out = json.load(res)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:600]
        die(f"{method} {path}: HTTP {e.code}: {detail}")
    if not out.get("success", False):
        die(f"{method} {path}: {json.dumps(out.get('errors'))[:600]}")
    return out


def kv_namespace(token: str) -> str:
    listed = call("GET", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces?per_page=100", token)
    for ns in listed["result"]:
        if ns["title"] == KV_TITLE:
            return ns["id"]
    made = call("POST", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces", token, {"title": KV_TITLE})
    print(f"  made KV namespace {KV_TITLE}")
    return made["result"]["id"]


def workers_dev_url(token: str) -> str:
    sub = call("GET", f"/accounts/{ACCOUNT_ID}/workers/subdomain", token)["result"]["subdomain"]
    return f"https://{SCRIPT}.{sub}.workers.dev"


def upload(token: str, kv_id: str, page_base: str) -> None:
    metadata = {
        "main_module": "worker.js",
        "compatibility_date": COMPAT_DATE,
        "bindings": [
            {"type": "kv_namespace", "name": "SOCIAL", "namespace_id": kv_id},
            {"type": "send_email", "name": "MAILER", "destination_address": MAIL_TO},
            {"type": "plain_text", "name": "QUEUE_URL", "text": QUEUE_URL},
            {"type": "plain_text", "name": "MAIL_FROM", "text": MAIL_FROM},
            {"type": "plain_text", "name": "MAIL_TO", "text": MAIL_TO},
            {"type": "plain_text", "name": "PAGE_BASE", "text": page_base},
        ],
        "keep_bindings": ["secret_text"],
    }
    boundary = f"----wf{uuid.uuid4().hex}"
    parts = [
        (f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"; filename="metadata.json"\r\n'
         f"Content-Type: application/json\r\n\r\n").encode() + json.dumps(metadata).encode() + b"\r\n",
        (f'--{boundary}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n'
         f"Content-Type: application/javascript+module\r\n\r\n").encode() + WORKER.read_bytes() + b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ]
    call("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT}", token,
         content_type=f"multipart/form-data; boundary={boundary}", raw=b"".join(parts))
    print(f"  uploaded {SCRIPT}")


def put_secret(token: str, name: str, value: str) -> None:
    call("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT}/secrets", token,
         {"name": name, "text": value, "type": "secret_text"})
    print(f"  set secret {name}")


def run_key() -> str:
    key = env_value("SOCIAL_RUN_KEY")
    if key:
        return key
    key = secrets.token_urlsafe(24)
    with ENV_FILE.open("a", encoding="utf-8") as f:
        f.write(f"\n# Guards /run and /status on the posting Worker (scripts/social/deploy.py)\nSOCIAL_RUN_KEY={key}\n")
    print("  made SOCIAL_RUN_KEY and saved it to .env")
    return key


def deploy() -> None:
    token = require("CLOUDFLARE_API_TOKEN", "Make one from the 'Edit Cloudflare Workers' template.")
    devto = require("DEVTO_API_KEY", "Make one at dev.to/settings/extensions.")
    print(f"Deploying {SCRIPT}:")
    kv_id = kv_namespace(token)
    page_base = workers_dev_url(token)
    upload(token, kv_id, page_base)
    put_secret(token, "DEVTO_API_KEY", devto)
    put_secret(token, "RUN_KEY", run_key())
    call("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT}/schedules", token, [{"cron": CRON}])
    print(f"  cron {CRON} (UTC)")
    call("POST", f"/accounts/{ACCOUNT_ID}/workers/scripts/{SCRIPT}/subdomain", token, {"enabled": True, "previews_enabled": False})
    print(f"  live at {page_base}")


def poke(path: str) -> None:
    token = require("CLOUDFLARE_API_TOKEN", "Make one from the 'Edit Cloudflare Workers' template.")
    url = f"{workers_dev_url(token)}{path}?key={require('SOCIAL_RUN_KEY', 'Run make social-deploy first.')}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as res:
        print(json.dumps(json.load(res), indent=1))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "deploy"
    {"deploy": deploy, "status": lambda: poke("/status"), "run": lambda: poke("/run"), "test": lambda: poke("/test")}.get(cmd, lambda: die(f"unknown command {cmd}"))()
