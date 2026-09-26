/* Watching it rot — a model drifting in production.
   Accuracy decays a little every "week." With monitoring on, crossing the retrain
   threshold trips an alarm and retrains (sawtooth, stays healthy). With monitoring
   off, it just bleeds downward into the danger zone — silently. Pure model logic is
   kept separate from drawing so it can be reasoned about and tested. */
window.MliDrift = (function () {
  var WINDOW = 44, START = 97, THRESH = 90, FLOOR = 61, AMIN = 57, AMAX = 100;
  var H = 170, STEP_MS = 460;

  function step(st) {
    st.acc -= 0.5 + Math.random() * 0.6;              // drift
    var retrain = false;
    if (st.monitoring && st.acc < THRESH) { st.acc = START - Math.random() * 1.2; retrain = true; }
    if (st.acc < FLOOR) st.acc = FLOOR + Math.random() * 0.6;   // silent floor when unmonitored
    st.week++;
    st.hist.push({ a: st.acc, r: retrain, w: st.week });
    if (st.hist.length > WINDOW) st.hist.shift();
    return retrain;
  }
  function fresh(monitoring) {
    var st = { acc: START, week: 0, hist: [], monitoring: monitoring, lastRetrain: -99 };
    for (var i = 0; i < WINDOW; i++) step(st);           // pre-fill so the chart starts full
    return st;
  }

  function init(root) {
    if (!root) return;
    var cvs = root.querySelector("#mli-drift-cvs");
    var monEl = root.querySelector("#mli-drift-mon");
    var cap = root.querySelector("#mli-drift-cap");
    if (!cvs) return;
    var ctx = cvs.getContext && cvs.getContext("2d");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var css = getComputedStyle(document.documentElement);
    function v(n, f) { try { var x = css.getPropertyValue(n).trim(); return x ? x.replace(/\s+/g, ",") : f; } catch (e) { return f; } }
    var C_ACC = v("--c-accent", "40,120,240"), C_FG = v("--c-fg", "20,20,20"),
        C_MUT = v("--c-muted", "120,120,120"), C_BRD = v("--c-border", "200,200,200"),
        C_BG = v("--c-bg", "255,255,255"), RED = "217,83,79";

    var W = 560;
    function fit() {
      W = Math.min(root.clientWidth || 560, 560);
      var dpr = window.devicePixelRatio || 1;
      cvs.style.width = W + "px"; cvs.style.height = H + "px";
      cvs.width = W * dpr; cvs.height = H * dpr;
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr); }
    }

    var padL = 34, padR = 10, padT = 12, padB = 22;
    function X(i) { return padL + (i / (WINDOW - 1)) * (W - padL - padR); }
    function Y(a) { return padT + (AMAX - a) / (AMAX - AMIN) * (H - padT - padB); }

    function draw(st) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      // danger zone below the threshold
      ctx.fillStyle = "rgba(" + RED + ",0.08)";
      ctx.fillRect(padL, Y(THRESH), W - padL - padR, Y(AMIN) - Y(THRESH));
      // y gridlines + labels
      ctx.font = "10px ui-monospace,Menlo,monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      [100, 90, 80, 70, 60].forEach(function (a) {
        var y = Y(a);
        ctx.strokeStyle = "rgba(" + C_BRD + ",0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.fillStyle = "rgb(" + C_MUT + ")"; ctx.fillText(a + "%", padL - 6, y);
      });
      // threshold (dashed)
      ctx.strokeStyle = "rgba(" + RED + ",0.8)"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(padL, Y(THRESH)); ctx.lineTo(W - padR, Y(THRESH)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = "left"; ctx.fillStyle = "rgba(" + RED + ",0.9)";
      ctx.fillText("retrain line", padL + 4, Y(THRESH) - 7);
      // accuracy line, colored per segment
      var h = st.hist;
      for (var i = 1; i < h.length; i++) {
        var below = h[i].a < THRESH || h[i - 1].a < THRESH;
        ctx.strokeStyle = below ? "rgb(" + RED + ")" : "rgb(" + C_ACC + ")";
        ctx.lineWidth = 2.2; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(X(i - 1), Y(h[i - 1].a)); ctx.lineTo(X(i), Y(h[i].a)); ctx.stroke();
        if (h[i].r) { // retrain marker
          ctx.fillStyle = "rgb(" + C_ACC + ")";
          ctx.beginPath();
          ctx.moveTo(X(i), Y(h[i].a) - 9); ctx.lineTo(X(i) - 4, Y(h[i].a) - 2); ctx.lineTo(X(i) + 4, Y(h[i].a) - 2);
          ctx.closePath(); ctx.fill();
        }
      }
      // current point
      var last = h[h.length - 1], lx = X(h.length - 1), ly = Y(last.a), red = last.a < THRESH;
      ctx.fillStyle = red ? "rgb(" + RED + ")" : "rgb(" + C_ACC + ")";
      ctx.beginPath(); ctx.arc(lx, ly, 3.4, 0, 7); ctx.fill();
      ctx.strokeStyle = (red ? "rgba(" + RED + "," : "rgba(" + C_ACC + ",") + "0.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(lx, ly, 6.5, 0, 7); ctx.stroke();
      // x label
      ctx.fillStyle = "rgb(" + C_MUT + ")"; ctx.textAlign = "right"; ctx.font = "10px ui-monospace,Menlo,monospace";
      ctx.fillText("weeks in production →", W - padR, H - 6);
    }

    function status(st, justRetrained) {
      if (!cap) return;
      var a = st.hist[st.hist.length - 1].a.toFixed(1);
      if (st.monitoring) {
        cap.textContent = justRetrained
          ? "⚠ Drift crossed the line — monitor tripped, model retrained. Accuracy snaps back and the loop turns over."
          : "Monitoring on · accuracy " + a + "% — healthy. When drift drags it under the line, a retrain fires automatically.";
      } else {
        cap.textContent = "Monitoring off · accuracy " + a + "% and sliding. No alarm, nothing red in the logs — the answers are just quietly getting worse.";
      }
    }

    var st = fresh(monEl ? monEl.checked : true);
    fit(); draw(st); status(st, false);
    if (monEl) monEl.addEventListener("change", function () { st = fresh(monEl.checked); draw(st); status(st, false); });
    window.addEventListener("resize", function () { fit(); draw(st); });

    if (reduce) return;   // static snapshot for reduced motion
    var acc = 0, prev = 0;
    function loop(ts) {
      if (!prev) prev = ts;
      acc += ts - prev; prev = ts;
      if (!document.hidden && acc >= STEP_MS) {
        acc = 0;
        var r = step(st);
        draw(st); status(st, r);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  return { init: init, _step: step, _fresh: fresh };
})();
