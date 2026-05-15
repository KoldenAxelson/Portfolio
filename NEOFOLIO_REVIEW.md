# Neofolio setup review

Notes from a Cowork-assisted setup of a fresh Neofolio fork onto Cloudflare Pages at a custom domain. Goal: capture the snags so the next person hits them less or not at all. Mostly suggestions for the template; a couple are external (gh CLI, Cloudflare UI drift) but worth surfacing because they bit us in this flow.

Setup target: GitHub repo + Cloudflare Pages + custom apex domain `wrightfunctions.com` already-in-zone. CLI tooling: `gh`, `wrangler`, `git`, plus an AI assistant driving file edits.

## What worked well

Worth saying up front so the rest reads as feedback, not a list of complaints.

- `setup.sh` was genuinely idempotent. Re-runs were boring. The smoke `npm run build` at the end caught one config issue early on a previous fork.
- `AGENTS.md` + `SETUP_AGENT.md` are well-pitched at an LLM driver. The phased structure with "ask in this order" and "push back on generic answers" actually changes assistant behavior in useful ways.
- The Makefile entry points are obvious enough that you don't need to read `package.json`. `make clean-examples` doing what it says on the tin is rare and lovely.
- Documentation has good cross-links — the `README → docs/deploying.md → workflow file → SETUP_AGENT.md` chain was easy to walk.

## Snags ordered roughly by impact

### 1. CI variable went to the wrong repo, silently

Highest-impact snag in the whole flow. The `cloudflare-pages.yml` workflow reads `${{ vars.CLOUDFLARE_PROJECT_NAME }}`. To set it, `docs/deploying.md` says "Variable `CLOUDFLARE_PROJECT_NAME`" without further direction. Natural assumption: `gh variable set CLOUDFLARE_PROJECT_NAME --body "portfolio"`.

If you've followed the README pattern of `git remote add upstream https://github.com/KoldenAxelson/neofolio.git` (which is sensible for pulling future template improvements), and the upstream owner matches your own GitHub handle (which it will if you're forking a template you also own — which is exactly the demo case in the README), then `gh variable set` silently writes to the *upstream* repo. No prompt. No warning. The output literally says `Created variable for KoldenAxelson/neofolio` and most users skim past that line.

`gh secret set` *does* prompt for disambiguation. `gh variable set` does not. `gh repo set-default` partially helps for some subcommands but not consistently for `variable`. The only fully safe pattern is `-R OWNER/REPO` on every `gh variable` invocation.

