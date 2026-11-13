"""Cloudflare API calls shared by the Worker deploy scripts
(scripts/social/deploy.py, scripts/stock-watch/deploy.py).

No wrangler and no Node: the site stays Node-free, so the deploys talk to the
API directly. They need a Cloudflare API token in .env (CLOUDFLARE_API_TOKEN=,
made from the "Edit Cloudflare Workers" template).

A deploy script imports this by putting scripts/cloudflare/ on sys.path.
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
WORKERS_DIR = ROOT / "services" / "workers"
ACCOUNT_ID = "52489324f1be9a4e61990935a4f3ebd2"
API = "https://api.cloudflare.com/client/v4"
MAIL_TO = "konradwright@protonmail.com"  # a verified Email Routing destination
COMPAT_DATE = "2025-01-15"
UA = "wrightfunctions-deploy/1.0 (+https://wrightfunctions.com)"
TOKEN_HINT = "Make one from the 'Edit Cloudflare Workers' template."


def die(msg: str) -> None:
    # Named after the calling script's folder: "social-deploy: …".
    sys.exit(f"{Path(sys.argv[0]).resolve().parent.name}-deploy: {msg}")


def env_value(name: str) -> str:
    """A NAME=value line in .env. Allows `export `, quotes and a trailing # comment."""
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.strip().removeprefix("export ").partition("=")
            if sep and key.strip() == name:
                value = value.strip()
                if value[:1] in "\"'" and value[:1] and value.count(value[0]) >= 2:
                    return value[1:value.index(value[0], 1)]
                return value.split(" #")[0].strip()
    return ""


def require(name: str, hint: str) -> str:
    value = env_value(name)
    if not value:
        die(f"no {name} in .env. {hint}")
    return value


def token() -> str:
    return require("CLOUDFLARE_API_TOKEN", TOKEN_HINT)


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


def kv_namespace(token: str, title: str) -> str:
    listed = call("GET", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces?per_page=100", token)
    for ns in listed["result"]:
        if ns["title"] == title:
            return ns["id"]
    made = call("POST", f"/accounts/{ACCOUNT_ID}/storage/kv/namespaces", token, {"title": title})
    print(f"  made KV namespace {title}")
    return made["result"]["id"]


def workers_dev_url(token: str, script: str) -> str:
    sub = call("GET", f"/accounts/{ACCOUNT_ID}/workers/subdomain", token)["result"]["subdomain"]
    return f"https://{script}.{sub}.workers.dev"


def upload(token: str, script: str, worker: Path, bindings: list[dict]) -> None:
    """Upload worker plus services/workers/shared/*.js, each named by its path
    under services/workers/ ("social/worker.js", "shared/mail.js"), so the
    Workers' relative imports resolve on Cloudflare as they do in the repo."""
    modules = [worker, *sorted(WORKERS_DIR.joinpath("shared").glob("*.js"))]
    names = [m.relative_to(WORKERS_DIR).as_posix() for m in modules]
    metadata = {
        "main_module": names[0],
        "compatibility_date": COMPAT_DATE,
        "bindings": bindings,
        "keep_bindings": ["secret_text"],
        # Workers Logs, so a failed cron run (it has no one to tell) leaves a trace.
        "observability": {"enabled": True},
    }
    boundary = f"----wf{uuid.uuid4().hex}"
    parts = [
        (f'--{boundary}\r\nContent-Disposition: form-data; name="metadata"; filename="metadata.json"\r\n'
         f"Content-Type: application/json\r\n\r\n").encode() + json.dumps(metadata).encode() + b"\r\n",
        *[(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{name}"\r\n'
           f"Content-Type: application/javascript+module\r\n\r\n").encode() + module.read_bytes() + b"\r\n"
          for name, module in zip(names, modules)],
        f"--{boundary}--\r\n".encode(),
    ]
    call("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{script}", token,
         content_type=f"multipart/form-data; boundary={boundary}", raw=b"".join(parts))
    print(f"  uploaded {script}")


def put_secret(token: str, script: str, name: str, value: str) -> None:
    call("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{script}/secrets", token,
         {"name": name, "text": value, "type": "secret_text"})
    print(f"  set secret {name}")


def set_cron(token: str, script: str, cron: str) -> None:
    call("PUT", f"/accounts/{ACCOUNT_ID}/workers/scripts/{script}/schedules", token, [{"cron": cron}])
    print(f"  cron {cron} (UTC)")


def enable_workers_dev(token: str, script: str) -> str:
    call("POST", f"/accounts/{ACCOUNT_ID}/workers/scripts/{script}/subdomain", token,
         {"enabled": True, "previews_enabled": False})
    url = workers_dev_url(token, script)
    print(f"  live at {url}")
    return url


def run_key(env_name: str, guards: str) -> str:
    """The key in .env under env_name, made and saved the first time."""
    key = env_value(env_name)
    if key:
        return key
    key = secrets.token_urlsafe(24)
    with ENV_FILE.open("a", encoding="utf-8") as f:
        f.write(f"\n# {guards}\n{env_name}={key}\n")
    print(f"  made {env_name} and saved it to .env")
    return key


def poke(script: str, key_env: str, path: str) -> None:
    """GET a guarded endpoint on the Worker and print its JSON."""
    key = require(key_env, "Deploy the Worker first.")
    req = urllib.request.Request(f"{workers_dev_url(token(), script)}{path}",
                                 headers={"User-Agent": UA, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=120) as res:
        print(json.dumps(json.load(res), indent=1))
