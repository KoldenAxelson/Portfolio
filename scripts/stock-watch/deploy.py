#!/usr/bin/env python3
"""Deploy the restock alerts Worker (services/workers/stock-watch/) through
Cloudflare's API.

    make stock-deploy    # create or update everything, idempotent
    make stock-status    # each watched product's stock right now, and whether it was emailed
    make stock-run       # run the check now instead of waiting for the cron
    make stock-test      # email what a restock looks like, for the first product; records nothing

The watch list is every Tech Watch entry in data/tech-watch/items.yaml with a
`restock:` field naming how to check it (only "shopify" so far, see CHECKS in
the Worker). Redeploy after changing that field. The API calls live in
scripts/cloudflare/workers_api.py; this needs CLOUDFLARE_API_TOKEN in .env and
saves the key that guards the Worker's endpoints to .env as STOCK_RUN_KEY.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "cloudflare"))
import workers_api as cf  # noqa: E402

WORKER = cf.ROOT / "services" / "workers" / "stock-watch" / "worker.js"
TECH_WATCH = cf.ROOT / "data" / "tech-watch" / "items.yaml"
SCRIPT = "wrightfunctions-stock-watch"
KV_TITLE = "wrightfunctions-stock-watch"
MAIL_FROM = "stock@wrightfunctions.com"
CRON = "*/15 * * * *"
RUN_KEY_ENV = "STOCK_RUN_KEY"


def slug(name: str) -> str:
    # The same id the Tech Watch screenshots use (Hugo's urlize of the name).
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def watched() -> list[dict]:
    items = yaml.safe_load(TECH_WATCH.read_text(encoding="utf-8"))
    return [{"id": slug(item["name"]), "name": item["name"], "url": item["url"], "check": item["restock"]}
            for item in items if item.get("restock")]


def deploy() -> None:
    token = cf.token()
    products = watched()
    if not products:
        cf.die(f"nothing to watch: no entry in {TECH_WATCH.relative_to(cf.ROOT)} has a restock: field")
    print(f"Deploying {SCRIPT}, watching {', '.join(p['name'] for p in products)}:")
    kv_id = cf.kv_namespace(token, KV_TITLE)
    cf.upload(token, SCRIPT, WORKER, [
        {"type": "kv_namespace", "name": "STOCK", "namespace_id": kv_id},
        {"type": "send_email", "name": "MAILER", "destination_address": cf.MAIL_TO},
        {"type": "plain_text", "name": "PRODUCTS", "text": json.dumps(products)},
        {"type": "plain_text", "name": "MAIL_FROM", "text": MAIL_FROM},
        {"type": "plain_text", "name": "MAIL_TO", "text": cf.MAIL_TO},
    ])
    cf.put_secret(token, SCRIPT, "RUN_KEY", cf.run_key(RUN_KEY_ENV, "Guards /run, /status and /test on the stock-watch Worker (scripts/stock-watch/deploy.py)"))
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
