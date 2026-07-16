/* Tokenizer playground — type text, watch it split into tokens.
   This is a SIMPLIFIED tokenizer: it uses GPT-2-style pre-tokenization (words carry
   their leading space, punctuation and numbers split off) and then chops long words
   into subword chunks the way real byte-pair encoding tends to. It is an approximation
   — real tokenizers learn their splits from data — but it captures the behavior that
   matters here: tokens aren't words and aren't characters, and the count is what you pay for. */
window.MliTok = (function () {
  var PRE = /'s|'t|'re|'ve|'m|'ll|'d| ?[\p{L}]+| ?[\p{N}]+| ?[^\s\p{L}\p{N}]+|\s+/gu;
  var PALETTE = ["52,152,219", "46,204,113", "230,176,20", "231,76,60", "155,89,182", "26,188,156"];

  function isWS(t) { return /^\s+$/.test(t); }
  function subsplit(tok) {
    if (isWS(tok)) return [tok];
    var lead = tok.charAt(0) === " ", body = lead ? tok.slice(1) : tok, pieces;
    if (/^[\p{L}]+$/u.test(body) && body.length > 6) {
      pieces = []; for (var i = 0; i < body.length; i += 5) pieces.push(body.slice(i, i + 5));
    } else if (/^[\p{N}]+$/u.test(body) && body.length > 3) {
      pieces = []; for (var j = 0; j < body.length; j += 3) pieces.push(body.slice(j, j + 3));
    } else pieces = [body];
    if (lead) pieces[0] = " " + pieces[0];
    return pieces;
  }
  function tokenize(text) {
    var out = [], m;
    PRE.lastIndex = 0;
    while ((m = PRE.exec(text)) !== null) {
      if (m[0] === "") { PRE.lastIndex++; continue; }
      var parts = subsplit(m[0]);
      for (var i = 0; i < parts.length; i++) out.push(parts[i]);
    }
    return out;
  }

  function init(root) {
    if (!root) return;
    var ta = root.querySelector("#mli-tok-in");
    var chips = root.querySelector("#mli-tok-chips");
    var stat = root.querySelector("#mli-tok-stat");
    if (!ta || !chips) return;

    function render() {
      var text = ta.value;
      var toks = tokenize(text);
      chips.innerHTML = "";
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i], el = document.createElement("span");
        if (isWS(t)) {
          el.className = "mli-tok-chip mli-tok-ws";
          el.textContent = /\n/.test(t) ? "⏎" : "␣";
        } else {
          el.className = "mli-tok-chip";
          var hue = PALETTE[i % PALETTE.length];
          el.style.background = "rgba(" + hue + ",0.20)";
          el.style.borderColor = "rgba(" + hue + ",0.55)";
          if (t.charAt(0) === " ") {
            var sp = document.createElement("span"); sp.className = "mli-tok-lead"; sp.textContent = "·";
            el.appendChild(sp); el.appendChild(document.createTextNode(t.slice(1)));
          } else {
            el.textContent = t;
          }
        }
        chips.appendChild(el);
      }
      if (stat) {
        var chars = text.length, n = toks.length;
        var cpt = n ? (chars / n).toFixed(1) : "0";
        stat.innerHTML = "<b>" + n + "</b> token" + (n === 1 ? "" : "s") + " · " + chars +
          " characters · ~" + cpt + " chars/token. This count is exactly what the cost demo above was billing per request.";
      }
    }
    ta.addEventListener("input", render);
    render();
  }

  return { init: init, tokenize: tokenize };
})();
