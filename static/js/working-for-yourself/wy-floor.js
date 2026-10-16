/* The freelance floor price: income goal over projects plus a buffer, and the
   video's own rule (subcontract cost plus margin) when the reader knows it.
   Whichever is higher is the floor, so neither method can talk you under the
   other. Nothing stored. */
window.WyFloor = (function () {
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };

  function init(root) {
    if (!root || root.getAttribute("data-wy-ready")) return;
    root.setAttribute("data-wy-ready", "1");

    var field = function (id) { return root.querySelector("#wy-fl-" + id); };
    var out = field("out");
    var num = function (id) { var v = parseFloat(field(id).value); return isFinite(v) ? v : 0; };

    function render() {
      var projects = Math.max(1, num("projects"));
      var buffer = num("buffer") / 100;
      var fromGoal = num("goal") / projects * (1 + buffer);
      var sub = num("sub");
      var line = money(num("goal")) + " ÷ " + projects + " projects, plus a " + num("buffer") + "% buffer: " + money(fromGoal) + ".";
      if (sub > 0) {
        var fromSub = sub * (1 + buffer);
        line += " Subcontract cost plus the same margin: " + money(fromSub) + ".";
        fromGoal = Math.max(fromGoal, fromSub);
      }
      out.innerHTML = "";
      out.appendChild(document.createTextNode(line + " No projects under "));
      var floor = document.createElement("b");
      floor.textContent = money(fromGoal);
      out.appendChild(floor);
      out.appendChild(document.createTextNode("."));
    }

    ["goal", "projects", "buffer", "sub"].forEach(function (id) { field(id).addEventListener("input", render); });
    render();
  }

  return { init: init };
})();
