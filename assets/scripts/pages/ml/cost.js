// Monthly inference bill from two dials, with a quantize + batch toggle.
export function initCost() {
  var req = document.getElementById("mli-cost-req");
  if (!req) return;
  var tok = document.getElementById("mli-cost-tok");
  var opt = document.getElementById("mli-cost-opt");
  var reqv = document.getElementById("mli-cost-reqv");
  var tokv = document.getElementById("mli-cost-tokv");
  var out = document.getElementById("mli-cost-out");
  var ccap = document.getElementById("mli-cost-cap");
  var crender = function () {
    var r = +req.value, t = +tok.value, o = opt.checked;
    var ppk = o ? 0.0006 : 0.002;
    var monthly = r * t / 1000 * ppk * 30;
    reqv.textContent = r.toLocaleString();
    tokv.textContent = t;
    out.innerHTML = "$" + Math.round(monthly).toLocaleString() + " <small>/ month</small>";
    ccap.textContent = o
      ? "Same answers, about a third of the cost. That gap is pure margin."
      : "Flip on optimizations (quantize + batch) to see the same workload get cheaper.";
  };
  req.addEventListener("input", crender);
  tok.addEventListener("input", crender);
  opt.addEventListener("change", crender);
  crender();
}
