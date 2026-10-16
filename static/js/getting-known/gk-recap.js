/* The recap email from the office-politics video, assembled live from a few
   fields. The markup already holds a finished example, so with JS off the
   reader still sees the shape; this only makes it theirs. */
window.GkRecap = (function () {
  function lines(text) {
    return text.split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
  }

  function init(root) {
    if (!root || root.getAttribute("data-gk-ready")) return;
    root.setAttribute("data-gk-ready", "1");

    var field = function (id) { return root.querySelector("#gk-rc-" + id); };
    var out = field("out");
    var copy = field("copy");
    var inputs = ["who", "topic", "what", "owners", "when"].map(field);

    function valueOf(id) {
      var el = field(id);
      return el.value.trim() || el.getAttribute("placeholder");
    }

    function render() {
      var agreed = lines(valueOf("what")).map(function (l) { return "- " + l; });
      var owners = lines(field("owners").value);
      var body = [
        "Subject: Recap: " + valueOf("topic"),
        "",
        "Hi " + valueOf("who") + ",",
        "",
        "Thanks for the time today. Writing down what we agreed so we're working from the same page:",
        "",
        agreed.join("\n")
      ];
      if (owners.length) body.push("", "Who's doing what:", owners.map(function (l) { return "- " + l; }).join("\n"));
      body.push("", "I'll have it done by " + valueOf("when") + ". If I've got any of this wrong, reply and I'll correct it before I start.");
      out.textContent = body.join("\n");
    }

    inputs.forEach(function (el) { el.addEventListener("input", render); });
    copy.addEventListener("click", function () {
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(out.textContent || "").then(done, function () { copy.textContent = "Select it and copy"; });
      } else { copy.textContent = "Select it and copy"; }
    });
    copy.hidden = false;
    render();
  }

  return { init: init };
})();
