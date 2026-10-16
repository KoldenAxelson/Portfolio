/* Cel shading on a 64-pixel sphere, per pixel, with the pixel-art video's math:
   diffuse = max(0, N·L), stepped = ceil(diffuse × steps) / steps, and an
   optional rim of (1 − N·V) × light, stepped and squared. The palette is fixed
   art, not theme tokens: foliage is green in both themes. */
window.PaCel = (function () {
  var SIZE = 64;
  var RADIUS = 27;
  var STEP_OPTIONS = [1, 2, 3, 4, 0];
  var SHADOW = [32, 64, 52];
  var LIT = [126, 196, 92];
  var RIM = [214, 245, 160];

  function step(value, steps) { return steps ? Math.ceil(value * steps) / steps : value; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  function render(ctx, steps, angleDeg, hasRim) {
    var img = ctx.createImageData(SIZE, SIZE);
    var a = angleDeg * Math.PI / 180;
    // Screen space: y grows downward, so a light from above has a negative y.
    var light = [Math.cos(a) * 0.8, -Math.sin(a) * 0.8, 0.6];
    var len = Math.hypot(light[0], light[1], light[2]);
    light = [light[0] / len, light[1] / len, light[2] / len];
    var center = SIZE / 2 - 0.5;

    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        var nx = (x - center) / RADIUS;
        var ny = (y - center) / RADIUS;
        var r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        var nz = Math.sqrt(1 - r2);
        var diffuse = Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]);
        var lit = step(diffuse, steps);
        var color = mix(SHADOW, LIT, lit);
        if (hasRim) {
          var rim = step((1 - nz) * diffuse, steps);
          color = mix(color, RIM, rim * rim);
        }
        var i = (y * SIZE + x) * 4;
        img.data[i] = color[0]; img.data[i + 1] = color[1]; img.data[i + 2] = color[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function init(root) {
    if (!root || root.getAttribute("data-pa-ready")) return;
    root.setAttribute("data-pa-ready", "1");

    var $ = function (id) { return root.querySelector("#pa-cel-" + id); };
    var ctx = $("canvas").getContext("2d");
    var steps = 3;

    function update() {
      render(ctx, steps, Number($("angle").value), $("rim").checked);
      var buttons = $("steps").children;
      for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute("aria-pressed", String(Number(buttons[i].getAttribute("data-steps")) === steps));
      $("note").textContent = steps
        ? steps + (steps === 1 ? " step: lit or unlit, nothing between." : " steps: " + steps + " flat bands, the cel look.")
        : "Smooth: every pixel its own value. At this resolution it reads as noise, which is why the video steps it.";
    }

    STEP_OPTIONS.forEach(function (option) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "vn-btn vn-btn-ghost pa-pick";
      button.textContent = option ? String(option) : "Smooth";
      button.setAttribute("data-steps", String(option));
      button.addEventListener("click", function () { steps = option; update(); });
      $("steps").appendChild(button);
    });
    $("angle").addEventListener("input", update);
    $("rim").addEventListener("change", update);
    $("controls").hidden = false;
    update();
  }

  return { init: init };
})();
