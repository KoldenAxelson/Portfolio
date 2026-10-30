#!/usr/bin/env python3
"""Fetch the YouTube transcripts queued in private/ideas/misc/script-queue.csv.

Run by `make transcripts`. For every queued video it asks youtube-transcript.io
for the transcript and saves it as private/ideas/misc/videos/<name>.txt in the
house format (first line the youtu.be URL, a blank line, then the text; see
private/skills/VideoNotesPageMake.md, "Sources"). Then it writes
private/ideas/misc/digest-prompt.md for the agent that turns the new transcripts
into pages (adding to it if the last one hasn't been digested yet, and copying
it to the clipboard on a Mac), and empties the queue of every row it saved. Rows that failed stay
queued with the reason printed.

Queue columns (header row required):
    url   any YouTube link or a bare 11-character video id
    name  optional file name without .txt; blank means one is made from the title
    note  optional, where it should go ("Get Moving page"), copied into the prompt

The API token comes from $YT_TRANSCRIPT_TOKEN, else from a YT_TRANSCRIPT_TOKEN=
line in the repo's .env, else from the first line of
private/youtube-transcript-token. Both files are gitignored.

    python3 scripts/writing/fetch-transcripts.py            fetch, prompt, clear
    python3 scripts/writing/fetch-transcripts.py --dry-run  parse the queue, touch nothing
"""
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QUEUE = ROOT / "private/ideas/misc/script-queue.csv"
VIDEOS = ROOT / "private/ideas/misc/videos"
PROMPT = ROOT / "private/ideas/misc/digest-prompt.md"
TOKEN_FILE = ROOT / "private/youtube-transcript-token"
ENV_FILE = ROOT / ".env"
TOKEN_KEY = "YT_TRANSCRIPT_TOKEN"

API_URL = "https://www.youtube-transcript.io/api/transcripts"
MAX_IDS_PER_REQUEST = 50          # the API's documented cap
REQUEST_GAP_SECONDS = 2.1         # documented limit: 5 requests per 10 seconds
MAX_RETRIES = 4
FIELDS = ["url", "name", "note"]
# Names this script plainly; Python's default agent string gets a Cloudflare 1010.
USER_AGENT = "wrightfunctions-transcripts/1.0 (+https://wrightfunctions.com)"
VIDEO_ID = re.compile(r"(?:v=|youtu\.be/|shorts/|embed/|live/)([A-Za-z0-9_-]{11})|^([A-Za-z0-9_-]{11})$")
NAME_WORDS = 7


def video_id(url):
    match = VIDEO_ID.search(url.strip())
    if not match:
        return None
    return match.group(1) or match.group(2)


def name_from_title(title):
    """'How to force passion (no BS)' -> 'How_to_force_passion_no_BS', matching the existing files."""
    words = re.findall(r"[A-Za-z0-9]+", title)
    return "_".join(words[:NAME_WORDS]) or None


def token_from_env_file():
    """A KEY=value line in .env; quotes and an `export ` prefix are allowed."""
    if not ENV_FILE.exists():
        return ""
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        key, sep, value = line.strip().removeprefix("export ").partition("=")
        if sep and key.strip() == TOKEN_KEY:
            return value.strip().strip('"').strip("'")
    return ""


def read_token():
    token = os.environ.get(TOKEN_KEY, "").strip() or token_from_env_file()
    if token:
        return token
    if TOKEN_FILE.exists():
        return TOKEN_FILE.read_text().strip().splitlines()[0].strip()
    sys.exit(f"No API token. Set {TOKEN_KEY} in the environment or .env, or put it in {TOKEN_FILE.relative_to(ROOT)}.")


def read_queue():
    if not QUEUE.exists():
        sys.exit(f"No queue at {QUEUE.relative_to(ROOT)}.")
    with QUEUE.open(newline="", encoding="utf-8") as handle:
        rows = [row for row in csv.DictReader(handle) if (row.get("url") or "").strip()]
    return [{field: (row.get(field) or "").strip() for field in FIELDS} for row in rows]


def write_queue(rows):
    with QUEUE.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def post(ids, token):
    body = json.dumps({"ids": ids}).encode()
    request = urllib.request.Request(API_URL, data=body, method="POST", headers={
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    })
    for attempt in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 429 or attempt == MAX_RETRIES - 1:
                detail = error.read().decode(errors="replace")[:300]
                sys.exit(f"API error {error.code}: {detail}")
            time.sleep(float(error.headers.get("Retry-After") or 10))
    return []


