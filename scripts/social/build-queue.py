#!/usr/bin/env python3
"""Build the social queue the posting Worker reads.

    make social-queue

Reads data/social/queue.yaml (written by agents, one entry per post) and
writes static/social/queue.json, which the site publishes at
https://wrightfunctions.com/social/queue.json. The Worker
(services/workers/social/) fetches that file once a day and sends whatever
is due.

An entry:

    - id: model-routing          # unique, lowercase a-z, 0-9 and dashes; permanent
      date: 2026-11-06           # first day it may go out (Pacific time)
      article: model-routing     # optional: cross-post content/articles/<slug>.md to dev.to
      url: /projects/widda/      # needed without `article`: the page the post links to
      title: Widda               # needed without `article`: shown in the email
      rush: true                 # optional: allowed off the Monday/Friday pacing
      linkedin: |                # optional: the LinkedIn post (private/skills/LinkedInPost.md)
        Plenty of AI apps...
        ...: [link]              # [link] is replaced with the page's full URL

The Worker remembers what it sent by id, so an id is permanent: renaming one
sends it again. Pacing is Monday and Friday, at most two posts a week; an
entry off that rhythm fails the build unless it says `rush: true`.

For an article, this script turns the Hugo markdown into dev.to markdown with
dev.to front matter on top (title, tags, cover, canonical link home, and
`ai_disclosure: some_ai`, dev.to's "AI-assisted" tier). In the body:

- glossary terms become plain words;
- each live demo becomes a link to the original page, and the instruction
  paragraph before it ("Drag the traffic up...") is reworded to say the demo
  is on the original post;
- the quantization timeline becomes a dated list from its data file;
- the reference carousel becomes a numbered list with each source's note;
- site links become absolute;
- a living article (one with `updatedDate`) says the current version is on
  the site, since the dev.to copy is never updated.

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
TIMELINE = ROOT / "data" / "ml" / "quantization-timeline.yaml"
QUEUE_OUT = ROOT / "static" / "social" / "queue.json"
ARTICLES = ROOT / "content" / "articles"
REFERENCES = ROOT / "data" / "ml" / "references"
SITE = "https://wrightfunctions.com"
DEVTO_MAX_TAGS = 4
# The site's tag -> the dev.to tag readers actually follow.
DEVTO_TAG_MAP = {"ml": "machinelearning"}
# Konrad writes with AI help and says so: dev.to's "AI-assisted" tier in the
# front matter, and a line at the end that a reader sees.
AI_TIER = "some_ai"
AI_NOTE = "*AI-assisted: I write these with help from AI tools.*"
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PACED_DAYS = (0, 4)  # Monday, Friday
MAX_PER_WEEK = 2
# A paragraph that tells the reader to use the demo below it starts with one of these.
DEMO_VERBS = ("Drag", "Try", "Type", "Pick", "Slide", "Tap", "Click", "Switch", "Press", "Watch",
              "Move", "Toggle", "Play", "Flip", "Turn", "Push", "Set", "Hit", "Grade", "Step", "Close")


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
        note = f" {r['note']}" if r.get("note") else ""
        lines.append(f"{i}. [{r['title']}]({r['url']}){meta}.{note}")
    return "\n".join(lines)


def timeline_md() -> str:
    """The quantization timeline as a dated list (the living history itself)."""
    entries = yaml.safe_load(TIMELINE.read_text(encoding="utf-8")) or []
    lines = []
    for e in entries:
        src = e.get("source") or {}
        link = f" ([{src['text']}]({src['url']}))" if src.get("url") else ""
        lines.append(f"- **{e['date']}, {e['title']}** ({e['bits']} bits): {e['what']} {e['why']}{link}")
    return "\n".join(lines)


def demo_line(url: str) -> str:
    return f"> ▶ **Interactive demo:** [try it on the original post]({url})"


def reword_demo_prompts(body: str) -> str:
    """The paragraph above a demo usually tells the reader to use it ("Drag the
    threshold:"), and the copy has no demo. Say where the demo is instead."""
    def demo_sentence(sentence: str) -> str:
        sentence = sentence.rstrip(":").rstrip()
        sentence = sentence if sentence.endswith((".", "!", "?")) else sentence + "."
        return "On the original post, you can " + sentence[0].lower() + sentence[1:]

    paras = body.split("\n\n")
    for i in range(1, len(paras)):
        if not re.match(r"\{\{<\s*ml/(?!references|timeline)", paras[i].strip()):
            continue
        prev = paras[i - 1].rstrip()
        if prev.lstrip().startswith(DEMO_VERBS) and len(prev.split()) <= 40:
            paras[i - 1] = demo_sentence(prev.strip())  # the whole paragraph is instructions
            continue
        parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", prev)
        last = parts[-1]
        if last.startswith(DEMO_VERBS) or last.startswith(("Now ", "Hit ")):
            parts[-1] = demo_sentence(last)
        elif last.endswith(":"):
            parts[-1] = last[:-1].rstrip() + "."
        paras[i - 1] = " ".join(parts) if len(parts) > 1 else parts[0]
    return "\n\n".join(paras)


def to_devto(slug: str, fm: dict, body: str, url: str) -> str:
    body = reword_demo_prompts(body)
    # Glossary terms: keep the word, drop the popover.
    body = re.sub(r'\{\{<\s*term\s+"[^"]*"\s*>\}\}(.*?)\{\{<\s*/term\s*>\}\}', r"\1", body, flags=re.S)
    # The reference carousel becomes a plain numbered list.
    body = re.sub(r"## References[^\n]*\n(?:.*\n)*?\{\{<\s*ml/references[^>]*>\}\}", lambda _: references_md(slug), body)
    body = re.sub(r"\{\{<\s*ml/references[^>]*>\}\}", lambda _: references_md(slug), body)
    body = re.sub(r"\{\{<\s*ml/timeline\s*>\}\}", lambda _: timeline_md(), body)
    # Every other shortcode is a live demo that only runs on the site.
    body = re.sub(r"\{\{<\s*[a-z0-9/_-]+[^>]*>\}\}", lambda _: demo_line(url), body)
    if "{{<" in body or "{{%" in body:
        die(f"{slug}: a shortcode survived the conversion; handle it in to_devto()")
    # Heading anchors like {#sources} and site-relative links.
    body = re.sub(r"\s*\{#[a-z0-9-]+\}", "", body)
    body = re.sub(r"\]\((/[^)\s]*)\)", lambda m: f"]({SITE}{m.group(1)})", body)
    intro = f"*Originally published on [wrightfunctions.com]({url}), where the demos are live.*"
    if fm.get("updatedDate"):
        intro += (f" *This is a living article: I keep the original up to date, so check it for the current"
                  f" version (last updated {fm['updatedDate']}).*")
    front = {
        "title": fm["title"],
        "published": True,
        "description": fm.get("description", ""),
        "tags": ", ".join(devto_tags(fm.get("tags"))),
        "canonical_url": url,
        "ai_disclosure": AI_TIER,
    }
    if fm.get("image"):
        front["cover_image"] = f"{SITE}{fm['image']}"
    head = "---\n" + yaml.safe_dump(front, sort_keys=False, allow_unicode=True, width=10_000) + "---\n\n"
    return f"{head}{intro}\n\n{body.strip()}\n\n---\n\n{AI_NOTE}\n"


def devto_tags(tags: list) -> list[str]:
    out = []
    for t in tags or []:
        t = re.sub(r"[^a-z0-9]", "", str(t).lower())
        t = DEVTO_TAG_MAP.get(t, t)
        if t and t not in out and t != "explainer":
            out.append(t)
    return out[:DEVTO_MAX_TAGS]


def check_pacing(items: list[dict]) -> None:
    """Monday and Friday, at most two a week, unless an entry says rush: true."""
    per_week: dict[tuple, int] = {}
    for i in items:
        day = dt.date.fromisoformat(i["date"])
        week = day.isocalendar()[:2]
        per_week[week] = per_week.get(week, 0) + 1
        if i["rush"]:
            continue
        if day.weekday() not in PACED_DAYS:
            die(f"{i['id']}: {i['date']} is a {day:%A}. Use a Monday or Friday, or add `rush: true`.")
    for i in items:
        week = dt.date.fromisoformat(i["date"]).isocalendar()[:2]
        if per_week[week] > MAX_PER_WEEK and not i["rush"]:
            die(f"{i['id']}: the week of {i['date']} has {per_week[week]} posts; the limit is {MAX_PER_WEEK}.")


def build() -> None:
    if not QUEUE_IN.exists():
        die(f"no {QUEUE_IN.relative_to(ROOT)}")
    entries = yaml.safe_load(QUEUE_IN.read_text(encoding="utf-8")) or []
    seen, out = set(), []
    for e in entries:
        pid = e.get("id")
        if not pid or pid in seen or not ID_RE.match(str(pid)):
            die(f"every entry needs a unique id of lowercase letters, digits and dashes (problem at {pid!r})")
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
                    "body_markdown": to_devto(slug, fm, body, url),
                },
            })
        else:
            if not e.get("url") or not e.get("title"):
                die(f"{pid}: without `article`, an entry needs both `url` and `title`")
            item.update({"url": e["url"] if e["url"].startswith("http") else SITE + e["url"],
                         "title": e.get("title", pid)})
        if e.get("linkedin"):
            text = e["linkedin"].strip()
            if "[link]" in text:
                text = text.replace("[link]", item["url"])
            item["linkedin"] = text
        if "devto" not in item and "linkedin" not in item:
            die(f"{pid}: nothing to post (no article, no linkedin text)")
        item["rush"] = bool(e.get("rush"))
        out.append(item)
    check_pacing(out)
    for i in out:
        i.pop("rush")
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
