/* Today's drill: deals one technique from the page (never the same twice in
   a row), with a link to its section and two boxes to write it in the shape
   and plain. Each box reports its shortest sentence, for the meter's
   under-four-words test. Nothing is stored. */
window.WtDrill = (function () {
  var INPUT_DELAY_MS = 200;
  var DRILLS = [
    { name: "Let the last sentence pick the next", id: "let-the-last-sentence-pick-the-next", task: "Write three sentences. Make the second echo the first's shape and the third break it." },
    { name: "Make them wait", id: "make-them-wait", task: "Hold a sentence's subject back behind three or four phrases, then let it land." },
    { name: "Two halves that turn", id: "two-halves-that-turn", task: "Call a hard thing easy and an easy thing unbearable, in one sentence." },
    { name: "Vary the length", id: "vary-the-length", task: "Write a sentence of thirty words or more, then answer it in three." },
    { name: "Echoes on purpose", id: "echoes-on-purpose", task: "Start four clauses with the same word, and let the last one turn." },
    { name: "Make a claim, then prove it", id: "make-a-claim-then-prove-it", task: "State something in five words, then back it with three details after a colon." },
    { name: "Thisness", id: "thisness", task: "Describe a room with one detail that couldn't belong to any other room, and don't explain it." },
    { name: "Through someone's eyes", id: "through-someones-eyes", task: "Describe a place by what's missing from it, in the voice of someone who misses it." },
    { name: "Dialogue", id: "dialogue", task: "Write six lines where two people argue about something neither of them names." },
    { name: "Building one", id: "building-one", task: "End a scene on a yes, but: the character gets the thing, and the thing costs something." },
    { name: "What to leave out", id: "what-to-leave-out", task: "Write only the morning after something terrible. Never say what it was." },
    { name: "Point of view", id: "point-of-view", task: "Write a paragraph at one psychic distance, then move in a step on its last line." },
    { name: "Skipping time", id: "skipping-time", task: "Skip three weeks in one sentence, using only a clue from the world." }
  ];

  function shortest(text) {
    var pieces = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["'”’)]*|[^.!?]+$/g) || [];
    var counts = pieces.map(function (p) {
      return p.trim().split(" ").filter(function (w) { return /[A-Za-z0-9]/.test(w); }).length;
    }).filter(Boolean);
    return counts.length ? Math.min.apply(null, counts) : 0;
  }

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var link = root.querySelector("#wt-drill-link");
    var task = root.querySelector("#wt-drill-task");
    var deal = root.querySelector("#wt-drill-deal");
    var boxes = [
      { input: root.querySelector("#wt-drill-shape"), stat: root.querySelector("#wt-drill-shape-stat") },
      { input: root.querySelector("#wt-drill-plain"), stat: root.querySelector("#wt-drill-plain-stat") }
    ];
    var current = 1; // the markup shows "Make them wait"
    var pending = null;

    function stats() {
      boxes.forEach(function (box) {
        var n = shortest(box.input.value);
        box.stat.textContent = n ? "Shortest sentence: " + n + " word" + (n === 1 ? "" : "s") + (n < 4 ? ". Under four, good." : ".") : "";
      });
    }

    function show(i) {
      current = i;
      link.textContent = DRILLS[i].name;
      link.href = "#" + DRILLS[i].id;
      task.textContent = DRILLS[i].task;
    }

    deal.addEventListener("click", function () {
      var next = Math.floor(Math.random() * (DRILLS.length - 1));
      show(next >= current ? next + 1 : next);
    });
    boxes.forEach(function (box) {
      box.input.addEventListener("input", function () {
        clearTimeout(pending);
        pending = setTimeout(stats, INPUT_DELAY_MS);
      });
    });
    root.querySelector("#wt-drill-deal-wrap").hidden = false;
    root.querySelector("#wt-drill-boxes").hidden = false;
    show(Math.floor(Math.random() * DRILLS.length));
  }

  return { init: init };
})();