def entries_by_id(payload):
    """The response is a list of per-video objects; accept a {"data": [...]} wrapper too."""
    if isinstance(payload, dict):
        payload = payload.get("data") or payload.get("results") or list(payload.values())
    return {entry.get("id"): entry for entry in payload if isinstance(entry, dict) and entry.get("id")}


def title_of(entry):
    if entry.get("title"):
        return entry["title"]
    micro = (entry.get("microformat") or {}).get("playerMicroformatRenderer") or {}
    return (micro.get("title") or {}).get("simpleText", "")


def text_of(entry):
    """Prefer the API's full-text field; otherwise join the first track's segments."""
    if isinstance(entry.get("text"), str) and entry["text"].strip():
        return entry["text"]
    for track in entry.get("tracks") or []:
        segments = track.get("transcript") or []
        joined = " ".join((segment.get("text") or "").strip() for segment in segments)
        if joined.strip():
            return joined
    return ""


def tidy(text):
    return re.sub(r"\s+", " ", text.replace("​", "")).strip()


def save(vid, name, text):
    path = VIDEOS / f"{name}.txt"
    path.write_text(f"https://youtu.be/{vid}\n\n{tidy(text)}\n", encoding="utf-8")
    return path


def write_prompt(saved):
    """Start the prompt, or add rows to one the agent hasn't digested and deleted yet."""
    if not PROMPT.exists():
        PROMPT.write_text("\n".join([
            "# Digest these transcripts",
            "",
            "New YouTube transcripts were fetched into `private/ideas/misc/videos/`.",
            "Read `AGENTS.md`, then `private/skills/VideoNotesPageMake.md` and the skills it",
            "names (ArticlePageMake, HumanizeWriting, CodeStandards, FileStructure).",
            "Group the videos by topic and fold each into the page it belongs on, or",
            "propose a new page if none fits; where a note gives a destination, use it.",
            "Add a reference card per video, and ask before anything you're unsure of.",
            "Delete this file once every video below is digested.",
            "",
            "| File | Video | Title | Note |",
            "|---|---|---|---|",
        ]) + "\n", encoding="utf-8")
    rows = [f"| `{item['file']}` | {item['url']} | {cell(item['title'])} | {cell(item['note'])} |" for item in saved]
    with PROMPT.open("a", encoding="utf-8") as handle:
        handle.write("\n".join(rows) + "\n")
    if shutil.which("pbcopy"):
        subprocess.run(["pbcopy"], input=PROMPT.read_bytes(), check=False)
        print("Copied the digest prompt to the clipboard.")


def cell(text):
    return text.replace("|", "/")


def main():
    is_dry_run = "--dry-run" in sys.argv
    rows = read_queue()
    if not rows:
        print("The queue is empty.")
        return

    pending, kept = [], []
    for row in rows:
        vid = video_id(row["url"])
        if not vid:
            print(f"  skip  {row['url']}: not a YouTube link")
            kept.append(row)
            continue
        if row["name"] and (VIDEOS / f"{row['name']}.txt").exists():
            print(f"  skip  {row['name']}.txt already exists; rename it in the queue")
            kept.append(row)
            continue
        pending.append((vid, row))

    print(f"{len(pending)} to fetch, {len(kept)} held back.")
    if is_dry_run or not pending:
        for vid, row in pending:
            print(f"  {vid}  {row['name'] or '(name from title)'}  {row['note']}")
        return

    token = read_token()
    VIDEOS.mkdir(parents=True, exist_ok=True)
    saved = []
    for start in range(0, len(pending), MAX_IDS_PER_REQUEST):
        batch = pending[start:start + MAX_IDS_PER_REQUEST]
        if start:
            time.sleep(REQUEST_GAP_SECONDS)
        entries = entries_by_id(post([vid for vid, _ in batch], token))
        for vid, row in batch:
            entry = entries.get(vid) or {}
            text = text_of(entry)
            title = title_of(entry)
            name = row["name"] or name_from_title(title) or vid
            if not text:
                print(f"  fail  {vid}: no transcript in the response")
                kept.append(row)
                continue
            if (VIDEOS / f"{name}.txt").exists():
                print(f"  fail  {vid}: {name}.txt already exists; give it a name in the queue")
                kept.append(row)
                continue
            path = save(vid, name, text)
            saved.append({"file": path.name, "url": f"https://youtu.be/{vid}", "title": title, "note": row["note"]})
            print(f"  saved {path.name}")

    if saved:
        write_prompt(saved)
        print(f"Wrote {PROMPT.relative_to(ROOT)} for {len(saved)} transcript(s).")
    write_queue(kept)
    print(f"Queue now holds {len(kept)} row(s).")


if __name__ == "__main__":
    main()