Downstream effect: the CI workflow ran with `--project-name=` empty, and wrangler emitted `✘ Must specify a project name`. That error is one logical hop from the actual problem (variable doesn't exist on this repo), and we spent two failed runs and a token-permission rabbit-hole getting there.

Suggested fixes, ranked:

a. **Hardcode the project name in the workflow** (or template it via `${{ github.event.repository.name }}` if you want zero config). The variable adds portability that's basically theoretical — nobody renames their Pages project across forks. We ended up doing this and it worked first try. Removing the variable removes the snag.

b. If you keep the variable: add a fail-fast guard step before the wrangler-action call —
    ```yaml
    - name: Validate config
      env:
        PROJECT_NAME: ${{ vars.CLOUDFLARE_PROJECT_NAME }}
      run: |
        if [[ -z "$PROJECT_NAME" ]]; then
          echo "::error::CLOUDFLARE_PROJECT_NAME variable is empty. Set it on THIS repo (gh variable set -R OWNER/REPO ...). gh defaults to alphabetical-first remote if multiple are set."
          exit 1
        fi
    ```

c. Independent of (a) and (b): the workflow's "Required repo configuration" comment should explicitly warn about the `gh variable set` ambiguity if multiple remotes are configured — *especially* given the same doc tells users to add `upstream`. One sentence saves the next person 20 minutes.

### 2. CF API token permission guidance is out of date

`docs/deploying.md` and the workflow comment both say "Pages:Edit + User Details:Read". As of mid-2026, Cloudflare's API token UI doesn't expose `User Details` as a separate granular permission at all. Searching `user` in the permissions list returns only `Access: Users` (a Zero Trust thing, unrelated). Easy to mis-grant or worry you've missed something.

The permissions UI has also been reorganized into category-based grouping: `Developer Platform → Pages` rather than the old `Account → Cloudflare Pages`. Same permission, different breadcrumb. The "Account Resources" concept is now baked into a "Permission policies → Entire Account" dropdown.

Current state (verified): `Developer Platform → Pages → Edit` alone is enough for `wrangler pages deploy` via `cloudflare/wrangler-action@v3`. User Details was a holdover from older OAuth verification flows.

Suggested fix: update the workflow comment and `docs/deploying.md` to reference the current UI breadcrumb (`Developer Platform → Pages → Edit`) and drop the User Details: Read line. Mention the fallback (`Workers Scripts: Edit`) for when Cloudflare finishes folding Pages under Workers — that consolidation is in progress and the permission may shift again.

### 3. GH Pages workflow fail-spams when user picks Cloudflare

The repo ships both `github-pages.yml` and `cloudflare-pages.yml`. Cloudflare's is disabled-by-default (`workflow_dispatch` only); GitHub Pages' is enabled-by-default (`push: main`). If you set up the repo, push, and then haven't configured Pages → Source = "GitHub Actions" in repo settings, that workflow fails on every push, fail-spamming your inbox. Especially confusing for users picking Cloudflare — they get notification emails for a deploy target they're not even using.

We hit this on the initial push. Easy to fix once you know what it is, but you only know what it is by reading the workflow file and tracing through it.

Suggested fix: both workflows should ship with the same shape — `workflow_dispatch` only — and `SETUP_AGENT.md` Phase 9 should explicitly include "enable the deploy target you picked by adding `push:` triggers to that workflow." The symmetry is also cleaner conceptually.

Alternative: keep GH Pages as the default-on workflow, but add a guard step that no-ops cleanly when Pages isn't configured in repo settings (catch the 404 and print a friendly "GitHub Pages isn't configured in repo Settings → Pages — skipping").

### 4. Pages project namespace collision wasn't documented

`wrangler pages project create portfolio` succeeded, but the project's `*.pages.dev` URL came back as `portfolio-5z5.pages.dev` — with a random suffix. The CLI output gives no hint why. Surprising if you expected `portfolio.pages.dev`.

Best guess: Cloudflare reserves project slugs globally, not per-account, and `portfolio` is taken somewhere. Or there's anti-squatting logic. Either way, worth a one-liner in `docs/deploying.md` so users don't think they've done something wrong.

### 5. Stale wrangler version in CI vs local

`wrangler-action@v3` installs `wrangler@3.90.0` in CI. Local install is `wrangler@4.x`. Different default command behavior is plausible, especially around Pages Functions. Hasn't bitten us yet but will eventually.

Suggested fix: bump the action pin in the workflow to a v3 minor that installs wrangler 4, or add a `packageManager: npx` block with an explicit wrangler version. Add a comment explaining what's pinned.

### 6. Node 20 deprecation across all actions

Every action in both workflows (`actions/checkout@v4`, `actions/setup-node@v4`, `cloudflare/wrangler-action@v3`) uses Node 20 internally. GitHub will force Node 24 on June 2, 2026 and remove Node 20 entirely on September 16, 2026. We saw the warning on every run.

Suggested fix: bump to versions that support Node 24 when they ship, or set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` as a workflow env var to opt in early and verify nothing breaks. Either way, this needs to land before the June deadline.

### 7. npm vulnerability count is loud

`setup.sh`'s `npm ci` reports 10 vulnerabilities. The wrangler-action's later install reports 14. All in dev deps, but the count is loud enough that a fresh forker may worry. Worth a brief note in `setup.sh` or the README saying "these are dev deps, audited periodically, none reachable at runtime" — or actually running `npm audit fix` and committing the result.

### 8. SETUP_AGENT.md could mention the all-CLI alternative

The runbook walks the user through GitHub Pages or Cloudflare Pages via the dashboard or the workflow. For users with `wrangler` locally, the simplest path is actually:

```
wrangler pages project create <slug> --production-branch=main
wrangler pages deploy dist --project-name=<slug>
```

Two commands. No API token, no GH secrets, no workflow. You lose auto-deploy on push, but for a low-traffic personal site that's not a big deal.

Worth mentioning as an option, even if the runbook still recommends CI.

## Smaller observations

- `make verify` is a great idea and the runbook mentions it twice. Worth promoting it earlier in the README's quick-start so people see it before forgetting to run it.
- The repo's `git remote add upstream` pattern works *only* if upstream's owner differs from yours. If you're forking your own template (template-as-template), the dual-remote setup actively creates the snag in section 1 above. Consider mentioning this in the README or `CONTRIBUTING.md`.
- `AGENTS.md` is excellent but the hard-invariants block in section "Hard invariants" could mention that `$/Users/konrad/Library/Application Support/...` style paths from Cowork sandboxes are not the same as the local repo. Trivial to handle but I (the assistant) initially mixed them up.
- The phased questionnaire in `SETUP_AGENT.md` Phase 1 is great. Consider also including Phase 1 as a single Markdown checklist at the top of the file — easier for a returning user to skim.
- Consider a `make smoke-deploy` target that runs `wrangler pages deploy dist --project-name=$(node -p 'require("./package.json").name')` so first-time deploys have a one-command path that doesn't require CI at all.

## TL;DR for a template maintainer

If you fix three things, fix these:

1. **Hardcode `--project-name=portfolio` in `cloudflare-pages.yml`** (or read from `github.event.repository.name`). Removes the variable entirely and sidesteps the gh-CLI silent-misroute trap.
2. **Ship both deploy workflows as `workflow_dispatch`-only**, and tell users in `SETUP_AGENT.md` Phase 9 to flip on the one they want.
3. **Update CF API token permission guidance** in `docs/deploying.md` and the workflow comment — current UI is `Developer Platform → Pages → Edit`, no "User Details" anywhere.

Everything else is polish.
