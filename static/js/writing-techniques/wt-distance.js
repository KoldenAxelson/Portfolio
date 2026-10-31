/* Psychic distance: a slider lights one of five versions of the same moment,
   then a close-third paragraph where the reader finds the two slips (a jump
   out to the narrator's distance, and a face the viewpoint character can't
   see). The slips are marked in the markup with data-wt-slip. */
window.WtDistance = (function () {
  var SLIPS = {
    distance: "Jumps out. Kevin isn't thinking about contractors from Ohio; the narrator is, at step one or two, in the middle of a step-three scene.",
    face: "Kevin can't see his own lips. From inside him it would be how the smile felt, or that he was glad, or nothing at all.",
    "": "That one holds. It's what Kevin would notice, in words close to his."
  };

  function init(root) {
    if (!root || root.getAttribute("data-wt-ready")) return;
    root.setAttribute("data-wt-ready", "1");
    var slider = root.querySelector("#wt-dist");
    var steps = Array.prototype.slice.call(root.querySelectorAll("[data-wt-step]"));
    var items = Array.prototype.slice.call(root.querySelectorAll("#wt-slips-list > li"));
    var verdict = root.querySelector("#wt-dist-verdict");
    var found = 0;
    var tries = 0;
    var needed = items.filter(function (li) { return li.getAttribute("data-wt-slip"); }).length;

    function showStep() {
      var n = Number(slider.value);
      steps.forEach(function (li) {
        var on = Number(li.getAttribute("data-wt-step")) === n;
        li.classList.toggle("is-on", on);
        if (on) slider.setAttribute("aria-valuetext", n + ": " + li.querySelector(".wt-dist-k").textContent);
      });
    }

    items.forEach(function (li) {
      var kind = li.getAttribute("data-wt-slip");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "wt-slip";
      b.textContent = li.textContent;
      b.setAttribute("aria-pressed", "false");
      var note = document.createElement("span");
      note.className = "wt-slip-note";
      li.textContent = "";
      li.appendChild(b);
      li.appendChild(note);
      b.addEventListener("click", function () {
        if (b.getAttribute("aria-pressed") === "true") return;
        b.setAttribute("aria-pressed", "true");
        tries += 1;
        li.classList.add(kind ? "is-slip" : "is-fine");
        note.textContent = SLIPS[kind];
        if (kind) found += 1;
        if (found === needed) {
          verdict.textContent = "Both slips found" + (tries > needed ? ", with " + (tries - needed) + " false alarm" + (tries - needed === 1 ? "" : "s") : "") + ". Those two are the ones he sees most in drafts.";
          verdict.className = "vn-verdict is-good";
        } else {
          verdict.textContent = found + " of " + needed + " slips found.";
          verdict.className = "vn-verdict";
        }
      });
    });

    slider.addEventListener("input", showStep);
    root.querySelector("#wt-dist-wrap").hidden = false;
    root.classList.add("is-live");
    showStep();
  }

  return { init: init };
})();
