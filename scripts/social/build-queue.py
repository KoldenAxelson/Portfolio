#!/usr/bin/env python3
"""Build the social queue the posting Worker reads.

    make social-queue

Reads data/social/queue.yaml (written by agents, one entry per post) and
writes static/social/queue.json, which the site publishes at
https://wrightfunctions.com/social/queue.json. The Worker
(services/workers/social/) fetches that file once a day and sends whatever
is due.

An entry:

    - id: model-routing          # unique; the Worker remembers what it sent by id
      date: 2026-10-31           # first day it may go out (Pacific time)
      article: model-routing     # optional: cross-post content/articles/<slug>.md to dev.to
      url: /projects/widda/      # optional when `article` is set; the page the post links to
      linkedin: |                # optional: the LinkedIn post (private/skills/LinkedInPost.md)
        Plenty of AI apps...

For an article, this script turns the Hugo markdown into dev.to markdown:
glossary terms become plain words, each live demo becomes a line pointing at
the original page, the reference carousel becomes a numbered list from
data/ml/references/<slug>.yaml, and site links become absolute. dev.to gets
the page's share card as its cover and a canonical link home, so search
engines treat the site as the original.

The queue is public (it's a file on the site); nothing in it is secret.
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
QUEUE_IN = ROOT / "data" / "social" / "queue.yaml"
QUEUE_OUT = ROOT / "static" / "social" / "queue.json"
ARTICLES = ROOT / "content" / "articles"
REFERENCES = ROOT / "data" / "ml" / "references"
SITE = "https://wrightfunctions.com"
DEVTO_MAX_TAGS = 4
# dev.to's AI disclosure, in words, at the end of every cross-post: Konrad
# writes with AI help, and says so.
AI_NOTE = "*AI-assisted: I write these with help from AI tools.*"


def die(msg: str) -> None:
    sys.exit(f"social: {msg}")


def split_front_matter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        die("article has no front matter")
    end = text.index("\n---", 3)
    return yaml.safe_load(text[3:end]) or {}, text[end + 4:].lstrip("\n")


def references_md(slug: str) -> str:
    path = REFERENCES / f"{slug}.yaml"
    if not path.exists():
        return ""
    refs = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    lines = ["## References & further reading", ""]
    for i, r in enumerate(refs, 1):
        meta = f" ({r['meta']})" if r.get("meta") else ""
        lines.append(f"{i}. [{r['title']}]({r['url']}){meta}")
    return "\n".join(lines)


def to_devto(slug: str, body: str, url: str) -> str:
    # Glossary terms: keep the word, drop the popover.
    body = re.sub(r'\{\{<\s*term\s+"[^"]*"\s*>\}\}(.*?)\{\{<\s*/term\s*>\}\}', r"\1", body, flags=re.S)
    # The reference carousel becomes a plain numbered list.
    body = re.sub(r"## References[^\n]*\n(?:.*\n)*?\{\{<\s*ml/references[^>]*>\}\}", lambda _: references_md(slug), body)
    body = re.sub(r"\{\{<\s*ml/references[^>]*>\}\}", lambda _: references_md(slug), body)
    # Every other shortcode is a live demo that only runs on the site.
    body = re.sub(r"\{\{<\s*[a-z0-9/_-]+[^>]*>\}\}",
                  f"> ▶ There's a live demo here on the original post: [try it on wrightfunctions.com]({url})", body)
    if "{{<" in body or "{{%" in body:
        die(f"{slug}: a shortcode survived the conversion; handle it in to_devto()")
    # Heading anchors like {#sources} and site-relative links.
    body = re.sub(r"\s*\{#[a-z0-9-]+\}", "", body)
    body = re.sub(r"\]\((/[^)\s]*)\)", lambda m: f"]({SITE}{m.group(1)})", body)
    intro = f"*Originally published on [wrightfunctions.com]({url}), where the demos are live.*"
    return f"{intro}\n\n{body.strip()}\n\n---\n\n{AI_NOTE}\n"


def devto_tags(tags: list) -> list[str]:
    out = []
    for t in tags or []:
        t = re.sub(r"[^a-z0-9]", "", str(t).lower())
        if t and t not in out and t != "explainer":
            out.append(t)
    return out[:DEVTO_MAX_TAGS]


def build() -> None:
    if not QUEUE_IN.exists():
        die(f"no {QUEUE_IN.relative_to(ROOT)}")
    entries = yaml.safe_load(QUEUE_IN.read_text(encoding="utf-8")) or []
    seen, out = set(), []
    for e in entries:
        pid = e.get("id")
        if not pid or pid in seen:
            die(f"every entry needs a unique id (problem at {pid!r})")
        seen.add(pid)
        date = e.get("date")
        if isinstance(date, dt.date):
            date = date.isoformat()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(date or "")):
            die(f"{pid}: date must be YYYY-MM-DD")
        item = {"id": pid, "date": date}
        slug = e.get("article")
        if slug:
            path = ARTICLES / f"{slug}.md"
            if not path.exists():
                die(f"{pid}: no article {path.relative_to(ROOT)}")
            fm, body = split_front_matter(path.read_text(encoding="utf-8"))
            if fm.get("review") or fm.get("draft"):
                die(f"{pid}: {slug} is still in review; queue it once it's published")
            if fm.get("canonical"):
                die(f"{pid}: {slug} is already canonical elsewhere ({fm['canonical']})")
            url = f"{SITE}/articles/{slug}/"
            item.update({
                "url": url,
                "title": fm["title"],
                "devto": {
                    "title": fm["title"],
                    "description": fm.get("description", ""),
                    "tags": devto_tags(fm.get("tags")),
                    "canonical_url": url,
                    "main_image": f"{SITE}{fm['image']}" if fm.get("image") else None,
                    "body_markdown": to_devto(slug, body, url),
                },
            })
        else:
            if not e.get("url"):
                die(f"{pid}: needs `article` or `url`")
            item.update({"url": e["url"] if e["url"].startswith("http") else SITE + e["url"],
                         "title": e.get("title", pid)})
        if e.get("linkedin"):
            text = e["linkedin"].strip()
            if "[link]" in text:
                text = text.replace("[link]", item["url"])
            item["linkedin"] = text
        if "devto" not in item and "linkedin" not in item:
            die(f"{pid}: nothing to post (no article, no linkedin text)")
        out.append(item)
    out.sort(key=lambda i: (i["date"], i["id"]))
    QUEUE_OUT.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_OUT.write_text(json.dumps({"generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                                     "items": out}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"social: {len(out)} posts -> {QUEUE_OUT.relative_to(ROOT)}")
    for i in out:
        kinds = "+".join(k for k in ("devto", "linkedin") if k in i)
        print(f"  {i['date']}  {i['id']:<30} {kinds}")


if __name__ == "__main__":
    build()
