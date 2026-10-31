/* One street, two narrators. Up to MAX_PICKS details build a paragraph, in
   the order picked; switching the narrator rewrites each detail in his eyes.
   The two stock details are the same for both men, which is the point: a
   detail any narrator could have written belongs to none of them. */
window.WtEyes = (function () {
  var MAX_PICKS = 3;
  var DETAILS = [
    { id: "fence", sense: "sight", label: "The fences",
      andre: "Every fence on Row Nine came up to my waist, high enough to say whose yard it was and too low to stop anybody.",
      owen: "Every fence on Row Nine was the same white and the same height, and nobody's was better than anybody's." },
    { id: "speaker", sense: "sound", label: "The speakers",
      andre: "The speakers on the light poles clicked a second before every announcement, so you always had time to look busy.",
      owen: "The speakers on the light poles played three chimes before every announcement, like a town clock." },
    { id: "paint", sense: "smell", label: "The paint",
      andre: "Fresh paint on everything, like somebody was covering something.",
      owen: "Everything smelled of fresh paint, which meant somebody had cared enough to paint it." },
    { id: "bench", sense: "touch", label: "The benches",
      andre: "The bench outside the Commons was cold through my shirt, and it was the only one with a wall behind it.",
      owen: "The benches outside the Commons were bolted in a circle, facing in, so you'd have to talk to someone." },
    { id: "camera", sense: "sight", label: "The cameras",
      andre: "A camera sat on every third pole. I counted them the first week and never stopped.",
      owen: "There were cameras on the poles, and I liked that, because nobody here had to be afraid of anything." },
    { id: "beagle", sense: "sight", label: "A beagle",
      andre: "Somebody's beagle had dug under the fence on Row Six again, and nobody had reported it.",
      owen: "A beagle on Row Six kept digging under its fence, and the whole row took turns walking it home." },
    { id: "sun", sense: "sight", label: "The sun", stock: true,
      andre: "The sun was shining brightly.", owen: "The sun was shining brightly." },
    { id: "birds", sense: "sound", label: "Birdsong", stock: true,
      andre: "Birds were singing in the trees.", owen: "Birds were singing in the trees." }
  ];

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var who = "andre";
    var picks = ["fence", "paint", "camera"];
    var whoButtons = Array.prototype.slice.call(root.querySelectorAll("[data-wt-who]"));
    var pickBox = root.querySelector("#wt-eyes-pick");
    var para = root.querySelector("#wt-eyes-para");
    var verdict = root.querySelector("#wt-eyes-verdict");
    var pickButtons = {};

    DETAILS.forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wt-chip wt-eyes-chip";
      b.innerHTML = "<span></span><small></small>";
      b.firstChild.textContent = d.label;
      b.lastChild.textContent = d.sense;
      b.addEventListener("click", function () { toggle(d.id); });
      pickButtons[d.id] = b;
      pickBox.appendChild(b);
    });

    function byId(id) {
      return DETAILS.filter(function (d) { return d.id === id; })[0];
    }

    function toggle(id) {
      var at = picks.indexOf(id);
      if (at !== -1) picks.splice(at, 1);
      else if (picks.length < MAX_PICKS) picks.push(id);
      render();
    }

    function render() {
      whoButtons.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-wt-who") === who ? "true" : "false"); });
      DETAILS.forEach(function (d) {
        var on = picks.indexOf(d.id) !== -1;
        var b = pickButtons[d.id];
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.disabled = !on && picks.length >= MAX_PICKS;
      });
      var chosen = picks.map(byId);
      para.textContent = chosen.length ? chosen.map(function (d) { return d[who]; }).join(" ") : "Pick a detail.";
      para.classList.toggle("is-empty", !chosen.length);

      var senses = chosen.map(function (d) { return d.sense; }).filter(function (s, i, a) { return a.indexOf(s) === i; });
      var stock = chosen.filter(function (d) { return d.stock; });
      var text;
      var good = false;
      if (!chosen.length) {
        text = "Pick up to three details.";
      } else if (stock.length) {
        text = "“" + stock[0].andre + "” reads the same through either man's eyes. That's what makes it stock: it tells you nothing about the street or the one looking at it.";
      } else {
        text = senses.length + " sense" + (senses.length === 1 ? "" : "s") + " (" + senses.join(", ") + "). Now switch narrators: the same things, and a different man looking at them.";
        good = true;
      }
      verdict.textContent = text;
      verdict.className = "vn-verdict" + (chosen.length ? (good ? " is-good" : " is-bad") : "");
    }

    whoButtons.forEach(function (b) {
      b.addEventListener("click", function () { who = b.getAttribute("data-wt-who"); render(); });
    });
    root.querySelector("#wt-eyes-who").hidden = false;
    pickBox.hidden = false;
    render();
  }

  return { init: init };
})();
