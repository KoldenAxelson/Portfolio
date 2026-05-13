# Neofolio — friendly entry points to common tasks.
#
# Prefer this Makefile for one-shot tasks; you can still edit files by hand
# at any time. The scaffolds just save typing on the boilerplate.
#
# Usage:
#   make            (or `make help`) — show this list
#   make setup      first-time install
#   make dev        local dev server
#   make build      production build
#   make preview    serve the production build locally
#   make lighthouse audit your scores
#
#   make contact    add a network contact (prompts you)
#   make post       add a writing post
#   make project    add a project
#   make archive    add an archive entry
#
#   make clean      remove dist + .astro + lighthouse reports

.PHONY: help setup dev build preview lighthouse clean \
        contact post project archive noise

.DEFAULT_GOAL := help

help: ## Show this help
	@printf "\033[1mNeofolio\033[0m\n"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / { \
		printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2 \
	}' $(MAKEFILE_LIST)

# ─── Common dev workflows ─────────────────────────────────────────────

setup: ## Idempotent local setup (node check, deps, smoke build)
	@bash setup.sh

dev: ## Start the local dev server on http://localhost:4321
	@npm run dev

build: ## Production build to dist/
	@npm run build

preview: ## Serve the production build locally
	@npm run preview

lighthouse: ## Audit Performance / Accessibility / Best Practices / SEO
	@bash scripts/lighthouse.sh

clean: ## Remove dist, .astro, lighthouse reports
	@rm -rf dist .astro .lighthouse

# ─── Content scaffolds ────────────────────────────────────────────────
# Each runs a small Node script that prompts for the fields and writes
# the file. Everything they generate is also editable by hand afterward —
# they save typing, not flexibility.

contact: ## Add a network contact (src/content/network/)
	@node scripts/new-contact.mjs

post: ## Add a writing post (src/content/posts/)
	@node scripts/new-post.mjs

project: ## Add a project (src/content/projects/)
	@node scripts/new-project.mjs

archive: ## Add an archive entry (src/content/archive/)
	@node scripts/new-archive.mjs

noise: ## Regenerate the matte noise textures (public/textures/noise.png + noise-dark.png)
	@node scripts/_gen-noise.mjs
