/* Who said it? Each untagged line gets three buttons; picking one locks the
   line and shows the speaker. The answers live in the markup (data-wt-who on
   each <li>), so the lines read in order with JS off. */
window.WtVoices = (function () {
  var PEOPLE = [
    { key: "owen", name: "Owen" },
    { key: "andre", name: "Andre" },
    { key: "kevin", name: "Kevin" }
  ];

  function nameOf(key) {
    return PEOPLE.filter(function (p) { return p.key === key; })[0].name;
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var lines = Array.prototype.slice.call(root.querySelectorAll("#wt-voices-list > li"));
    var verdict = root.querySelector("#wt-voices-verdict");
    var progress = root.querySelector("#wt-voices-progress");
    var segs = lines.map(function () {
      var seg = document.createElement("span");
      progress.appendChild(seg);
      return seg;
    });
    var tally = document.createElement("b");
    progress.appendChild(tally);
    progress.hidden = false;

    function paintProgress() {
      lines.forEach(function (li, i) {
        segs[i].className = li.classList.contains("is-right") ? "is-right" : li.classList.contains("is-wrong") ? "is-wrong" : "";
      });
      tally.textContent = answered + " / " + lines.length;
    }
    var answered = 0;
    var right = 0;

    function finish() {
      paintProgress();
      if (answered < lines.length) {
        verdict.textContent = right + " of " + answered + " so far.";
        verdict.className = "vn-verdict";
        return;
      }
      var missed = lines.filter(function (li) { return li.classList.contains("is-wrong"); }).length;
      verdict.textContent = right + " of " + lines.length + ". " + (missed
        ? "Look at the line" + (missed === 1 ? "" : "s") + " you missed: what would make it sound like only one of them?"
        : "Every voice held without a single tag. That's the test he means.");
      verdict.className = "vn-verdict " + (missed > 1 ? "is-bad" : "is-good");
      again.hidden = false;
    }

    var again = document.createElement("button");
    again.type = "button";
    again.className = "vn-btn vn-btn-ghost wt-voices-again";
    again.textContent = "Try again";
    again.hidden = true;
    again.addEventListener("click", function () {
      answered = 0;
      right = 0;
      lines.forEach(function (li) {
        li.classList.remove("is-right", "is-wrong");
        Array.prototype.forEach.call(li.querySelectorAll(".is-truth"), function (x) { x.classList.remove("is-truth"); });
        li.querySelector(".wt-voices-answer").textContent = "";
        Array.prototype.forEach.call(li.querySelectorAll("button"), function (b) {
          b.disabled = false;
          b.setAttribute("aria-pressed", "false");
        });
      });
      again.hidden = true;
      verdict.textContent = "";
      verdict.className = "vn-verdict";
      paintProgress();
      lines[0].querySelector("button").focus();
    });

    paintProgress();
    lines.forEach(function (li, i) {
      var truth = li.getAttribute("data-wt-who");
      var group = document.createElement("div");
      group.className = "wt-voices-pick";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Who said line " + (i + 1) + "?");
      var answer = document.createElement("span");
      answer.className = "wt-voices-answer";
      answer.setAttribute("aria-live", "polite");
      PEOPLE.forEach(function (p) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "wt-opt";
        b.setAttribute("data-who", p.key);
        b.textContent = p.name;
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () {
          var ok = p.key === truth;
          answered += 1;
          if (ok) right += 1;
          li.classList.add(ok ? "is-right" : "is-wrong");
          b.setAttribute("aria-pressed", "true");
          Array.prototype.forEach.call(group.querySelectorAll("button"), function (x) {
            x.disabled = true;
            if (x.getAttribute("data-who") === truth) x.classList.add("is-truth");
          });
          answer.textContent = ok ? "Right" : "It was " + nameOf(truth);
          finish();
        });
        group.appendChild(b);
      });
      group.appendChild(answer);
      li.appendChild(group);
    });
    verdict.parentNode.insertBefore(again, verdict.nextSibling);
  }

  return { init: init };
})();
