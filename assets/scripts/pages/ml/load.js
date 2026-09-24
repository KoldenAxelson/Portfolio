// Serving under load: one server vs. autoscaling, driven by a traffic slider.
export function initLoad() {
  var rps = document.getElementById("mli-load-rps");
  if (!rps) return;
  var auto = document.getElementById("mli-load-auto");
  var rpsv = document.getElementById("mli-load-rpsv");
  var srv = document.getElementById("mli-load-servers");
  var bar = document.getElementById("mli-load-bar");
  var lcap = document.getElementById("mli-load-cap");
  var lrender = function () {
    var r = +rps.value, a = auto.checked, per = 20;
    var servers = a ? Math.min(6, Math.max(1, Math.ceil(r / per))) : 1;
    var load = r / (servers * per), lat, bad;
    if (load <= 1) { lat = Math.round(45 + load * 45); bad = false; }
    else { lat = Math.round(90 + (load - 1) * 380); bad = true; }
    rpsv.textContent = r;
    srv.innerHTML = "";
    for (var i = 0; i < servers; i++) { var s = document.createElement("div"); s.className = "mli-server"; s.textContent = "▤"; srv.appendChild(s); }
    bar.style.width = Math.min(100, lat / 6) + "%";
    if (bad) bar.classList.add("mli-bad"); else bar.classList.remove("mli-bad");
    lcap.textContent = bad
      ? ("At " + r + " req/s, one server is drowning (~" + lat + "ms and climbing) and requests start getting dropped. Turn on autoscaling.")
      : ("At " + r + " req/s across " + servers + " server" + (servers > 1 ? "s" : "") + ", responses stay snappy (~" + lat + "ms).");
  };
  rps.addEventListener("input", lrender);
  auto.addEventListener("change", lrender);
  lrender();
}
