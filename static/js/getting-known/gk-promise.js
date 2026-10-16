/* Guarantee or hope: the overdeliver rule from the sales video, as a sort.
   Each promise goes in one of two columns; checking it marks the misses and
   then writes the honest pitch from the reader's own split, which is the
   thing the video says to say out loud. */
window.GkPromise = (function () {
  var ITEMS = [
    { text: "We'll get you into every major newspaper.", isGuarantee: false, why: "Journalists decide that. Promising it is how the PR firms that lost him lost him." },
    { text: "We'll write a strong press release.", isGuarantee: true, why: "Entirely in their hands." },
    { text: "We'll take good photos for the press.", isGuarantee: true, why: "In their hands too." },
    { text: "We'll send it to a good list of journalists who should cover you.", isGuarantee: true, why: "The list and the sending are theirs to control." },
    { text: "Those journalists will write about you.", isGuarantee: false, why: "The one outcome everyone wants, and the one nobody controls." },
    { text: "Your app will pass App Store review on the first try.", isGuarantee: false, why: "Apple's reviewers decide that, not me." },
    { text: "I'll fix every bug you report in the first 30 days.", isGuarantee: true, why: "Scoped, dated and mine to do." },
    { text: "The app will hit 10,000 downloads.", isGuarantee: false, why: "A hope, and a fine one to say out loud as a hope." },
    { text: "You'll get a working build to test every Friday.", isGuarantee: true, why: "A schedule I set and keep." }
  ];

  // Mid-sentence form of a promise: drop the full stop and lower the first
  // letter, except the pronoun "I".
  function asClause(text) {
    var clause = text.replace(/\.$/, "");
    return /^I\b/.test(clause) ? clause : clause.charAt(0).toLowerCase() + clause.slice(1);
  }

  function init(root) {
    if (!root || root.getAttribute("data-gk-ready")) return;
    root.setAttribute("data-gk-ready", "1");

    var list = root.querySelector("#gk-pr-list");
    var check = root.querySelector("#gk-pr-check");
    var reset = root.querySelector("#gk-pr-reset");
    var out = root.querySelector("#gk-pr-out");
    var picks = [];

    function render() {
      list.innerHTML = "";
      for (var i = 0; i < ITEMS.length; i++) list.appendChild(buildRow(i));
    }

    function buildRow(index) {
      var li = document.createElement("li");
      li.className = "gk-pr-row";
      li.innerHTML = '<span class="gk-pr-text"></span><span class="gk-pr-pick" role="group"></span><span class="gk-pr-why"></span>';
      li.querySelector(".gk-pr-text").textContent = ITEMS[index].text;
      li.querySelector(".gk-pr-pick").setAttribute("aria-label", "Sort: " + ITEMS[index].text);
      ["Guarantee", "Hope"].forEach(function (label) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "vn-btn vn-btn-ghost gk-pr-btn";
        button.textContent = label;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", function () { choose(index, label === "Guarantee", li); });
        li.querySelector(".gk-pr-pick").appendChild(button);
      });
      return li;
    }

    function choose(index, isGuarantee, li) {
      picks[index] = isGuarantee;
      var buttons = li.querySelectorAll(".gk-pr-btn");
      buttons[0].setAttribute("aria-pressed", String(isGuarantee));
      buttons[1].setAttribute("aria-pressed", String(!isGuarantee));
      var sorted = 0;
      for (var i = 0; i < ITEMS.length; i++) if (picks[i] !== undefined) sorted++;
      check.disabled = sorted < ITEMS.length;
    }

    function grade() {
      var rows = list.querySelectorAll(".gk-pr-row");
      var right = 0;
      var guarantees = [];
      var hopes = [];
      for (var i = 0; i < ITEMS.length; i++) {
        var isRight = picks[i] === ITEMS[i].isGuarantee;
        if (isRight) right++;
        rows[i].className = "gk-pr-row " + (isRight ? "is-right" : "is-wrong");
        rows[i].querySelector(".gk-pr-why").textContent = ITEMS[i].why;
        (ITEMS[i].isGuarantee ? guarantees : hopes).push(asClause(ITEMS[i].text));
      }
      out.hidden = false;
      out.className = "vn-verdict gk-pr-out " + (right === ITEMS.length ? "is-good" : "is-bad");
      out.textContent = right + " of " + ITEMS.length + " sorted the way the video would. The honest pitch, said out loud: " +
        "here's what I guarantee: " + guarantees.join("; ") + ". And here's what I hope happens: " + hopes.join("; ") + ".";
    }

    check.addEventListener("click", grade);
    reset.addEventListener("click", function () { picks = []; out.hidden = true; check.disabled = true; render(); });
    render();
    check.hidden = false;
    check.disabled = true;
    reset.hidden = false;
  }

  return { init: init };
})();
