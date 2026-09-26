# AGENTS.md

Instructions for AI agents working in this repo.

## Context

- `CONTEXT.md`: who Konrad is and what this site is.
- `PRODUCT.md`: product decisions and framing rules.
- `docs/`: authoring guides per section.

## Skills

Read the matching skill in `private/skills/` before starting these tasks:

| Skill | Use when |
|---|---|
| [`private/skills/CodeStandards.md`](private/skills/CodeStandards.md) | **Always**, for any code you write, edit or review. |
| [`private/skills/ChapterPageMake.md`](private/skills/ChapterPageMake.md) | Writing a chapter of any text-lite deep dive, or starting a new subject section. |
| [`private/skills/ChapterPageMakeLogic.md`](private/skills/ChapterPageMakeLogic.md) | Writing or reworking a Basic Logic chapter (`content/misc/basic-logic/`). Read after ChapterPageMake.md. |
| [`private/skills/ChapterPageMakePython.md`](private/skills/ChapterPageMakePython.md) | Writing or fixing a Python for ML chapter or its workbook packet. Read after ChapterPageMake.md and ChapterHomeworkMake.md. |
| [`private/skills/ChapterHomeworkMake.md`](private/skills/ChapterHomeworkMake.md) | Adding a Homework section (interactive exercises) to a chapter. Optional per chapter. |
| [`private/skills/ArticlePageMake.md`](private/skills/ArticlePageMake.md) | Writing or reworking a text-lite blog article (`content/articles/`). |
| [`private/skills/AuditCode.md`](private/skills/AuditCode.md) | Auditing, re-auditing or grading the codebase or a feature. |
| [`private/skills/AuditArticle.md`](private/skills/AuditArticle.md) | Fact-checking and reviewing an article or chapter before it publishes. Never in the session that wrote it. |

Writing a blog article as the **writer agent**: start with
[`private/blog-ideas/WRITER-HANDOFF.md`](private/blog-ideas/WRITER-HANDOFF.md).
Building the Python for ML course as the **course builder**: start with
[`private/misc-ideas/python-for-ml/COURSE-HANDOFF.md`](private/misc-ideas/python-for-ml/COURSE-HANDOFF.md).

**Linux sandboxes:** `bin/` holds macOS binaries. Fetch Linux ones with
`make BIN=<dir> setup` and pass `BIN=<dir>` to make; never overwrite `bin/`.
Don't run git from a sandboxed shell (it can leave `.git/index.lock` behind).

`private/` is gitignored, so these files exist only on Konrad's machine.
