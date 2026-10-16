/* A skill linter for the rules on /misc/claude/. Every check is a plain text
   test, so it can only catch what text can show; the caption says so. The
   sample in the markup is written to trip most checks on first load. */
window.ClLint = (function () {
  var NAME_MAX = 64;
  var DESCRIPTION_MAX = 1024;
  var BODY_MAX_LINES = 500;
  var TOC_AFTER_LINES = 100;
  var CHECKLIST_AFTER_STEPS = 5;

  function parse(text) {
    var match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(text);
    if (!match) return { front: null, body: text };
    var front = {};
    match[1].split("\n").forEach(function (line) {
      var kv = /^([a-zA-Z_-]+):\s*(.*)$/.exec(line);
      if (kv) front[kv[1]] = kv[2].replace(/^["']|["']$/g, "").trim();
    });
    return { front: front, body: match[2] };
  }

  function run(text) {
    var results = [];
    var add = function (level, message) { results.push({ level: level, message: message }); };
    var parsed = parse(text);
    var lines = parsed.body.split("\n");

    if (!parsed.front) {
      add("bad", "No frontmatter. A skill needs a name and a description between --- lines.");
    } else {
      var name = parsed.front.name || "";
      var description = parsed.front.description || "";
      if (!name) add("bad", "No name in the frontmatter.");
      else if (name.length > NAME_MAX || !/^[a-z0-9-]+$/.test(name)) add("bad", "Name must be lowercase letters, numbers and hyphens, at most " + NAME_MAX + " characters.");
      else if (/anthropic|claude/.test(name)) add("bad", "Name can't contain the reserved words \"anthropic\" or \"claude\".");
      else add("good", "Name \"" + name + "\" fits the rules.");

      if (!description) add("bad", "No description. It's what Claude reads to decide when to use the skill.");
      else if (description.length > DESCRIPTION_MAX) add("bad", "Description is " + description.length + " characters; the limit is " + DESCRIPTION_MAX + ".");
      else if (/^(i|i'm|i can|you|you can|use this)\b/i.test(description)) add("bad", "Description is in the first or second person. Write it in the third: \"Creates client invoices…\", not \"I can help…\".");
      else add("good", "Description is in the third person.");

      if (description && !/\b(when|use (it |this )?(for|when|to))\b/i.test(description)) add("warn", "Description says what it does but not when to use it. Add the trigger.");
    }

    if (lines.length > BODY_MAX_LINES) add("bad", "Body is " + lines.length + " lines. Keep SKILL.md under " + BODY_MAX_LINES + " and split the rest into linked files.");
    else add("good", "Body is " + lines.length + " lines, under " + BODY_MAX_LINES + ".");

    if (lines.length > TOC_AFTER_LINES && !/^#+\s*(contents|table of contents)/im.test(parsed.body)) add("warn", "Over " + TOC_AFTER_LINES + " lines with no contents list. A partial read may never reach the bottom.");

    var refs = parsed.body.match(/[\w./-]+\.md\b/g) || [];
    if (refs.length) add("warn", "Links to " + refs.filter(function (r, i) { return refs.indexOf(r) === i; }).join(", ") + ". Make sure those files don't link on to further files.");

    if (/^(an?|the) \w+ is (a|an|the) /im.test(parsed.body)) add("warn", "A line explains what something is. If Claude already knows it, cut it.");

    var shouted = lines.filter(function (l) { return /\b(NEVER|ALWAYS|MUST|DO NOT)\b/.test(l); });
    if (shouted.length) add("warn", "Rule in capitals: \"" + shouted[0].trim().replace(/[.\s]+$/, "") + "\". If it can never break, move it into a hook.");

    var steps = lines.filter(function (l) { return /^\s*\d+\.\s/.test(l); }).length;
    if (steps > CHECKLIST_AFTER_STEPS && !/- \[ \]/.test(parsed.body)) add("warn", steps + " numbered steps and no checklist. Give Claude a - [ ] list to copy and tick, with a go-back line.");

    return results;
  }

  function init(root) {
    if (!root || root.getAttribute("data-cl-ready")) return;
    root.setAttribute("data-cl-ready", "1");

    var input = root.querySelector("#cl-lint-in");
    var out = root.querySelector("#cl-lint-out");

    function render() {
      out.innerHTML = "";
      run(input.value).forEach(function (r) {
        var li = document.createElement("li");
        li.className = "cl-check is-" + r.level;
        li.textContent = r.message;
        out.appendChild(li);
      });
    }

    input.addEventListener("input", render);
    render();
  }

  return { init: init };
})();
