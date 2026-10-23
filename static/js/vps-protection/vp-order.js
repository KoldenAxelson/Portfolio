/* The hardening-order puzzle on /misc/vps-protection/ (markup in
   layouts/shortcodes/vps-protection/order.html). The steps are the skit's; the
   lockouts are the real ones: a key before passwords go off, SSH on 2222 before
   the firewall allows only 2222, Tailscale working before public SSH closes,
   and nothing installed until SSH is secured. Any order that respects those
   wins, so the puzzle checks rules rather than one correct sequence. */
window.VpOrder = (function () {
  // Listed in the scrambled order the buttons appear in.
  var STEPS = [
    { id: "app", label: "Install OpenClaw", said: "\"And now we are done.\" Now start configuring it so it doesn't delete your Gmail." },
    { id: "private", label: "Allow SSH on 2222 only over Tailscale", said: "\"Public SSH is now gone.\"" },
    { id: "jail", label: "Point fail2ban's SSH jail at 2222", said: "\"I thought we don't use passwords.\" \"Well, that's today. But what about tomorrow?\"" },
    { id: "sshd", label: "Turn off root and password logins, move SSH to 2222", said: "Config checked before logging out, new session opened with the key. It works." },
    { id: "update", label: "apt update && apt upgrade", said: "The latest state of the internet, installed." },
    { id: "mesh", label: "Install Tailscale and log in over it", said: "The wormhole actually opens." },
    { id: "firewall", label: "UFW: deny all incoming, allow 2222, enable", said: "An elimination diet: block everything, reintroduce what you need." },
    { id: "key", label: "Add your SSH key and log in with it", said: "Key saved this time." },
    { id: "auto", label: "Turn on automatic security updates", said: "\"Congrats. Your server can reboot itself at 3:00 a.m.\"" },
    { id: "user", label: "Create a non-root user", said: "\"I cannot use the password I use everywhere.\" Correct." },
    { id: "tools", label: "Install ufw, fail2ban and the rest", said: "\"It was not designed to be secure.\"" }
  ];
  var NEEDS_TOOLS = { firewall: "ufw", jail: "fail2ban", auto: "unattended-upgrades" };

  function refuse(message) { return { kind: "refuse", message: message }; }
  function lockout(message) { return { kind: "lockout", message: message }; }

  function check(id, done) {
    var has = function (step) { return done.indexOf(step) !== -1; };
    var protectionLeft = STEPS.length - 1 - done.length;

    if (NEEDS_TOOLS[id] && !has("tools")) return refuse(NEEDS_TOOLS[id] + ": command not found. Install the tools first.");
    if (id === "key" && !has("user")) return refuse("There's no user to give a key to yet.");
    if (id === "sshd" && !has("user")) return lockout("Root login is off, and root was the only account. You're locked out.");
    if (id === "sshd" && !has("key")) return lockout("Passwords are off and there's no key on the server. \"You didn't save your SSH key.\"");
    if (id === "firewall" && !has("sshd")) return lockout("The firewall is up with only 2222 allowed, and SSH is still listening on 22. You're locked out.");
    if (id === "private" && !has("firewall")) return refuse("There's no firewall rule to narrow yet.");
    if (id === "private" && !has("mesh")) return lockout("Public SSH is closed and there's no Tailscale to come in through. You're locked out.");
    if (id === "app" && !(has("sshd") && has("firewall"))) return lockout("You installed before securing root SSH, the one rule the expert opened with. The scanners got there first.");
    if (id === "app" && protectionLeft > 0) return refuse("Not yet. " + protectionLeft + " protection " + (protectionLeft === 1 ? "step" : "steps") + " to go before the expert lets you install anything.");
    return { kind: "ok" };
  }

  // Each row is [label, [tone, value]]; the tone classes are styled in vps-protection.css.
  function surface(done) {
    var has = function (step) { return done.indexOf(step) !== -1; };
    var ssh = has("private") ? ["good", "2222, Tailscale only"]
      : has("sshd") ? ["mid", "2222 from anywhere, key only"]
      : ["bad", "22, root, password"];
    return [
      ["SSH", ssh],
      ["Anything else listening", has("firewall") ? ["good", "blocked"] : ["bad", "open"]],
      ["Password guessers", has("jail") ? ["good", "banned"] : ["bad", "unlimited tries"]],
      ["Security patches", has("auto") ? ["good", "automatic"] : has("update") ? ["mid", "current, for now"] : ["bad", "as old as the image"]]
    ];
  }

  function init(root) {
    if (!root || root.getAttribute("data-vp-ready")) return;
    root.setAttribute("data-vp-ready", "1");

    var pool = root.querySelector("#vp-pool");
    var surfaceList = root.querySelector("#vp-surface");
    var log = root.querySelector("#vp-log");
    var count = root.querySelector("#vp-count");
    var verdict = root.querySelector("#vp-verdict");
    var done = [];
    var attempt = 1;
    var isLocked = false;

    STEPS.forEach(function (step) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "vn-btn vn-btn-ghost vp-step";
      button.setAttribute("data-step", step.id);
      button.textContent = step.label;
      pool.appendChild(button);
    });

    function stepById(id) {
      return STEPS.filter(function (step) { return step.id === id; })[0];
    }

    function say(tone, text) {
      verdict.className = "vn-verdict" + (tone ? " is-" + tone : "");
      verdict.textContent = text;
    }

    function render() {
      Array.prototype.forEach.call(pool.children, function (button) {
        var isDone = done.indexOf(button.getAttribute("data-step")) !== -1;
        button.classList.toggle("is-done", isDone);
        button.disabled = isDone || isLocked;
      });
      surfaceList.innerHTML = "";
      surface(done).forEach(function (row) {
        var item = document.createElement("li");
        var value = document.createElement("b");
        item.className = "vp-row is-" + row[1][0];
        item.appendChild(document.createTextNode(row[0]));
        value.textContent = row[1][1];
        item.appendChild(value);
        surfaceList.appendChild(item);
      });
      log.innerHTML = "";
      done.forEach(function (id) {
        var item = document.createElement("li");
        item.textContent = stepById(id).label;
        log.appendChild(item);
      });
      count.textContent = done.length + " / " + STEPS.length + " · attempt " + attempt;
    }

    function take(id) {
      var result = check(id, done);
      if (result.kind === "refuse") return say("", result.message);
      if (result.kind === "lockout") {
        isLocked = true;
        say("bad", result.message + " We start from scratch.");
        render();
        return;
      }
      done.push(id);
      var isFinished = done.length === STEPS.length;
      say(isFinished ? "good" : "", isFinished
        ? "All " + STEPS.length + " on attempt " + attempt + ": no public SSH, nothing else reachable, patches on autopilot, and OpenClaw installed last. " + stepById(id).said
        : stepById(id).said);
      render();
    }

    function reset() {
      if (done.length || isLocked) attempt++;
      done = [];
      isLocked = false;
      say("", "A fresh server. The scans started twelve seconds ago.");
      render();
    }

    pool.addEventListener("click", function (event) {
      var button = event.target.closest(".vp-step");
      if (button && !button.disabled) take(button.getAttribute("data-step"));
    });
    root.querySelector("#vp-restart").addEventListener("click", reset);

    root.querySelector("#vp-grid").hidden = false;
    root.querySelector("#vp-controls").hidden = false;
    say("", "A fresh server with a public IP and root SSH. Pick the first step.");
    render();
  }

  return { init: init };
})();
