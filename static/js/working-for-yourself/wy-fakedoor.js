/* The fake-door test from the million-dollar video, with its one borrowed
   assumption (10% of clickers buy) on a slider. The projection is linear in
   that number, so the point lands the moment you drag it. Nothing stored. */
window.WyFakedoor = (function () {
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var BORROWED_RATE = 10;

  function init(root) {
    if (!root || root.getAttribute("data-wy-ready")) return;
    root.setAttribute("data-wy-ready", "1");

    var field = function (id) { return root.querySelector("#wy-fd-" + id); };
    var num = function (id) { var v = parseFloat(field(id).value); return isFinite(v) ? v : 0; };
    var out = field("out");

    function render() {
      var clicks = num("visits") * num("click") / 100;
      var rate = num("conv");
      var monthly = clicks * rate / 100 * num("price");
      field("convlab").textContent = rate + "%";
      out.textContent = "";
      out.appendChild(document.createTextNode(Math.round(clicks).toLocaleString("en-US") + " clicks a month × " + rate + "% × " + money(num("price")) + " = "));
      var total = document.createElement("b");
      total.textContent = money(monthly) + " a month";
      out.appendChild(total);
      if (rate !== BORROWED_RATE) {
        var ratio = rate / BORROWED_RATE;
        out.appendChild(document.createTextNode(ratio < 1
          ? ". That's " + Math.round((1 - ratio) * 100) + "% less than at the video's 10%, from one changed guess."
          : ". That's " + Math.round((ratio - 1) * 100) + "% more than at the video's 10%, from one changed guess."));
      } else {
        out.appendChild(document.createTextNode("."));
      }
    }

    ["visits", "click", "price", "conv"].forEach(function (id) { field(id).addEventListener("input", render); });
    render();
  }

  return { init: init };
})();
