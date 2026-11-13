#!/usr/bin/env python3
"""Deploy the posting Worker (services/workers/social/) through Cloudflare's API.

    make social-deploy           # create or update everything, idempotent
    make social-status           # what's queued, what's been sent
    make social-run              # run today's batch now instead of waiting for the cron
    make social-test             # email a sample of the first queued post; marks nothing sent

The API calls live in scripts/cloudflare/workers_api.py. This needs
CLOUDFLARE_API_TOKEN in .env and reads the dev.to key from .env
(DEVTO_API_KEY=). It creates the RUN_KEY that guards /run and /status the
first time and saves it to .env as SOCIAL_RUN_KEY.

What it sets up, in order:
  1. the SOCIAL KV namespace, if it doesn't exist
  2. the script, with its bindings (KV, send_email to Konrad, plain vars)
  3. the secrets (DEVTO_API_KEY, RUN_KEY)
  4. the daily cron (CRON, UTC)
  5. the workers.dev URL, which the emails link to
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "cloudflare"))
import workers_api as cf  # noqa: E402

WORKER = cf.ROOT / "services" / "workers" / "social" / "worker.js"
SCRIPT = "wrightfunctions-social"
KV_TITLE = "wrightfunctions-social"
QUEUE_URL = "https://wrightfunctions.com/social/queue.json"
MAIL_FROM = "social@wrightfunctions.com"
CRON = "17 15 * * *"  # 15:17 UTC: 8:17 a.m. Pacific in summer, 7:17 in winter
RUN_KEY_ENV = "SOCIAL_RUN_KEY"


def deploy() -> None:
    token = cf.token()
    devto = cf.require("DEVTO_API_KEY", "Make one at dev.to/settings/extensions.")
    print(f"Deploying {SCRIPT}:")
    kv_id = cf.kv_namespace(token, KV_TITLE)
    page_base = cf.workers_dev_url(token, SCRIPT)
    cf.upload(token, SCRIPT, WORKER, [
        {"type": "kv_namespace", "name": "SOCIAL", "namespace_id": kv_id},
        {"type": "send_email", "name": "MAILER", "destination_address": cf.MAIL_TO},
        {"type": "plain_text", "name": "QUEUE_URL", "text": QUEUE_URL},
        {"type": "plain_text", "name": "MAIL_FROM", "text": MAIL_FROM},
        {"type": "plain_text", "name": "MAIL_TO", "text": cf.MAIL_TO},
        {"type": "plain_text", "name": "PAGE_BASE", "text": page_base},
    ])
    cf.put_secret(token, SCRIPT, "DEVTO_API_KEY", devto)
    cf.put_secret(token, SCRIPT, "RUN_KEY", cf.run_key(RUN_KEY_ENV, "Guards /run and /status on the posting Worker (scripts/social/deploy.py)"))
    cf.set_cron(token, SCRIPT, CRON)
    cf.enable_workers_dev(token, SCRIPT)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "deploy"
    commands = {
        "deploy": deploy,
        "status": lambda: cf.poke(SCRIPT, RUN_KEY_ENV, "/status"),
        "run": lambda: cf.poke(SCRIPT, RUN_KEY_ENV, "/run"),
        "test": lambda: cf.poke(SCRIPT, RUN_KEY_ENV, "/test"),
    }
    commands.get(cmd, lambda: cf.die(f"unknown command {cmd}"))()
