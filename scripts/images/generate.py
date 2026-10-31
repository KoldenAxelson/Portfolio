#!/usr/bin/env python3
"""Pay-per-use images for the site: art from a hosted model, then the cover
and the share card made from it. No subscription; each image costs cents.

    make image-quote SLUG=model-routing PROMPT="..."        # price only, spends nothing
    make image SLUG=model-routing PROMPT="..."              # generate the art
    make cover SLUG=model-routing                           # cover + share card from the art

Three steps, three subcommands:

  art    Sends PROMPT to the model and saves private/images/art/<slug>.png.
         Without --go it only prints the price. With --go it checks the price
         against the month's budget (IMAGE_BUDGET_USD, default 5), spends, and
         logs the job to private/images/ledger.csv.
  cover  From that art, writes the square cover (assets/img/covers/<slug>.webp
         and static/img/covers/<slug>.webp, 512px) and the 1200x630 share card
         (static/img/share/<slug>.jpg) with the article's title set in Inter.
         The model never draws the title: image models still garble letters.
  spent  Prints this month's total and the last few jobs.

The provider is fal.ai (one API, every major image model, pay per image). The
key comes from $FAL_KEY, else a FAL_KEY= line in the repo's .env. PRICES are
fal's published per-image prices, checked on the date beside them; a model
not in the table is refused, so a price is never guessed.

Runs where Pillow is installed (the agents' Linux box has it; on a Mac,
`python3 -m pip install pillow`). The art step needs only the standard library.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / ".env"
KEY_NAME = "FAL_KEY"
ART_DIR = ROOT / "private" / "images" / "art"
LEDGER = ROOT / "private" / "images" / "ledger.csv"
ARTICLES = ROOT / "content" / "articles"
COVER_DIRS = [ROOT / "assets" / "img" / "covers", ROOT / "static" / "img" / "covers"]
SHARE_DIR = ROOT / "static" / "img" / "share"
FONT_SANS = ROOT / "static" / "fonts" / "InterVariable.woff2"
FONT_MONO = ROOT / "static" / "fonts" / "JetBrainsMono-Variable.woff2"
QUEUE_HOST = "https://queue.fal.run"
USER_AGENT = "wrightfunctions-images/1.0 (+https://wrightfunctions.com)"
DEFAULT_BUDGET_USD = 5.0
POLL_EVERY_S = 2
TIMEOUT_S = 240

# model id on fal -> (USD per image at 1K, date the price was checked).
# Re-check fal.ai/pricing before adding a model or trusting an old date.
PRICES = {
    "fal-ai/nano-banana-2": (0.08, "2026-10-30"),
    "fal-ai/flux/schnell": (0.003, "2026-10-30"),  # per megapixel; a 1K image is about one
}
# Each model's own way of asking for a 16:9 image (the cover and card crops
# assume it). schnell has no aspect_ratio; it takes a named image_size.
MODEL_INPUTS = {
    "fal-ai/nano-banana-2": {"aspect_ratio": "16:9", "resolution": "1K", "output_format": "png"},
    "fal-ai/flux/schnell": {"image_size": "landscape_16_9", "output_format": "png"},
}
POLL_RETRIES = 5
DEFAULT_MODEL = "fal-ai/nano-banana-2"

# The site's house style for article art, so the covers read as one series.
# The prompt for each article supplies only the subject.
HOUSE_STYLE = (
    "Editorial illustration for a technical article. Flat shapes with a soft "
    "risograph print texture, limited palette of deep forest green (#037737), "
    "warm cream, charcoal and one muted accent. Calm, clever, a little playful. "
    "Wide composition with the subject in the right two thirds and quiet space "
    "on the left. No text, no letters, no numbers, no logos, no watermarks."
)

GREEN = (3, 119, 55)
CREAM = (250, 247, 240)
SHARE_SIZE = (1200, 630)
COVER_PX = 512


def die(msg: str) -> None:
    sys.exit(f"images: {msg}")


def env_value(name: str) -> str:
    """$NAME, else a NAME=value line in .env (`export `, quotes and a trailing # comment allowed)."""
    if os.environ.get(name, "").strip():
        return os.environ[name].strip()
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.strip().removeprefix("export ").partition("=")
            if sep and key.strip() == name:
                value = value.strip()
                if value[:1] in "\"'" and value[:1] and value.count(value[0]) >= 2:
                    return value[1:value.index(value[0], 1)]
                return value.split(" #")[0].strip()
    return ""


def read_key() -> str:
    key = env_value(KEY_NAME)
    if not key:
        die(f"no API key. Put a {KEY_NAME}= line in .env (fal.ai > Dashboard > Keys).")
    return key


def budget() -> float:
    raw = env_value("IMAGE_BUDGET_USD")
    try:
        return float(raw) if raw else DEFAULT_BUDGET_USD
    except ValueError:
        die(f"IMAGE_BUDGET_USD isn't a number: {raw!r}")
        return 0.0


def ledger_rows() -> list[dict]:
    if not LEDGER.exists():
        return []
    with LEDGER.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def spent_this_month() -> float:
    month = dt.date.today().strftime("%Y-%m")
    return sum(float(r["usd"]) for r in ledger_rows() if r["date"].startswith(month))


def log_job(slug: str, model: str, usd: float, prompt: str, out: Path, request_id: str) -> None:
    """Logged the moment fal accepts the job, since that's when it's charged,
    so a timeout or failed download still counts against the budget."""
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    new = not LEDGER.exists()
    with LEDGER.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["date", "slug", "model", "usd", "file", "prompt", "request_id"])
        w.writerow([dt.datetime.now().isoformat(timespec="seconds"), slug, model, f"{usd:.3f}",
                    out.relative_to(ROOT), prompt, request_id])


