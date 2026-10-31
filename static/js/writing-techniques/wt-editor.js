/* The editor shell shared by the text widgets on this page (rhythm, echoes,
   cut): a textarea over a backdrop that holds the same text with marks in
   it, the way writing apps highlight inside the editor. The textarea's text
   stays real and editable; the backdrop's text is transparent, so only its
   mark backgrounds and underlines show through. Marks never change spacing
   (no padding, no weight), or the two layers would drift apart.

   Each widget loads this file through its own withEditor() helper (the
   page's lazy loader takes one script per widget), which queues on
   window.WtEditorQueue so the file is fetched once.

     var ed = WtEditor.mount(root, { onChange: render });
     render();   // which calls ed.paint([{ start: 0, end: 5, cls: "wt-x" }]); ranges may overlap */
window.WtEditor = (function () {
  var INPUT_DELAY_MS = 200;

  function wordCount(text) {
    return (text.match(/[A-Za-z0-9][A-Za-z0-9’']*/g) || []).length;
  }

  function mount(root, options) {
    var input = root.querySelector(".wt-ed-input");
    var back = root.querySelector(".wt-ed-back");
    var count = root.querySelector(".wt-ed-count");
    var pending = null;

    // Grow with the text instead of scrolling, so the two layers never
    // have to agree on a scroll position.
    function grow() {
      input.style.height = "auto";
      input.style.height = input.scrollHeight + 2 + "px";
    }

    function paint(ranges) {
      var text = input.value;
      var cuts = [0, text.length];
      ranges.forEach(function (r) { cuts.push(r.start, r.end); });
      cuts = cuts.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      back.textContent = "";
      for (var i = 0; i < cuts.length - 1; i++) {
        var from = cuts[i];
        var to = cuts[i + 1];
        var classes = ranges.filter(function (r) { return r.start <= from && r.end >= to; }).map(function (r) { return r.cls; });
        var piece = text.slice(from, to);
        if (!classes.length) {
          back.appendChild(document.createTextNode(piece));
          continue;
        }
        var mark = document.createElement("mark");
        mark.className = "wt-ed-mark " + classes.join(" ");
        mark.textContent = piece;
        back.appendChild(mark);
      }
      // A trailing newline in a textarea still takes a line; match it.
      back.appendChild(document.createTextNode("\n "));
    }

    function refresh() {
      grow();
      var n = wordCount(input.value);
      if (count) count.textContent = n + " word" + (n === 1 ? "" : "s");
    }

    function changed() {
      refresh();
      options.onChange();
    }

    input.addEventListener("input", function () {
      grow();
      clearTimeout(pending);
      pending = setTimeout(changed, INPUT_DELAY_MS);
    });
    input.addEventListener("scroll", function () { back.scrollTop = input.scrollTop; });
    // Rewrap when the column changes width; height changes are ours.
    var lastWidth = 0;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = input.clientWidth;
        if (w !== lastWidth) { lastWidth = w; requestAnimationFrame(grow); }
      }).observe(input);
    }
    root.classList.add("has-editor");
    refresh(); // the widget paints its first frame once mount() has returned
    return { input: input, paint: paint, set: function (text) { input.value = text; changed(); } };
  }

  return { mount: mount, wordCount: wordCount };
})();
