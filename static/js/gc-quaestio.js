/* The quaestio — Aquinas's ordering, enforced.

   This is the one module on the page that is a tool rather than an illustration.
   Every field after the question is locked until the one before it is filled,
   which means you physically cannot write your own answer until you have written
   three objections to it. That constraint IS the method; a version of this form
   with all the fields open would teach nothing, because everyone would fill in
   the answer first and back-fill the objections to lose to it.

   The unanswered-objection flag at the end is the second half of Abelard: an
   objection you cannot reply to is not an inconvenience to the position you
   wrote, it is the position you actually hold. */
window.GcQuaestio = (function () {
  var MIN = 12; /* characters — enough that "idk" doesn't unlock the next stage */

  function init(root) {
    if (!root || root.getAttribute("data-gc-ready")) return;
    root.setAttribute("data-gc-ready", "1");

    var stages = [].slice.call(root.querySelectorAll("[data-gc-stage]"));
    var out = root.querySelector("#gc-q-out");
    var build = root.querySelector("#gc-q-build");
    var copy = root.querySelector("#gc-q-copy");
    var status = root.querySelector("#gc-q-status");
    if (!stages.length || !out) return;

    function val(sel) { var el = root.querySelector(sel); return el ? el.value.trim() : ""; }
    function filled(stage) {
      var fs = stage.querySelectorAll("input,textarea"), ok = true;
      for (var i = 0; i < fs.length; i++) if (fs[i].value.trim().length < MIN) ok = false;
      return ok;
    }

    /* The replies stage is reachable-but-not-required, and that asymmetry is the
       point rather than an oversight. Requiring all three replies before the
       article would assemble made the unanswered-objection flag below literally
       unreachable — the form would only ever emit articles where every objection
       had been answered, which is the one outcome the method is least interested
       in. You are allowed to finish with an objection you could not answer. You
       are simply told what that means. */
    function sync() {
      var open = true, ready = true, firstLocked = null, repliesShort = false;
      for (var i = 0; i < stages.length; i++) {
        var s = stages[i];
        var optional = s.hasAttribute("data-gc-optional");
        s.classList.toggle("is-locked", !open);
        var fs = s.querySelectorAll("input,textarea");
        for (var j = 0; j < fs.length; j++) fs[j].disabled = !open;
        if (open && !filled(s)) {
          if (optional) { repliesShort = true; }
          else { ready = false; if (!firstLocked) firstLocked = s; }
          open = false;
        }
      }
      build.disabled = !ready;
      if (ready && repliesShort) {
        status.textContent = "You can assemble it now. Any reply you leave blank gets flagged — that is allowed, and it is the interesting case.";
        status.className = "gc-q-status is-ready";
      } else if (ready) {
        status.textContent = "Every objection answered. Assemble it.";
        status.className = "gc-q-status is-ready";
      } else if (firstLocked) {
        status.textContent = firstLocked.getAttribute("data-gc-hint") || "";
        status.className = "gc-q-status";
      }
    }

    function assemble() {
      var q = val("#gc-q-question");
      var objs = [val("#gc-q-o1"), val("#gc-q-o2"), val("#gc-q-o3")];
      var sc = val("#gc-q-sc");
      var resp = val("#gc-q-resp");
      var reps = [val("#gc-q-r1"), val("#gc-q-r2"), val("#gc-q-r3")];

      var html = '<div class="gc-q-art">';
      html += '<h4 class="gc-q-art-q">' + esc(q) + "</h4>";
      for (var i = 0; i < 3; i++) {
        html += '<p class="gc-q-art-p"><b>Objection ' + (i + 1) + ".</b> " + esc(objs[i]) + "</p>";
      }
      html += '<p class="gc-q-art-p gc-q-art-sc"><b>On the contrary,</b> ' + esc(sc) + "</p>";
      html += '<p class="gc-q-art-p gc-q-art-resp"><b>I answer that,</b> ' + esc(resp) + "</p>";
      for (i = 0; i < 3; i++) {
        var weak = reps[i].length < MIN;
        html += '<p class="gc-q-art-p' + (i === 0 ? " gc-q-art-reps" : "") + (weak ? " is-weak" : "") +
          '"><b>Reply to Objection ' + (i + 1) + ".</b> " + esc(reps[i]) + "</p>";
      }
      html += "</div>";

      var unanswered = [];
      for (i = 0; i < 3; i++) if (reps[i].length < MIN) unanswered.push(i + 1);
      if (unanswered.length) {
        html += '<div class="gc-q-flag">Objection' + (unanswered.length > 1 ? "s " : " ") +
          unanswered.join(" and ") + " went unanswered. That is not a gap in the article — " +
          "that is your actual position, and the answer above it is the one you wish you held. " +
          "Abelard would have stopped here and left it standing.</div>";
      }
      out.innerHTML = html;
      out.hidden = false;
      copy.hidden = false;
      copy.textContent = "Copy as text";
    }

    copy.addEventListener("click", function () {
      var text = out.innerText || out.textContent || "";
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy as text"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { copy.textContent = "Select it and copy"; });
      } else { copy.textContent = "Select it and copy"; }
    });

    build.addEventListener("click", assemble);
    root.addEventListener("input", sync);
    sync();
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  return { init: init };
})();
