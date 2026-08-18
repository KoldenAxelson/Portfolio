// Passcode gate ("vault") — the client half of the `vault` shortcode. The
// protected content is not in the page: it ships as AES-256-GCM ciphertext in
// static/vault/<name>.json (sealed by `make seal` / scripts/vault-seal.go), and
// this module turns a correct keypad entry into the key that opens it.
// WebCrypto only — PBKDF2-SHA256 to derive the key, AES-GCM to decrypt — so a
// wrong code isn't "wrong" by an if-statement, it just fails to decrypt.
//
// The ciphertext is fetched as soon as the gate appears, not when the code is
// complete: it's a couple hundred KB for a sealed page, and by the fourth
// keypress it has almost always arrived, so unlocking feels instant. The fetch
// cost falls only on visitors of gate pages, which are hidden and shared by
// direct link.
//
// Render modes (recorded in the sealed JSON, decided at seal time):
//   document — the plaintext is a complete standalone page (the GrowGo pitch);
//              document.write() hands the tab over to it wholesale. Its own
//              styles and scripts run; the URL (and any ?ref= parameter the
//              content reads) stays put. htmx goes down with the old document,
//              so back/forward becomes full page loads — which re-lock. Good.
//   fragment — the plaintext is a snippet; it's revealed in [data-vault-outlet]
//              under the gate, with its <script> tags re-created so they run
//              (innerHTML alone executes nothing).

type VaultPayload = {
  v: number;
  kdf: string;
  iter: number;
  digits: number;
  render: 'document' | 'fragment';
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64
};

type Vault = {
  press(digit: string): void;
  erase(): void;
  clear(): void;
  relock(): void;
  hasInput(): boolean;
};

// Controllers keyed by gate element. hx-boost swaps <body>, so elements (and
// their WeakMap entries) fall away with the old DOM while the module-level
// document listeners below stay bound once for the page's lifetime.
const vaults = new WeakMap<HTMLElement, Vault>();
let bound = false;

// Return type is the ArrayBuffer-backed flavour explicitly: TypeScript ≥5.7
// makes typed arrays generic, and SubtleCrypto's BufferSource refuses the
// wider Uint8Array<ArrayBufferLike> default.
function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
}

async function decrypt(payload: VaultPayload, code: string): Promise<string> {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(payload.salt), iterations: payload.iter, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(payload.iv) }, key, fromBase64(payload.ct));
  return new TextDecoder().decode(plain);
}

