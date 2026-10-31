/* The knife or the wound: three beats of one event, each switchable. The
   verdict reads the combination left on the page. All on is the default, so
   the reader starts with everything explained and takes things away. */
window.WtWound = (function () {
  // Keyed by which beats are on: before, event, after (1 = on).
  var VERDICTS = {
    "111": { good: false, text: "Everything's on the page and it's clear. The update explains the breakfast before you get there, so the joke lands as a symptom instead of a shock." },
    "101": { good: true, text: "You know what he approved and you see what came back. The gap in the middle is where the reader flinches." },
    "001": { good: true, text: "Only the wound. The reader has to work out what happened from a joke told twice, and it's worse for it. This is the version the book wants." },
    "011": { good: false, text: "Strong, but the update tells the reader what to feel before breakfast does. Try cutting it." },
    "110": { good: false, text: "It ends on the procedure. We never see what it cost him." },
    "010": { good: false, text: "The knife with no wound: an odd medical moment with nothing to measure it against." },
    "100": { good: false, text: "A tap on a button and nothing after. The reader can't know it mattered." },
    "000": { good: false, text: "Nothing left on the page. Switch a beat back on." }
  };
  var ORDER = ["before", "event", "after"];

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var boxes = {};
    var beats = {};
    ORDER.forEach(function (k) {
      boxes[k] = root.querySelector('[data-wt-beat="' + k + '"]');
      beats[k] = root.querySelector('[data-wt-beat-text="' + k + '"]');
    });
    var verdict = root.querySelector("#wt-wound-verdict");

    function render() {
      var key = ORDER.map(function (k) {
        beats[k].hidden = !boxes[k].checked;
        return boxes[k].checked ? "1" : "0";
      }).join("");
      var v = VERDICTS[key];
      verdict.textContent = v.text;
      verdict.className = "vn-verdict " + (v.good ? "is-good" : "is-bad");
    }

    ORDER.forEach(function (k) { boxes[k].addEventListener("change", render); });
    root.querySelector("#wt-wound-pick").hidden = false;
    render();
  }

  return { init: init };
})();
