# AGENTS.md

Instructions for AI agents working in this repo. This is the only instruction
file: there is deliberately no CLAUDE.md (Claude Code reads AGENTS.md when
CLAUDE.md is absent), so put agent guidance here, not in a second file.

## Context

- [`services/ai-proxy/context.md`](services/ai-proxy/context.md): who Konrad is and what this site is.
  It is also the AI chat proxy's knowledge file, so keep it accurate.
- [`docs/product.md`](docs/product.md): product decisions and framing rules.
- `docs/`: authoring guides per section.

## Skills

Read the matching skill in `private/skills/` before starting these tasks:

| Skill | Use when |
|---|---|
| [`private/skills/CodeStandards.md`](private/skills/CodeStandards.md) | **Always**, for any code you write, edit or review. |
| [`private/skills/FileStructure.md`](private/skills/FileStructure.md) | **Always**, before creating, moving, renaming or deleting any file or folder. |
| [`private/skills/ChapterPageMake.md`](private/skills/ChapterPageMake.md) | Writing a chapter of any text-lite deep dive, or starting a new subject section. |
| [`private/skills/ChapterPageMakeLogic.md`](private/skills/ChapterPageMakeLogic.md) | Writing or reworking a Basic Logic chapter (`content/misc/basic-logic/`). Read after ChapterPageMake.md. |
| [`private/skills/ChapterPageMakePython.md`](private/skills/ChapterPageMakePython.md) | Writing or fixing a Python for ML chapter or its workbook packet. Read after ChapterPageMake.md and ChapterHomeworkMake.md. |
| [`private/skills/ChapterHomeworkMake.md`](private/skills/ChapterHomeworkMake.md) | Adding a Homework section (interactive exercises) to a chapter. Optional per chapter. |
| [`private/skills/ArticlePageMake.md`](private/skills/ArticlePageMake.md) | Writing or reworking a text-lite blog article (`content/articles/`). |
| [`private/skills/VideoNotesPageMake.md`](private/skills/VideoNotesPageMake.md) | Writing or extending a `/misc` page from YouTube transcripts (`private/ideas/misc/videos/`). Read after ArticlePageMake.md. |
| [`private/skills/AuditCode.md`](private/skills/AuditCode.md) | Auditing, re-auditing or grading the codebase or a feature. |
| [`private/skills/AuditArticle.md`](private/skills/AuditArticle.md) | Fact-checking and reviewing an article or chapter before it publishes. Never in the session that wrote it. |
| [`private/skills/HumanizeWriting.md`](private/skills/HumanizeWriting.md) | Writing or editing any reader-facing prose: page text, data-file copy, FAQ answers, captions. |

## Working with Konrad

- Ask questions in plain text in your reply, never with the AskUserInput widget.
- Don't commit or push. Konrad reviews and commits himself.
- For design work, look at real examples with the Mobbin MCP before building.
- Every page must read without JavaScript (scrapers, reader modes, no-JS
  browsers). Content lives in the HTML; scripts only enhance it.
- Tool and widget pages get minimal prose: let the tool do the explaining.
- Every figure on a page traces to a linked source or is labelled as an
  estimate or assumption. Look up anything time-sensitive (prices, project
  status, who holds a role) before stating it; don't rely on memory.

## Site conventions

- **/misc order:** each shelf's cards follow the `order:` list for its group in
  `content/misc/_index.md`. Add a new misc page to its group's list; the build
  warns about pages that are missing.
- **Sealed pages:** `vault: "<name>"` in front matter plus `make seal` ships a
  page as ciphertext behind a PIN. When the content must stay out of this
  public repo, its source lives in `private/<name>/` mirroring the site tree,
  and the seal target overlays it on a temp copy of the site
  (`scripts/vault/seal.sh`, see the Brine and WishWhat targets). Re-seal after editing that
  source or the site's scripts. `make seal` and `make backup` copy `private/`
  and `static/vault/` to the external drive when it's mounted.
- **Markdown:** two single `~` in one paragraph render as strikethrough, so
  write "about" rather than "~" in prose.
- **YAML data:** a bare `y` or `n` key parses as a boolean; don't use them as
  key names.

**"Last updated" lines:** when you change a page whose front matter has an
`updated:` date (it renders as "Last updated …"), set it to today's date in the
same change.

**Linux sandboxes:** `bin/` holds macOS binaries. Fetch Linux ones with
`make BIN=<dir> setup` and pass `BIN=<dir>` to make; never overwrite `bin/`.
Don't run git from a sandboxed shell (it can leave `.git/index.lock` behind).

`private/` is gitignored, so these files exist only on Konrad's machine.