function createVault(root: HTMLElement): Vault | null {
  const gate = root.querySelector<HTMLElement>('[data-vault-gate]');
  const outlet = root.querySelector<HTMLElement>('[data-vault-outlet]');
  const dotsRow = root.querySelector<HTMLElement>('[data-vault-dots]');
  const status = root.querySelector<HTMLElement>('[data-vault-status]');
  const src = root.dataset.vaultSrc;
  if (!gate || !outlet || !dotsRow || !status || !src) return null;

  let buffer = '';
  let busy = false;
  let payload: VaultPayload | null = null;
  let loading: Promise<VaultPayload> | null = null;

  const say = (message: string): void => {
    status.textContent = message;
  };

  // A back/forward restore (htmx history or bfcache) can resurrect the gate
  // with stale dot state snapshotted into its markup. Start honest: empty.
  const paint = (): void => {
    const dots = Array.from(dotsRow.querySelectorAll<HTMLElement>('[data-vault-dot]'));
    dots.forEach((dot, i) => {
      if (i < buffer.length) dot.setAttribute('data-filled', '');
      else dot.removeAttribute('data-filled');
    });
  };

  // The sealed JSON knows the code length; the markup guesses four dots to
  // avoid a layout shift. Reconcile once the metadata is in.
  const sizeDots = (digits: number): void => {
    const dots = dotsRow.querySelectorAll('[data-vault-dot]');
    for (let i = dots.length; i < digits; i++) {
      const dot = document.createElement('span');
      dot.setAttribute('data-vault-dot', '');
      dotsRow.appendChild(dot);
    }
    for (let i = dots.length; i > digits; i--) dots[i - 1]?.remove();
  };

  const load = (): Promise<VaultPayload> => {
    loading ??= fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<VaultPayload>;
      })
      .then((data) => {
        payload = data;
        sizeDots(data.digits);
        return data;
      })
      .catch((err: unknown) => {
        loading = null; // a failed fetch (offline, mid-deploy) retries on the next digit
        throw err;
      });
    return loading;
  };

  const reject = (): void => {
    buffer = '';
    paint();
    say('Wrong code. Try again.');
    gate.setAttribute('data-vault-shake', '');
    // animationend never fires under prefers-reduced-motion, so also time out.
    const disarm = (): void => gate.removeAttribute('data-vault-shake');
    gate.addEventListener('animationend', disarm, { once: true });
    window.setTimeout(disarm, 400);
  };

  const reveal = (html: string, render: VaultPayload['render']): void => {
    if (render === 'document') {
      // Hand the tab to the unlocked page. Everything of the old page —
      // including this module — is torn down, which is the point.
      document.open();
      document.write(html);
      document.close();
      // One thing must outlive the teardown: an answer to Back. hx-boost made
      // the site's internal navigations pushState entries that all share the
      // document the unlocked page just wrote over, and document.open()
      // erased htmx along with every listener that used to serve them. A
      // Back/Forward across those entries is a *same-document* traversal:
      // the browser swaps the URL, restores that entry's old scroll offset,
      // fires popstate — and nothing else happens, leaving the unlocked page
      // on screen at a random scroll under the wrong URL. This listener is
      // attached after close(), so it survives the wipe and belongs to the
      // new page: any traversal that changes the address becomes a real load
      // of the destination (which also re-locks the gate on the way back
      // in). Hash-only moves within the unlocked page stay native.
      const here = location.pathname + location.search;
      window.addEventListener('popstate', () => {
        if (location.pathname + location.search !== here) window.location.reload();
      });
      return;
    }
    outlet.innerHTML = html;
    // innerHTML parses <script> inert by spec; re-create each one so fragment
    // payloads can be interactive too.
    for (const dead of Array.from(outlet.querySelectorAll('script'))) {
      const script = document.createElement('script');
      for (const attr of Array.from(dead.attributes)) script.setAttribute(attr.name, attr.value);
      script.textContent = dead.textContent;
      dead.replaceWith(script);
    }
    gate.hidden = true;
    root.setAttribute('data-vault-open', '');
    outlet.hidden = false;
    outlet.focus({ preventScroll: true });
  };

  const relock = (): void => {
    outlet.innerHTML = '';
    outlet.hidden = true;
    root.removeAttribute('data-vault-open');
    gate.hidden = false;
    buffer = '';
    paint();
    say('');
  };

  const submit = async (): Promise<void> => {
    busy = true;
    say('Checking…');
    const code = buffer;
    try {
      const data = payload ?? (await load());
      const html = await decrypt(data, code);
      say('');
      reveal(html, data.render);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'OperationError') {
        // AES-GCM authentication failed — that's "wrong code" in WebCrypto.
        reject();
      } else {
        buffer = '';
        paint();
        say("Couldn't load the sealed file. Check the connection and try again.");
      }
    } finally {
      busy = false;
    }
  };

  const vault: Vault = {
    press(digit: string): void {
      if (busy || root.hasAttribute('data-vault-open')) return;
      if (payload && buffer.length >= payload.digits) return;
      buffer += digit;
      paint();
      say('');
      const wanted = payload?.digits ?? Infinity;
      if (buffer.length >= wanted) {
        void submit();
      } else if (!payload) {
        // First keypress kicks off the ciphertext fetch; when the metadata
        // lands mid-entry, check whether the buffer is already long enough.
        void load()
          .then((data) => {
            if (!busy && buffer.length >= data.digits) void submit();
          })
          .catch(() => say("Couldn't load the sealed file. Check the connection and try again."));
      }
    },
    erase(): void {
      if (busy) return;
      buffer = buffer.slice(0, -1);
      paint();
    },
    clear(): void {
      if (busy) return;
      buffer = '';
      paint();
      say('');
    },
    relock,
    hasInput(): boolean {
      return buffer.length > 0;
    },
  };

  // Secure-context guard: crypto.subtle exists on https and localhost, which
  // covers production and `make dev`. Anywhere else, say so instead of
  // presenting a keypad that can never open.
  if (!window.crypto?.subtle) {
    say('This gate needs a secure (https) connection to unlock.');
    return vault;
  }

  paint();
  say('');
  void load().catch(() => {
    // Quiet at init — the visitor hasn't typed yet. Surfaced on submit instead.
  });

  for (const key of Array.from(gate.querySelectorAll<HTMLButtonElement>('[data-vault-key]'))) {
    key.addEventListener('click', () => vault.press(key.dataset.vaultKey || ''));
  }
  gate.querySelector('[data-vault-erase]')?.addEventListener('click', () => vault.erase());
  gate.querySelector('[data-vault-clear]')?.addEventListener('click', () => vault.clear());

  return vault;
}

function activeVault(): Vault | undefined {
  const root = document.querySelector<HTMLElement>('[data-vault]:not([data-vault-open])');
  return root ? vaults.get(root) : undefined;
}

export function initVault(): void {
  for (const root of Array.from(document.querySelectorAll<HTMLElement>('[data-vault]'))) {
    if (vaults.has(root)) continue;
    const vault = createVault(root);
    if (vault) vaults.set(root, vault);
  }

  if (bound) return;
  bound = true;

  // htmx snapshots <body> into history storage before a boosted navigation; an
  // unlocked fragment must not ride along into localStorage. Bubbles from
  // <body>, so it's caught here at the document. (Document mode never gets
  // here — htmx is gone once the unlocked page takes over the tab.)
  document.addEventListener('htmx:beforeHistorySave', () => {
    for (const root of Array.from(document.querySelectorAll<HTMLElement>('[data-vault][data-vault-open]'))) {
      vaults.get(root)?.relock();
    }
  });

  // Physical keyboard support, wired once and live-queried (same pattern as
  // auxiliary-button.ts) so it survives hx-boost body swaps. Typing in a real
  // input (the /misc filter, say) is never hijacked.
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const vault = activeVault();
    if (!vault) return;
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      vault.press(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      vault.erase();
    } else if (e.key === 'Escape' && vault.hasInput()) {
      e.preventDefault();
      vault.clear();
    }
  });
}
