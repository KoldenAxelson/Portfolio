// Draw-a-digit pad, classified live by tiny-digits.js (window.TinyDigits).
export function initDigits(pad, TD) {
  var ctx = pad.getContext("2d");
  var SZ = pad.width, S = 28, BLK = SZ / S;
  var vals = [], sampleIdx = 0, drawing = false, lastX = 0, lastY = 0, lastArg = -1, lastConf = 0;
  var fgc = "0,0,0";
  try { var cv = getComputedStyle(document.documentElement).getPropertyValue("--c-fg").trim(); if (cv) fgc = cv.replace(/\s+/g, ","); } catch (e) {}
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = SZ / 14; ctx.strokeStyle = "rgb(" + fgc + ")";
  var pred = document.getElementById("mli-nn-pred");
  var cap = document.getElementById("mli-nn-cap");
  var bars = document.getElementById("mli-nn-bars");
  var CAP0 = "Draw a digit (0-9) with your mouse or finger, or load a real one. About 19,000 trained numbers, quantized to shrink them, decide the answer.";
  for (var d2 = 0; d2 < 10; d2++) {
    var row = document.createElement("div"); row.className = "mli-nn-bar";
    var lab = document.createElement("b"); lab.textContent = d2;
    var track = document.createElement("div"); track.className = "mli-nn-track";
    var val = document.createElement("div"); val.className = "mli-nn-val";
    track.appendChild(val); row.appendChild(lab); row.appendChild(track); bars.appendChild(row); vals.push({ row: row, val: val });
  }
  var toInput = function () {
    var img = ctx.getImageData(0, 0, SZ, SZ).data;
    var g = new Float64Array(S * S);
    for (var y = 0; y < SZ; y++) { var gy = (y / BLK) | 0; for (var x = 0; x < SZ; x++) { var a = img[(y * SZ + x) * 4 + 3]; if (a) g[gy * S + ((x / BLK) | 0)] += a; } }
    for (var i = 0; i < S * S; i++) g[i] = g[i] / (BLK * BLK) / 255;
    var minr = S, minc = S, maxr = -1, maxc = -1, tot = 0;
    for (var r = 0; r < S; r++) for (var c = 0; c < S; c++) { var v = g[r * S + c]; tot += v; if (v > 0.05) { if (r < minr) minr = r; if (r > maxr) maxr = r; if (c < minc) minc = c; if (c > maxc) maxc = c; } }
    if (maxr < 0) return { g: null, sum: 0 };
    var ch = maxr - minr + 1, cw = maxc - minc + 1, sc = 20 / Math.max(ch, cw);
    var nh = Math.max(1, Math.round(ch * sc)), nw = Math.max(1, Math.round(cw * sc));
    var tmp = new Float64Array(nw * nh);
    for (var oy = 0; oy < nh; oy++) { var sy = minr + Math.min(ch - 1, oy / sc); for (var ox = 0; ox < nw; ox++) { var sx = minc + Math.min(cw - 1, ox / sc); tmp[oy * nw + ox] = g[(sy | 0) * S + (sx | 0)]; } }
    var s2 = 0, cx = 0, cy = 0;
    for (var a1 = 0; a1 < nh; a1++) for (var a2 = 0; a2 < nw; a2++) { var vv = tmp[a1 * nw + a2]; s2 += vv; cx += a2 * vv; cy += a1 * vv; }
    var out = new Float64Array(S * S);
    if (s2 > 0) { cx /= s2; cy /= s2; var offx = Math.round(S / 2 - cx), offy = Math.round(S / 2 - cy);
      for (var b1 = 0; b1 < nh; b1++) for (var b2b = 0; b2b < nw; b2b++) { var ny = b1 + offy, nx = b2b + offx; if (ny >= 0 && ny < S && nx >= 0 && nx < S) out[ny * S + nx] = tmp[b1 * nw + b2b]; } }
    return { g: Array.prototype.slice.call(out), sum: tot };
  };
  var run = function () {
    var r = toInput();
    if (!r.g || r.sum < 0.0005) { pred.textContent = "?"; lastArg = -1; for (var k = 0; k < 10; k++) { vals[k].val.style.width = "0%"; vals[k].row.classList.remove("mli-top"); } return; }
    var probs = TD.predict(r.g), arg = 0;
    for (var k2 = 1; k2 < 10; k2++) if (probs[k2] > probs[arg]) arg = k2;
    lastArg = arg; lastConf = probs[arg]; pred.textContent = arg;
    for (var d3 = 0; d3 < 10; d3++) { vals[d3].val.style.width = Math.round(probs[d3] * 100) + "%"; if (d3 === arg) vals[d3].row.classList.add("mli-top"); else vals[d3].row.classList.remove("mli-top"); }
  };
  var pos = function (e) { var rect = pad.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return [(p.clientX - rect.left) / rect.width * SZ, (p.clientY - rect.top) / rect.height * SZ]; };
  pad.addEventListener("pointerdown", function (e) { drawing = true; var q = pos(e); lastX = q[0]; lastY = q[1]; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(lastX + 0.1, lastY + 0.1); ctx.stroke(); run(); e.preventDefault(); });
  pad.addEventListener("pointermove", function (e) { if (!drawing) return; var q = pos(e); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(q[0], q[1]); ctx.stroke(); lastX = q[0]; lastY = q[1]; run(); e.preventDefault(); });
  window.addEventListener("pointerup", function () { if (drawing) { drawing = false; run(); } });
  document.getElementById("mli-nn-clear").addEventListener("click", function () { ctx.clearRect(0, 0, SZ, SZ); run(); cap.textContent = CAP0; });
  var loadSample = function () {
    var i = sampleIdx % TD.samples.length, img = TD.sampleImg(i), lab = TD.samples[i].y; sampleIdx++;
    ctx.clearRect(0, 0, SZ, SZ);
    for (var yy = 0; yy < S; yy++) for (var xx = 0; xx < S; xx++) { var v = img[yy * S + xx]; if (v > 8) { ctx.fillStyle = "rgba(" + fgc + "," + (v / 255) + ")"; ctx.fillRect(xx * BLK, yy * BLK, BLK, BLK); } }
    run();
    cap.textContent = "A real handwritten " + lab + " the model never trained on. It reads it as " + (lastArg < 0 ? "?" : lastArg) + " at " + Math.round(lastConf * 100) + "% confidence.";
  };
  document.getElementById("mli-nn-sample").addEventListener("click", loadSample);
  loadSample();
}
