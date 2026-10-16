/* Break-even from the MBA video: fixed costs over contribution margin. The
   slider and the number field drive the same variable cost so the reader can
   drag it toward the price and see the denominator collapse. Nothing stored. */
window.WyBreakeven = (function () {
  var money = function (n) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };

  function init(root) {
    if (!root || root.getAttribute("data-wy-ready")) return;
    root.setAttribute("data-wy-ready", "1");

    var field = function (id) { return root.querySelector("#wy-be-" + id); };
    var num = function (id) { var v = parseFloat(field(id).value); return isFinite(v) ? v : 0; };
    var out = field("out");
    var slide = field("slide");

    function render() {
      var price = num("price");
      var variable = num("var");
      var margin = price - variable;
      slide.max = String(Math.max(price, variable, 1));
      slide.value = String(variable);
      field("varlab").textContent = money(variable);
      var share = price > 0 ? Math.max(0, Math.min(1, margin / price)) : 0;
      field("cm").style.width = (share * 100) + "%";
      field("vc").style.width = ((1 - share) * 100) + "%";

      out.textContent = "";
      out.classList.toggle("is-loss", margin <= 0);
      if (margin <= 0) {
        out.textContent = "Each unit loses " + money(-margin) + ". No volume ever breaks even. In the video's words, if price is less than cost, you are a charity.";
        return;
      }
      var units = Math.ceil(num("fixed") / margin);
      out.appendChild(document.createTextNode("Each unit contributes " + money(margin) + " toward fixed costs. Break-even: "));
      var b = document.createElement("b");
      b.textContent = units.toLocaleString("en-US") + " units a month";
      out.appendChild(b);
      out.appendChild(document.createTextNode("."));
    }

    ["price", "var", "fixed"].forEach(function (id) { field(id).addEventListener("input", render); });
    slide.addEventListener("input", function () { field("var").value = slide.value; render(); });
    render();
  }

  return { init: init };
})();