def request(url: str, key: str, body: dict | None = None, quiet: bool = False) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method="POST" if body is not None else "GET", headers={
        "Authorization": f"Key {key}", "Content-Type": "application/json",
        "Accept": "application/json", "User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.load(res)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:400]
        if quiet:
            raise RuntimeError(f"fal.ai answered {e.code}: {detail}") from e
        die(f"fal.ai answered {e.code}: {detail}")
    except urllib.error.URLError as e:
        if quiet:
            raise RuntimeError(f"couldn't reach fal.ai: {e.reason}") from e
        die(f"couldn't reach fal.ai: {e.reason}")
    return {}


def submit(model: str, prompt: str, key: str) -> dict:
    """Submit to fal's queue; returns the job (request_id, status_url, response_url)."""
    job = request(f"{QUEUE_HOST}/{model}", key, {"prompt": prompt, "num_images": 1, **MODEL_INPUTS[model]})
    if not job.get("status_url") or not job.get("response_url"):
        die(f"unexpected submit response: {json.dumps(job)[:300]}")
    return job


def wait_for(job: dict, key: str) -> str:
    """Poll until fal says COMPLETED, riding out a few transient errors; return the image URL."""
    deadline = time.time() + TIMEOUT_S
    errors = 0
    while True:
        try:
            status = request(job["status_url"], key, quiet=True)
        except RuntimeError as e:
            errors += 1
            if errors > POLL_RETRIES:
                die(f"{e}; the job ({job['request_id']}) is logged and may still finish: {job['response_url']}")
            time.sleep(POLL_EVERY_S * errors)
            continue
        if status.get("status") == "COMPLETED":
            if status.get("error"):
                die(f"fal reported the job failed: {status['error']}")
            break
        if time.time() > deadline:
            die(f"timed out after {TIMEOUT_S}s; the job is logged and may still finish: {job['response_url']}")
        time.sleep(POLL_EVERY_S)
    result = request(job["response_url"], key)
    images = result.get("images") or []
    if not images or not images[0].get("url"):
        die(f"no image in the result (a failed job also reports COMPLETED): {json.dumps(result)[:300]}")
    return images[0]["url"]


def download(url: str, out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as res:
        out.write_bytes(res.read())


def cmd_art(args: argparse.Namespace) -> None:
    if args.model not in PRICES:
        die(f"{args.model} has no checked price. Look it up on fal.ai/pricing and add it to PRICES.")
    usd, checked = PRICES[args.model]
    prompt = f"{args.prompt.strip()} {HOUSE_STYLE}" if not args.raw else args.prompt.strip()
    out = ART_DIR / f"{args.slug}.png"
    already = spent_this_month()
    cap = budget()
    print(f"{args.model}: ${usd:.3f} an image (price checked {checked}).")
    print(f"This month: ${already:.2f} spent of ${cap:.2f}.")
    if not args.go:
        print("Quote only. Add --go to generate.")
        return
    if already + usd > cap:
        die(f"that would take this month to ${already + usd:.2f}, over the ${cap:.2f} budget. "
            "Stop and ask Konrad; only he changes IMAGE_BUDGET_USD.")
    key = read_key()
    job = submit(args.model, prompt, key)
    log_job(args.slug, args.model, usd, prompt, out, job.get("request_id", ""))
    url = wait_for(job, key)
    download(url, out)
    print(f"Saved {out.relative_to(ROOT)}. Month total ${already + usd:.2f}.")


def front_matter_title(slug: str) -> str:
    path = ARTICLES / f"{slug}.md"
    if not path.exists():
        die(f"no article at {path.relative_to(ROOT)}")
    m = re.search(r"^title:\s*(['\"])(.*?)\1\s*$", path.read_text(encoding="utf-8"), re.M)
    if not m:
        die(f"couldn't read a quoted title: in {path.name}")
    return m.group(2).replace("''", "'")


def font(path: Path, size: int, weight: int):
    from PIL import ImageFont
    f = ImageFont.truetype(str(path), size)
    axes = [a["name"] for a in f.get_variation_axes()]
    f.set_variation_by_axes([weight if name == b"Weight" else a["maximum"] if name == b"Optical size" else a["default"]
                             for name, a in zip(axes, f.get_variation_axes())])
    return f


def wrap(draw, text: str, fnt, width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= width or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def cmd_cover(args: argparse.Namespace) -> None:
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        die("Pillow isn't installed here: python3 -m pip install pillow")
    art_path = ART_DIR / f"{args.slug}.png"
    if not art_path.exists():
        die(f"no art yet at {art_path.relative_to(ROOT)}; run the art step first")
    art = Image.open(art_path).convert("RGB")
    title = args.title or front_matter_title(args.slug)

    # Square cover: the right-hand part of the art, where the house style
    # puts the subject.
    w, h = art.size
    side = min(w, h)
    left = max(0, int(w * 0.62) - side // 2)
    left = min(left, w - side)
    cover = art.crop((left, (h - side) // 2, left + side, (h - side) // 2 + side)).resize((COVER_PX, COVER_PX), Image.LANCZOS)
    for d in COVER_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        cover.save(d / f"{args.slug}.webp", "WEBP", quality=84)

    # Share card: the art filling 1200x630, a cream panel on the left with
    # the title, the domain under it, and the site's green as a rule.
    sw, sh = SHARE_SIZE
    scale = max(sw / w, sh / h)
    bg = art.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    bg = bg.crop(((bg.width - sw) // 2, (bg.height - sh) // 2, (bg.width - sw) // 2 + sw, (bg.height - sh) // 2 + sh))
    card = bg.copy()
    panel_w = 560
    panel = Image.new("RGB", (panel_w, sh), CREAM)
    card.paste(panel, (0, 0))
    draw = ImageDraw.Draw(card)
    draw.rectangle([panel_w, 0, panel_w + 8, sh], fill=GREEN)
    pad = 64
    size = 60
    while True:
        tf = font(FONT_SANS, size, 750)
        lines = wrap(draw, title, tf, panel_w - pad * 2)
        if len(lines) <= 4 or size <= 40:
            break
        size -= 4
    line_h = int(size * 1.15)
    block = line_h * len(lines)
    y = (sh - block) // 2 - 20
    draw.rectangle([pad, y - 36, pad + 56, y - 30], fill=GREEN)
    for line in lines:
        draw.text((pad, y), line, font=tf, fill=(24, 24, 24))
        y += line_h
    draw.text((pad, sh - pad - 22), "wrightfunctions.com", font=font(FONT_MONO, 22, 500), fill=GREEN)
    SHARE_DIR.mkdir(parents=True, exist_ok=True)
    share = SHARE_DIR / f"{args.slug}.jpg"
    card.save(share, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"Cover: {', '.join(str((d / (args.slug + '.webp')).relative_to(ROOT)) for d in COVER_DIRS)}")
    print(f"Share card: {share.relative_to(ROOT)}")
    print("Front matter for the article:")
    print(f"  cover: '/covers/{args.slug}.webp'")
    print(f"  image: '/share/{args.slug}.jpg'")


def cmd_spent(_: argparse.Namespace) -> None:
    rows = ledger_rows()
    print(f"This month: ${spent_this_month():.2f} of ${budget():.2f}.")
    for r in rows[-5:]:
        print(f"  {r['date']}  {r['slug']:<28} {r['model']:<24} ${float(r['usd']):.3f}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("art", help="generate the art for one slug")
    a.add_argument("--slug", required=True)
    a.add_argument("--prompt", required=True, help="the subject; the house style is added unless --raw")
    a.add_argument("--model", default=DEFAULT_MODEL)
    a.add_argument("--raw", action="store_true", help="send the prompt as-is, without the house style")
    a.add_argument("--go", action="store_true", help="spend; without it, only quote")
    a.set_defaults(func=cmd_art)
    c = sub.add_parser("cover", help="cover and share card from the art")
    c.add_argument("--slug", required=True)
    c.add_argument("--title", help="defaults to the article's front-matter title")
    c.set_defaults(func=cmd_cover)
    s = sub.add_parser("spent", help="this month's spend and the last jobs")
    s.set_defaults(func=cmd_spent)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
