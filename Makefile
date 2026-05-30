# ---------------------------------------------------------------------------
# NeoGolio — HUGX build tooling
#
# Truly Node-free: Hugo (Go binary) emits static HTML, and the Tailwind v4
# standalone binary (Rust/Oxide engine — no npm, no node_modules) emits the
# CSS. `make setup` downloads both binaries for your platform into ./bin; no
# global install, no package manager. Everything deployed is a flat file.
#
# Quick start:
#   make setup     # one-time: fetch the Hugo + Tailwind binaries
#   make dev       # local server at http://localhost:1313 with live CSS
#   make build     # production build to ./public
# ---------------------------------------------------------------------------

# Pinned versions (bump deliberately; pinning keeps builds reproducible and
# the supply-chain surface auditable).
HUGO_VERSION     := 0.140.2
TAILWIND_VERSION := v4.3.0

BIN      := bin
HUGO     := $(BIN)/hugo
TAILWIND := $(BIN)/tailwindcss

CSS_IN   := assets/css/main.css
CSS_OUT  := assets/css/app.css

.PHONY: help setup dev build css css-watch clean distclean

help: ## Show this help
	@echo "NeoGolio — available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-10s\033[0m %s\n", $$1, $$2}'

setup: $(HUGO) $(TAILWIND) ## Download the Hugo + Tailwind binaries for this platform
	@echo "Toolchain ready in ./$(BIN)"

# --- binary bootstrap -------------------------------------------------------

$(HUGO):
	@mkdir -p $(BIN)
	@echo "Downloading Hugo $(HUGO_VERSION) (extended)…"
	@os=$$(uname -s); arch=$$(uname -m); \
	case "$$os" in \
	  Darwin) plat=darwin-universal ;; \
	  Linux) case "$$arch" in \
	      x86_64) plat=linux-amd64 ;; \
	      aarch64|arm64) plat=linux-arm64 ;; \
	      *) echo "Unsupported arch: $$arch" >&2; exit 1 ;; \
	    esac ;; \
	  *) echo "Unsupported OS: $$os (download Hugo manually from github.com/gohugoio/hugo/releases)" >&2; exit 1 ;; \
	esac; \
	url="https://github.com/gohugoio/hugo/releases/download/v$(HUGO_VERSION)/hugo_extended_$(HUGO_VERSION)_$$plat.tar.gz"; \
	curl -fsSL "$$url" | tar -xz -C $(BIN) hugo
	@chmod +x $(HUGO)
	@$(HUGO) version

$(TAILWIND):
	@mkdir -p $(BIN)
	@echo "Downloading Tailwind $(TAILWIND_VERSION) (standalone)…"
	@os=$$(uname -s); arch=$$(uname -m); \
	case "$$os" in \
	  Darwin) case "$$arch" in \
	      arm64|aarch64) asset=tailwindcss-macos-arm64 ;; \
	      x86_64) asset=tailwindcss-macos-x64 ;; \
	    esac ;; \
	  Linux) case "$$arch" in \
	      x86_64) asset=tailwindcss-linux-x64 ;; \
	      aarch64|arm64) asset=tailwindcss-linux-arm64 ;; \
	    esac ;; \
	  *) echo "Unsupported OS: $$os (download Tailwind manually from github.com/tailwindlabs/tailwindcss/releases)" >&2; exit 1 ;; \
	esac; \
	curl -fsSL "https://github.com/tailwindlabs/tailwindcss/releases/download/$(TAILWIND_VERSION)/$$asset" -o $(TAILWIND)
	@chmod +x $(TAILWIND)
	@echo "Tailwind ready: $$($(TAILWIND) --help 2>&1 | head -1)"

# --- build / dev ------------------------------------------------------------

css: $(TAILWIND) ## Generate the Tailwind stylesheet once
	@$(TAILWIND) -i $(CSS_IN) -o $(CSS_OUT) --minify

css-watch: $(TAILWIND) ## Watch templates/content and regenerate CSS
	@$(TAILWIND) -i $(CSS_IN) -o $(CSS_OUT) --watch

dev: $(HUGO) $(TAILWIND) ## Local server at :1313 with live CSS rebuild
	@$(TAILWIND) -i $(CSS_IN) -o $(CSS_OUT) --minify
	@$(TAILWIND) -i $(CSS_IN) -o $(CSS_OUT) --watch & \
	tw=$$!; \
	trap 'kill $$tw 2>/dev/null' EXIT INT TERM; \
	$(HUGO) server --buildDrafts --disableFastRender

build: $(HUGO) $(TAILWIND) ## Production build to ./public
	@$(TAILWIND) -i $(CSS_IN) -o $(CSS_OUT) --minify
	@$(HUGO) --minify

clean: ## Remove build artifacts (public/, resources/, generated CSS)
	@rm -rf public resources $(CSS_OUT)

distclean: clean ## Also remove the downloaded toolchain (./bin)
	@rm -rf $(BIN)
