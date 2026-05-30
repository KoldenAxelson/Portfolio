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

.PHONY: help setup dev build css css-watch typecheck clean distclean

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

clean: ## Remove build artifacts (public/, resources/, generated CSS)
	@rm -rf public resources $(CSS_OUT)

distclean: clean ## Also remove the downloaded toolchain (./bin)
	@rm -rf $(BIN)
