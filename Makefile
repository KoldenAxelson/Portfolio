# Portfolio — build tooling. Node-free: `make setup` fetches the Hugo + Tailwind
# binaries into ./bin. Then `make dev` (live server) or `make build`. `make
# typecheck` runs the native tsgo type-checker. See `make help`.

# Pinned for reproducible builds.
HUGO_VERSION     := 0.140.2
TAILWIND_VERSION := v4.3.0
# tsgo = TypeScript's native Go compiler (a single binary, no Node). It has no
# GitHub releases yet, so the binary is pulled from its official npm-registry
# tarball via curl — no npm CLI, no node_modules. This is a TS7 preview build.
TSGO_VERSION     := 7.0.0-dev.20260527.2

BIN      := bin
HUGO     := $(BIN)/hugo
TAILWIND := $(BIN)/tailwindcss
TSGO_DIR := $(BIN)/tsgo-dist
TSGO     := $(TSGO_DIR)/tsgo

CSS_IN   := assets/css/main.css
CSS_OUT  := assets/css/app.css

# WebAssembly games. Each game is a separate Rust crate (living outside this
# repo) that compiles to wasm and is blitted onto a 2D canvas. Its own
# scripts/build-web.sh recompiles and drops the .wasm into assets/wasm/<game>/,
# which Hugo fingerprints at build time. Override a path if your checkout differs,
# e.g. `make spinmasters SPINMASTERS_DIR=/path/to/spinmasters`.
SPINMASTERS_DIR ?= ../Playgrounds/Rust/spinmasters

# AI chat proxy (Go, stdlib-only — see SPEC-ai-agent.md). The binary is built
# into its own dir and is gitignored; never commit it.
AI_PROXY_DIR := ai-proxy
AI_PROXY_BIN := $(AI_PROXY_DIR)/ai-proxy
AI_CONTEXT   := CONTEXT.md
AI_PORT      := 6573    # localhost-only proxy port (ASCII "AI" = 65,73). Must
                        # match the proxy default in ai-proxy/main.go, PROXY_PORT
                        # in scripts/setup-ai-tunnel.sh, and the tunnel ingress.
# Default to whatever model Ollama actually has installed (first one listed), so
# `make ai-proxy-run` just works without respecifying. Override with AI_MODEL=…
# `?=` means an AI_MODEL from the environment wins and skips this detection.
AI_MODEL     ?= $(shell command -v ollama >/dev/null 2>&1 && ollama list 2>/dev/null | awk 'NR==2 {print $$1}')

.PHONY: help setup dev build css css-watch typecheck clean distclean ai-proxy ai-proxy-run ai-proxy-stop spinmasters games

help: ## Show this help
	@echo "Portfolio — available commands:"
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

# tsgo ships its bundled lib/*.d.ts alongside the binary, so we extract the
# whole package/lib dir (flattened) — not just the executable.
$(TSGO):
	@mkdir -p $(TSGO_DIR)
	@echo "Downloading tsgo $(TSGO_VERSION) (native TypeScript compiler)…"
	@os=$$(uname -s); arch=$$(uname -m); \
	case "$$os" in \
	  Darwin) case "$$arch" in \
	      arm64|aarch64) plat=darwin-arm64 ;; \
	      x86_64) plat=darwin-x64 ;; \
	    esac ;; \
	  Linux) case "$$arch" in \
	      x86_64) plat=linux-x64 ;; \
	      aarch64|arm64) plat=linux-arm64 ;; \
	    esac ;; \
	  *) echo "Unsupported OS: $$os" >&2; exit 1 ;; \
	esac; \
	[ -n "$$plat" ] || { echo "Unsupported arch: $$arch" >&2; exit 1; }; \
	pkg="native-preview-$$plat"; \
	url="https://registry.npmjs.org/@typescript/$$pkg/-/$$pkg-$(TSGO_VERSION).tgz"; \
	curl -fsSL "$$url" | tar -xz -C $(TSGO_DIR) --strip-components=2 package/lib
	@chmod +x $(TSGO)
	@echo "tsgo ready: $$($(TSGO) --version)"

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

typecheck: $(TSGO) ## Type-check the TypeScript with tsgo (no emit)
	@$(TSGO) --noEmit -p tsconfig.json
	@echo "Type-check passed."

# --- WebAssembly games ------------------------------------------------------
# `make spinmasters` rebuilds the game's wasm and copies it into assets/wasm/.
# Run it after changing the game; the committed .wasm is what the site serves
# (so `make build` itself never needs Rust). Add a future game by mirroring this
# target with its own _DIR variable — and add it to the `games` aggregate below.

spinmasters: ## Rebuild the SpinMasters wasm from its repo into assets/wasm/
	@command -v cargo >/dev/null 2>&1 || { echo "Rust not found on PATH — install from https://rustup.rs" >&2; exit 1; }
	@[ -d "$(SPINMASTERS_DIR)" ] || { echo "SpinMasters repo not found at $(SPINMASTERS_DIR) — override: make spinmasters SPINMASTERS_DIR=/path/to/spinmasters" >&2; exit 1; }
	@echo "Building SpinMasters wasm from $(SPINMASTERS_DIR)…"
	@cd "$(SPINMASTERS_DIR)" && bash scripts/build-web.sh "$(CURDIR)"

games: spinmasters ## Rebuild every game's wasm

# --- AI chat proxy ----------------------------------------------------------

ai-proxy: ## Build the AI chat proxy binary (needs Go on PATH)
	@command -v go >/dev/null 2>&1 || { echo "Go not found on PATH — install from https://go.dev/dl/" >&2; exit 1; }
	@cd $(AI_PROXY_DIR) && go build -o ai-proxy main.go
	@echo "Built $(AI_PROXY_BIN)"

ai-proxy-run: ai-proxy ## Build + run the proxy (env: AI_PROXY_SECRET; AI_MODEL optional)
	@[ -n "$$AI_PROXY_SECRET" ] || { echo "Set AI_PROXY_SECRET first: export AI_PROXY_SECRET=…" >&2; exit 1; }
	@model='$(AI_MODEL)'; model="$${model:-llama3.2}"; \
	  echo "Running ai-proxy on :$(AI_PORT) (model $$model, context $(AI_CONTEXT))…"; \
	  cd $(AI_PROXY_DIR) && ./ai-proxy -context ../$(AI_CONTEXT) -port $(AI_PORT) -model "$$model"

# Stop our proxy by exact executable name (NOT by port, NOT by args), so it
# catches every ai-proxy instance regardless of how it was started, while never
# touching an unrelated app on :$(AI_PORT), `make`, `go build`, or its own shell
# (those have different process names). Run `ai-proxy-run` again to restart.
ai-proxy-stop: ## Stop all running ai-proxy instances (started by ai-proxy-run)
	@if pkill -x ai-proxy 2>/dev/null; then \
	  echo "Stopped ai-proxy."; \
	else \
	  echo "No running ai-proxy found."; \
	  echo "If :$(AI_PORT) is still busy, another app holds it — check: lsof -nP -i :$(AI_PORT)"; \
	fi

clean: ## Remove build artifacts (public/, resources/, generated CSS, proxy binary)
	@rm -rf public resources $(CSS_OUT) $(AI_PROXY_BIN)

distclean: clean ## Also remove the downloaded toolchain (./bin)
	@rm -rf $(BIN)
