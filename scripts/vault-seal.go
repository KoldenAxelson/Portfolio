// vault-seal — seal an HTML file into a passcode-locked "vault":
// static/vault/<name>.json, the ciphertext that the vault shortcode serves and
// assets/scripts/site/vault.ts opens in the browser.
//
// Run it through the Makefile, which supplies the paths:
//
//	make seal NAME=growgo IN=../GrowGo/pitch/web/index.html
//	VAULT_CODE=4769 make seal NAME=growgo IN=…   (non-interactive)
//
// The passcode is read from -code, then $VAULT_CODE, then a stdin prompt — it
// is never written anywhere. Re-sealing generates a fresh salt and IV, so the
// output changes even when the content and code don't; that's correct, commit
// the new file.
//
// Format (all the browser needs to derive the same key WebCrypto-side):
// PBKDF2-HMAC-SHA256 (600k iterations) stretches the code into an AES-256 key;
// AES-GCM seals the page (the 16-byte auth tag rides at the end of ct, which
// is exactly where SubtleCrypto.decrypt expects it). PBKDF2 is hand-rolled
// below — ~25 lines of RFC 8018 — so this stays stdlib-only on any Go, not
// just 1.24+ where crypto/pbkdf2 landed. Same zero-dependency rule as
// ai-proxy.
//
// Honesty note, also printed on every seal: a 4-digit code is 10,000 guesses.
// This keeps a page out of search engines, scrapers, and casual view-source —
// it will not resist a determined offline brute-force. Use more digits when a
// page warrants it; the keypad follows whatever length was sealed.
package main

import (
	"bufio"
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type sealed struct {
	V      int    `json:"v"`
	KDF    string `json:"kdf"`
	Iter   int    `json:"iter"`
	Digits int    `json:"digits"`
	Render string `json:"render"`
	Salt   string `json:"salt"`
	IV     string `json:"iv"`
	CT     string `json:"ct"`
}

// pbkdf2SHA256 implements RFC 8018 §5.2 with HMAC-SHA256 as the PRF. Verified
// end-to-end against WebCrypto's PBKDF2 by the browser-side unlock.
func pbkdf2SHA256(password, salt []byte, iter, keyLen int) []byte {
	prf := hmac.New(sha256.New, password)
	hashLen := prf.Size()
	blocks := (keyLen + hashLen - 1) / hashLen

	dk := make([]byte, 0, blocks*hashLen)
	blockIndex := make([]byte, 4)
	u := make([]byte, hashLen)
	t := make([]byte, hashLen)

	for block := 1; block <= blocks; block++ {
		prf.Reset()
		prf.Write(salt)
		binary.BigEndian.PutUint32(blockIndex, uint32(block))
		prf.Write(blockIndex)
		u = prf.Sum(u[:0])
		copy(t, u)
		for n := 2; n <= iter; n++ {
			prf.Reset()
			prf.Write(u)
			u = prf.Sum(u[:0])
			for i := range t {
				t[i] ^= u[i]
			}
		}
		dk = append(dk, t...)
	}
	return dk[:keyLen]
}

func fail(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "vault-seal: "+format+"\n", args...)
	os.Exit(1)
}

func main() {
	in := flag.String("in", "", "plaintext HTML to seal (required)")
	out := flag.String("out", "", "sealed JSON destination, e.g. static/vault/growgo.json (required)")
	render := flag.String("render", "auto", "how the browser reveals it: document | fragment | auto (auto sniffs a standalone page by its <!doctype…/<html… prefix)")
	iter := flag.Int("iter", 600_000, "PBKDF2 iterations (must match nothing — the value is stored in the JSON)")
	code := flag.String("code", "", "numeric passcode; falls back to $VAULT_CODE, then an interactive prompt")
	flag.Parse()

	if *in == "" || *out == "" {
		fail("both -in and -out are required (run through `make seal NAME=…`)")
	}

	pass := strings.TrimSpace(*code)
	if pass == "" {
		pass = strings.TrimSpace(os.Getenv("VAULT_CODE"))
	}
	if pass == "" {
		// Plain stdin, not a hidden prompt — hiding input would drag in
		// x/term and break the stdlib-only rule for a code that is, by
		// design, only door-lock secret.
		fmt.Fprint(os.Stderr, "Passcode (digits, 4+): ")
		line, err := bufio.NewReader(os.Stdin).ReadString('\n')
		if err != nil {
			fail("reading passcode: %v", err)
		}
		pass = strings.TrimSpace(line)
	}
	if len(pass) < 4 {
		fail("passcode %q is shorter than 4 digits", pass)
	}
	for _, r := range pass {
		if r < '0' || r > '9' {
			fail("passcode must be digits only — the gate is a numeric keypad")
		}
	}

	plain, err := os.ReadFile(*in)
	if err != nil {
		fail("reading %s: %v", *in, err)
	}

	mode := *render
	if mode == "auto" {
		head := strings.ToLower(string(bytes.TrimSpace(plain)[:min(64, len(bytes.TrimSpace(plain)))]))
		if strings.HasPrefix(head, "<!doctype") || strings.HasPrefix(head, "<html") {
			mode = "document"
		} else {
			mode = "fragment"
		}
	}
	if mode != "document" && mode != "fragment" {
		fail("-render must be document, fragment, or auto (got %q)", mode)
	}

	salt := make([]byte, 16)
	iv := make([]byte, 12)
	if _, err := rand.Read(salt); err != nil {
		fail("generating salt: %v", err)
	}
	if _, err := rand.Read(iv); err != nil {
		fail("generating iv: %v", err)
	}

	block, err := aes.NewCipher(pbkdf2SHA256([]byte(pass), salt, *iter, 32))
	if err != nil {
		fail("aes: %v", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		fail("gcm: %v", err)
	}
	ct := gcm.Seal(nil, iv, plain, nil)

	b64 := base64.StdEncoding.EncodeToString
	payload, err := json.MarshalIndent(sealed{
		V:      1,
		KDF:    "PBKDF2-SHA256",
		Iter:   *iter,
		Digits: len(pass),
		Render: mode,
		Salt:   b64(salt),
		IV:     b64(iv),
		CT:     b64(ct),
	}, "", "  ")
	if err != nil {
		fail("encoding: %v", err)
	}

	if err := os.MkdirAll(filepath.Dir(*out), 0o755); err != nil {
		fail("creating %s: %v", filepath.Dir(*out), err)
	}
	if err := os.WriteFile(*out, append(payload, '\n'), 0o644); err != nil {
		fail("writing %s: %v", *out, err)
	}

	fmt.Printf("Sealed %s → %s (%d bytes plain → %d bytes json, %d-digit code, render: %s)\n",
		*in, *out, len(plain), len(payload), len(pass), mode)
	fmt.Println("Reminder: a short numeric code deters crawlers and curiosity, not a brute-force script.")
}
