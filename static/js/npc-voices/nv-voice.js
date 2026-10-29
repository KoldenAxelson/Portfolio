/* Mumble speech for /misc/npc-voices/, rebuilt from the Mythfall devlog's
   description: a typewriter timer types the line, and the letter that just
   appeared decides whether a sound plays, so the voice can never drift from
   the text. Every sound is synthesized here as it plays (a buzz through three
   vowel bands); nothing is recorded. One file for the three widgets, NvBuild,
   NvCast and NvLab (shortcodes/npc-voices/); the lazy loader fetches it once.
   Voices, stages and every tuning number come from data/npc-voices/*.yaml via
   the data-nv-* attributes (partials/npc-voices/data.html). */
(function () {
  // Three vowel bands per vowel (Hz, adult male), from Peterson & Barney's
  // 1952 averages: my stand-in for the "old speech research" the video mentions
  // but doesn't name. They measured no "oh", so oh uses their "aw" (bought).
  var VOWELS = {
    ah: [730, 1090, 2440],
    eh: [530, 1840, 2480],
    ee: [270, 2290, 3010],
    oh: [570, 840, 2410],
    oo: [300, 870, 2240],
    uh: [640, 1190, 2390]
  };
  var VOWEL_KEYS = Object.keys(VOWELS);
  var LETTER_VOWEL = { a: "ah", e: "eh", i: "ee", o: "oh", u: "uh", y: "ee" };
  var PAIR_VOWEL = { oo: "oo", ou: "oo", ew: "oo", ee: "ee", ea: "ee", ie: "ee", ai: "eh", ay: "eh" };
  var PAUSE_KINDS = { ",": "comma", ";": "comma", ":": "comma", ".": "stop", "?": "stop", "!": "stop", "…": "stop" };
  var BAND_WIDTHS_HZ = [90, 110, 170];
  var BEEP_S = 0.028;
  var PEAK = 0.32;
  var STORE_KEY = "nv-lab-voices";

  var audio = null;

  function getAudio() {
    if (audio) return audio;
    var Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return null;
    var ctx = new Context();
    var squash = ctx.createDynamicsCompressor();
    var master = ctx.createGain();
    master.gain.value = 0.7;
    squash.connect(master);
    master.connect(ctx.destination);
    audio = { ctx: ctx, out: squash };
    return audio;
  }

  function wakeAudio() {
    var sink = getAudio();
    if (sink && sink.ctx.state === "suspended") sink.ctx.resume();
    return sink;
  }

  /* ---- Reading the line ------------------------------------------------- */

  function isLetter(ch) { return /[a-z]/i.test(ch || ""); }

  function isVowelAt(chars, i) {
    var ch = (chars[i] || "").toLowerCase();
    if (ch && "aeiou".indexOf(ch) >= 0) return true;
    // y is a vowel after a consonant ("my", "fly"), a consonant at a word's start.
    return ch === "y" && isLetter(chars[i - 1]) && !isVowelAt(chars, i - 1);
  }

  // Template copy without the y rule: partials/misc/live/npc-voices.html.
  function startsVowelGroup(chars, i) { return isVowelAt(chars, i) && !isVowelAt(chars, i - 1); }

  function vowelFromLetters(chars, i) {
    var pair = (chars[i] + (chars[i + 1] || "")).toLowerCase();
    // A consonant (every-letter mode) gets the neutral "uh".
    return PAIR_VOWEL[pair] || LETTER_VOWEL[chars[i].toLowerCase()] || "uh";
  }

  // A letter waits letterMs; a comma commaX times that; a sentence end stopX
  // times a comma. The video's ratios are the lab.yaml defaults.
  function pauseAfter(ch, tuning) {
    var kind = PAUSE_KINDS[ch];
    if (kind === "comma") return tuning.letterMs * tuning.commaX;
    if (kind === "stop") return tuning.letterMs * tuning.commaX * tuning.stopX;
    return tuning.letterMs;
  }

  function wordSpans(chars) {
    var spans = [];
    var start = -1;
    for (var i = 0; i <= chars.length; i++) {
      var inWord = isLetter(chars[i]) || (chars[i] === "'" && isLetter(chars[i + 1]) && start >= 0);
      if (inWord && start < 0) start = i;
      if (inWord || start < 0) continue;
      spans.push({ start: start, end: i });
      start = -1;
    }
    return spans;
  }

  function wordOf(words, index) {
    for (var i = 0; i < words.length; i++) if (index >= words[i].start && index < words[i].end) return words[i];
    return null;
  }

  function isShout(chars, word) {
    var text = chars.slice(word.start, word.end).join("");
    return text.replace(/[^a-z]/gi, "").length > 1 && text === text.toUpperCase();
  }

  // Splits the line into phrases at punctuation; each phrase knows how it ends.
  function phrasesOf(chars) {
    var phrases = [];
    var start = 0;
    for (var i = 0; i < chars.length; i++) {
      if (!PAUSE_KINDS[chars[i]] || PAUSE_KINDS[chars[i + 1]]) continue;
      var isTrail = chars[i] === "…" || (chars[i] === "." && chars[i - 1] === ".");
      phrases.push({ start: start, end: i, ending: isTrail ? "trail" : chars[i] });
      start = i + 1;
    }
    if (start < chars.length) phrases.push({ start: start, end: chars.length, ending: "." });
    return phrases;
  }

  // The tune: drift down through the phrase, then let punctuation and capitals
  // shape it. Pitch is added up in semitones, the video's "four things added
  // together" (voice, place in phrase, nudge, wobble); the wobble is applied
  // inside renderVoice so it stays continuous across sounds.
  function applyTune(chars, sounds, tuning) {
    var words = wordSpans(chars);
    phrasesOf(chars).forEach(function (phrase) {
      var inPhrase = sounds.filter(function (s) { return s.index >= phrase.start && s.index <= phrase.end; });
      var last = inPhrase.length ? wordOf(words, inPhrase[inPhrase.length - 1].index) : null;
      inPhrase.forEach(function (sound, k) {
        var along = inPhrase.length > 1 ? k / (inPhrase.length - 1) : 0;
        sound.semis -= tuning.drift * along;
        if (phrase.ending === "!") sound.semis += tuning.exclaimLift * (1 - along) + tuning.exclaimLift / 3;
        if (phrase.ending === "trail") sound.gain *= 1 - 0.7 * along;
        if (phrase.ending === "?" && last && wordOf(words, sound.index) === last) sound.semis += tuning.questionLift * (1 + along / 2);
      });
    });
    sounds.forEach(function (sound) {
      var word = wordOf(words, sound.index);
      if (!word || !isShout(chars, word)) return;
      sound.semis += tuning.shoutLift;
      sound.gain *= 1.5;
    });
  }

  function makeSound(chars, i, flags, tuning) {
    var sound = {
      index: i,
      vowel: flags.vowel === "letter" ? vowelFromLetters(chars, i) : VOWEL_KEYS[Math.floor(Math.random() * VOWEL_KEYS.length)],
      semis: flags.random ? Math.random() * 14 - 7 : 0,
      gain: 1
    };
    if (flags.human) sound.semis += (Math.random() * 2 - 1) * tuning.nudge;
    return sound;
  }

  function buildPlan(text, flags, tuning) {
    var chars = Array.from(text);
    var sounds = [];
    var steps = chars.map(function (ch, i) {
      var step = { ch: ch, waitMs: pauseAfter(ch, tuning), sound: null };
      if (!isLetter(ch) || !(flags.every || startsVowelGroup(chars, i))) return step;
      step.sound = makeSound(chars, i, flags, tuning);
      sounds.push(step.sound);
      return step;
    });
    if (flags.tune) applyTune(chars, sounds, tuning);
    return { steps: steps, sounds: sounds };
  }

  /* ---- Making the sounds ------------------------------------------------ */

  // A shorter tube moves all three bands up together; a closed mouth squeezes
  // them toward a mutter.
  function bandsFor(vowelKey, voice, tuning) {
    var vowel = VOWELS[vowelKey];
    var mouth = voice.mouth;
    var tube = voice.tube;
    var centre = 1000 * tube;
    var gains = [1, 0.55 * (0.5 + 0.5 * mouth), 0.05 + 0.25 * mouth];
    return [
      vowel[0] * tube * (0.55 + 0.45 * mouth),
      centre + (vowel[1] * tube - centre) * mouth,
      vowel[2] * tube
    ].map(function (hz, k) { return { hz: hz, width: BAND_WIDTHS_HZ[k] * tuning.bandWidth, gain: gains[k] }; });
  }

  function resonatorCoefficients(band, rate) {
    var r = Math.exp(-Math.PI * band.width / rate);
    // The sine term evens out the peak, which would otherwise favour low bands.
    return { r: r, feedback: 2 * r * Math.cos(2 * Math.PI * band.hz / rate), gain: band.gain * 2 * Math.sin(2 * Math.PI * band.hz / rate) };
  }

  // A two-pole resonator: boosts a band around one pitch, which is all a vowel is.
  function resonate(input, output, band, rate) {
    var c = resonatorCoefficients(band, rate);
    var y1 = 0;
    var y2 = 0;
    for (var i = 0; i < input.length; i++) {
      var y = (1 - c.r) * input[i] + c.feedback * y1 - c.r * c.r * y2;
      output[i] += c.gain * y;
      y2 = y1;
      y1 = y;
    }
  }

  // The same resonators' loudness at one pitch, for the lab's band drawing.
  function bandResponse(bands, hz, rate) {
    var w = 2 * Math.PI * hz / rate;
    return bands.reduce(function (sum, band) {
      var c = resonatorCoefficients(band, rate);
      var re = 1 - c.feedback * Math.cos(w) + c.r * c.r * Math.cos(2 * w);
      var im = c.feedback * Math.sin(w) - c.r * c.r * Math.sin(2 * w);
      return sum + c.gain * (1 - c.r) / Math.sqrt(re * re + im * im);
    }, 0);
  }

  function shapeEnvelope(samples, shape, tuning, rate) {
    var attack = Math.max(1, Math.round((shape === "hit" ? 0.003 : tuning.attackMs / 1000) * rate));
    var release = Math.max(1, Math.round(tuning.releaseMs / 1000 * rate));
    for (var i = 0; i < samples.length; i++) {
      var level = i < attack ? 0.5 - 0.5 * Math.cos(Math.PI * i / attack) : 1;
      if (shape === "hit") level *= Math.exp(-(i / rate) / 0.05);
      var fromEnd = samples.length - 1 - i;
      if (shape !== "hit" && fromEnd < release) level *= 0.5 - 0.5 * Math.cos(Math.PI * fromEnd / release);
      samples[i] *= level;
    }
  }

  function normalize(samples, peak) {
    var max = 0;
    for (var i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
    if (!max) return;
    for (var j = 0; j < samples.length; j++) samples[j] *= peak / max;
  }

  function renderVoice(ctx, voice, sound, flags, tuning, clockS) {
    var rate = ctx.sampleRate;
    // On every letter the sounds must be short enough not to pile up.
    var seconds = flags.every ? tuning.letterMs * 1.5 / 1000 : tuning.soundMs / 1000;
    var length = Math.max(1, Math.round(seconds * rate));
    var buffer = ctx.createBuffer(1, length, rate);
    var out = buffer.getChannelData(0);
    var buzz = new Float32Array(length);
    var hz = voice.pitchHz * Math.pow(2, sound.semis / 12);
    var jitter = flags.human ? tuning.jitterPct / 100 : 0;
    var breath = flags.human ? voice.breath : 0;
    var phase = 0;
    var cycleScale = 1;
    var tilted = 0;
    for (var i = 0; i < length; i++) {
      var wobble = voice.wobble ? voice.wobble * Math.sin(2 * Math.PI * tuning.wobbleHz * (clockS + i / rate)) : 0;
      phase += hz * Math.pow(2, wobble / 12) * cycleScale / rate;
      if (phase >= 1) {
        phase -= 1;
        // Real vocal folds never repeat a cycle exactly; a perfectly even buzz reads as a robot.
        cycleScale = 1 + (Math.random() * 2 - 1) * jitter;
      }
      tilted += 0.3 * ((2 * phase - 1) - tilted);
      buzz[i] = tilted + (Math.random() * 2 - 1) * breath;
    }
    bandsFor(sound.vowel, voice, tuning).forEach(function (band) { resonate(buzz, out, band, rate); });
    shapeEnvelope(out, flags.shape, tuning, rate);
    normalize(out, PEAK * sound.gain);
    return buffer;
  }

  function renderBeep(ctx, sound, tuning) {
    var rate = ctx.sampleRate;
    var length = Math.round(BEEP_S * rate);
    var buffer = ctx.createBuffer(1, length, rate);
    var out = buffer.getChannelData(0);
    var hz = 440 * Math.pow(2, sound.semis / 12);
    for (var i = 0; i < length; i++) out[i] = Math.sin(2 * Math.PI * hz * i / rate);
    shapeEnvelope(out, "hit", tuning, rate);
    normalize(out, PEAK * 0.6);
    return buffer;
  }

  function playSound(voice, sound, flags, tuning, clockS) {
    var sink = getAudio();
    if (!sink) return;
    var node = sink.ctx.createBufferSource();
    node.buffer = flags.tone === "beep" ? renderBeep(sink.ctx, sound, tuning) : renderVoice(sink.ctx, voice, sound, flags, tuning, clockS);
    node.connect(sink.out);
    node.start();
  }

  /* ---- The dialogue box ------------------------------------------------- */

  function rgbVar(root, name) {
    var triple = getComputedStyle(root).getPropertyValue(name).trim();
    return triple ? "rgb(" + triple.split(/\s+/).join(",") + ")" : "#888";
  }

  // Shared by all three widgets: types a plan into #<prefix>-line, plays its
  // sounds and draws the pitch strip. Ids come from partials/npc-voices/box.html.
  function initPlayer(root, prefix) {
    var $ = function (name) { return root.querySelector("#" + prefix + "-" + name); };
    var line = $("line");
    var canvas = $("tune");
    var paint = canvas.getContext("2d");
    var token = 0;
    var timer = null;
    var plan = null;
    var letterMs = 0;
    var spans = [];

    function drawTune(playedUpTo) {
      var width = canvas.width;
      var height = canvas.height;
      paint.clearRect(0, 0, width, height);
      paint.fillStyle = rgbVar(root, "--c-border");
      paint.fillRect(0, height / 2, width, 1);
      if (!plan) return;
      var count = plan.steps.length;
      plan.sounds.forEach(function (sound) {
        var x = 10 + (count > 1 ? sound.index / (count - 1) : 0) * (width - 20);
        var y = height / 2 - Math.max(-9, Math.min(9, sound.semis)) * (height / 22);
        var isPlayed = sound.index <= playedUpTo;
        paint.globalAlpha = isPlayed ? Math.max(0.35, Math.min(1, sound.gain)) : 0.25;
        paint.fillStyle = rgbVar(root, isPlayed ? "--c-accent" : "--c-muted");
        paint.beginPath();
        paint.arc(x, y, isPlayed ? 4 : 3, 0, 2 * Math.PI);
        paint.fill();
      });
      paint.globalAlpha = 1;
    }

    // The rate while letters are typing, leaving out the punctuation pauses,
    // to compare with the video's "about 30 a second" and "about 10".
    function showRate(note) {
      var typingSeconds = plan.steps.length * letterMs / 1000;
      var perSecond = plan.sounds.length / typingSeconds;
      $("rate").textContent = plan.sounds.length + " sounds, about " + Math.round(perSecond) + " a second while typing" + (note || "");
    }

    function finish(note) {
      clearTimeout(timer);
      timer = null;
      spans.forEach(function (span) { span.classList.remove("is-hidden"); });
      drawTune(Infinity);
      $("skip").disabled = true;
      showRate(note);
    }

    function play(text, voice, flags, tuning, onDone) {
      var myToken = ++token;
      clearTimeout(timer);
      wakeAudio();
      letterMs = tuning.letterMs;
      plan = buildPlan(text, flags, tuning);
      line.textContent = "";
      spans = plan.steps.map(function (step) {
        var span = document.createElement("span");
        span.className = "nv-ch is-hidden" + (step.sound ? " is-voiced" : "");
        span.textContent = step.ch;
        line.appendChild(span);
        return span;
      });
      $("rate").textContent = "";
      $("skip").disabled = false;
      drawTune(-1);
      var startedAt = performance.now();
      var i = 0;
      (function typeNext() {
        if (myToken !== token) return;
        if (i >= plan.steps.length) {
          finish();
          if (onDone) onDone();
          return;
        }
        var step = plan.steps[i];
        spans[i].classList.remove("is-hidden");
        if (step.sound) {
          playSound(voice, step.sound, flags, tuning, (performance.now() - startedAt) / 1000);
          drawTune(i);
        }
        i++;
        timer = setTimeout(typeNext, step.waitMs);
      })();
    }

    // Skipping shows the whole line at once; the voice stops because there
    // are no letters left to type.
    function skip() {
      if (!timer) return;
      token++;
      finish(" (skipped)");
    }

    $("skip").addEventListener("click", skip);
    canvas.hidden = false;
    drawTune(-1);
    $("controls").hidden = false;
    return { play: play, playButton: $("play"), speaker: $("speaker"), line: line };
  }

  function readJson(root, name, fallback) {
    try { return JSON.parse(root.getAttribute(name)) || fallback; } catch (error) { return fallback; }
  }

  function readData(root) {
    return { stages: readJson(root, "data-nv-stages", []), voices: readJson(root, "data-nv-voices", []), tuning: readJson(root, "data-nv-tuning", {}) };
  }

  function selectPressed(buttons, chosen) {
    buttons.forEach(function (button) { button.setAttribute("aria-pressed", String(button === chosen)); });
  }

  function claim(root) {
    if (!root || root.getAttribute("data-nv-ready")) return false;
    root.setAttribute("data-nv-ready", "1");
    return true;
  }

  /* ---- The build-up and the cast ---------------------------------------- */

  window.NvBuild = {
    init: function (root) {
      if (!claim(root)) return;
      var data = readData(root);
      if (!data.stages.length || !data.voices.length) return;
      var player = initPlayer(root, "nv-build");
      var text = player.line.textContent.trim();
      var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-nv-stage]"));
      var chosen = 0;

      function playStage() { player.play(text, data.voices[0], data.stages[chosen].flags || {}, data.tuning); }

      buttons.forEach(function (button) {
        button.disabled = false;
        button.addEventListener("click", function () {
          chosen = Number(button.getAttribute("data-nv-stage"));
          selectPressed(buttons, button);
          root.querySelector("#nv-build-what").textContent = data.stages[chosen].what;
          playStage();
        });
      });
      player.playButton.addEventListener("click", playStage);
    }
  };

  window.NvCast = {
    init: function (root) {
      if (!claim(root)) return;
      var data = readData(root);
      if (!data.stages.length || !data.voices.length) return;
      var flags = data.stages[data.stages.length - 1].flags || {};
      var player = initPlayer(root, "nv-cast");
      var input = root.querySelector("#nv-cast-text");
      var fallback = input.value;
      var buttons = Array.prototype.slice.call(root.querySelectorAll("[data-nv-voice]"));
      var chosen = 0;
      var castGap = null;

      function lineText() { return input.value.trim() || fallback; }

      function playVoice(index, onDone) {
        clearTimeout(castGap);
        chosen = index;
        selectPressed(buttons, buttons[index]);
        player.speaker.textContent = data.voices[index].label;
        player.play(lineText(), data.voices[index], flags, data.tuning, onDone);
      }

      function playWholeCast(index) {
        if (index >= data.voices.length) return;
        playVoice(index, function () { castGap = setTimeout(function () { playWholeCast(index + 1); }, 450); });
      }

      buttons.forEach(function (button) {
        button.disabled = false;
        button.addEventListener("click", function () { playVoice(Number(button.getAttribute("data-nv-voice"))); });
      });
      input.disabled = false;
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") playVoice(chosen);
      });
      player.playButton.addEventListener("click", function () { playVoice(chosen); });
      root.querySelector("#nv-cast-all").addEventListener("click", function () { playWholeCast(0); });
    }
  };

  /* ---- The lab ---------------------------------------------------------- */

  var VOICE_FIELDS = ["pitchHz", "tube", "mouth", "breath", "wobble"];

  function loadSaved() {
    try { var list = JSON.parse(localStorage.getItem(STORE_KEY)); return Array.isArray(list) ? list : []; } catch (error) { return []; }
  }

  function storeSaved(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); return true; } catch (error) { return false; }
  }

  function slugOf(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "voice"; }

  // The same shape as an entry in data/npc-voices/voices.yaml.
  function voiceAsYaml(voice) {
    var lines = ['- key: "' + slugOf(voice.label) + '"', '  label: ' + JSON.stringify(voice.label)];
    VOICE_FIELDS.forEach(function (field) { lines.push("  " + field + ": " + voice[field]); });
    return lines.join("\n");
  }

  function formatValue(value, unit) {
    var shown = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 100) / 100;
    return shown + (unit ? " " + unit : "");
  }

  window.NvLab = {
    init: function (root) {
      if (!claim(root)) return;
      var data = readData(root);
      if (!data.voices.length) return;
      var $ = function (id) { return root.querySelector("#nv-lab-" + id); };
      var player = initPlayer(root, "nv-lab");
      var sliders = Array.prototype.slice.call(root.querySelectorAll("[data-nv-key]"));
      var options = Array.prototype.slice.call(root.querySelectorAll("[data-nv-toggle]"));
      var vowelButtons = Array.prototype.slice.call(root.querySelectorAll("[data-nv-vowel]"));
      var spectrum = $("spectrum");
      var paint = spectrum.getContext("2d");
      var voice = Object.assign({}, data.voices[0]);
      var tuning = Object.assign({}, data.tuning);
      var flags = {};
      var vowel = "ah";
      var saved = loadSaved();

      options.forEach(function (option) {
        if (option.getAttribute("aria-pressed") === "true") flags[option.getAttribute("data-nv-toggle")] = JSON.parse(option.getAttribute("data-nv-value"));
      });
      var defaultFlags = Object.assign({}, flags);

      function showValue(slider, key, value) {
        var text = formatValue(value, slider.getAttribute("data-nv-unit"));
        $("out-" + key).textContent = text;
        slider.setAttribute("aria-valuetext", text);
      }

      function syncControls() {
        sliders.forEach(function (slider) {
          var key = slider.getAttribute("data-nv-key");
          var value = slider.getAttribute("data-nv-target") === "voice" ? voice[key] : tuning[key];
          slider.value = value;
          showValue(slider, key, Number(value));
        });
        options.forEach(function (option) {
          var isOn = JSON.stringify(flags[option.getAttribute("data-nv-toggle")]) === option.getAttribute("data-nv-value");
          option.setAttribute("aria-pressed", String(isOn));
        });
        $("name").value = voice.label;
        player.speaker.textContent = voice.label;
        drawSpectrum();
      }

      // The tube's response for the chosen vowel, with the buzz's harmonics
      // as stems: what the tube does to them is the vowel you hear.
      function drawSpectrum() {
        // Drawn at the canvas's on-screen size so the labels stay readable on a phone.
        var scale = window.devicePixelRatio || 1;
        var width = spectrum.clientWidth || 640;
        var height = spectrum.clientHeight || 150;
        spectrum.width = Math.round(width * scale);
        spectrum.height = Math.round(height * scale);
        paint.setTransform(scale, 0, 0, scale, 0, 0);
        var maxHz = 5000;
        var rate = 48000;
        var bands = bandsFor(vowel, voice, tuning);
        var points = [];
        var peak = 0;
        for (var x = 0; x <= width; x += 2) {
          var level = bandResponse(bands, Math.max(20, x / width * maxHz), rate);
          points.push(level);
          peak = Math.max(peak, level);
        }
        paint.clearRect(0, 0, width, height);
        var accent = rgbVar(root, "--c-accent");
        paint.strokeStyle = rgbVar(root, "--c-muted");
        paint.globalAlpha = 0.45;
        for (var hz = voice.pitchHz; hz < maxHz; hz += voice.pitchHz) {
          var stemX = hz / maxHz * width;
          var stemLevel = bandResponse(bands, hz, rate) / peak;
          paint.beginPath();
          paint.moveTo(stemX, height - 14);
          paint.lineTo(stemX, height - 14 - stemLevel * (height - 30));
          paint.stroke();
        }
        paint.globalAlpha = 1;
        paint.strokeStyle = accent;
        paint.lineWidth = 2;
        paint.beginPath();
        points.forEach(function (level, k) {
          var px = k * 2;
          var py = height - 14 - level / peak * (height - 30);
          if (k === 0) paint.moveTo(px, py); else paint.lineTo(px, py);
        });
        paint.stroke();
        paint.lineWidth = 1;
        paint.fillStyle = rgbVar(root, "--c-muted");
        paint.font = "11px " + getComputedStyle(root).fontFamily;
        [1000, 2000, 3000, 4000].forEach(function (mark) { paint.fillText(mark / 1000 + " kHz", mark / maxHz * width - 14, height - 2); });
        bands.forEach(function (band, k) { paint.fillText("F" + (k + 1), band.hz / maxHz * width - 6, 12); });
      }

      function audition() {
        if (!wakeAudio()) return;
        var sound = { index: 0, vowel: vowel, semis: 0, gain: 1 };
        playSound(voice, sound, Object.assign({}, flags, { every: false }), tuning, 0);
      }

      function lineText() { return $("text").value.trim() || $("text").defaultValue; }

      function playLine() { player.play(lineText(), voice, flags, tuning); }

      function renderSaved() {
        var group = $("saved");
        group.textContent = "";
        saved.forEach(function (entry, i) {
          var option = document.createElement("option");
          option.value = "saved:" + i;
          option.textContent = entry.label;
          group.appendChild(option);
        });
        group.hidden = !saved.length;
      }

      function loadPreset(value) {
        var parts = value.split(":");
        var source = parts[0] === "saved" ? saved[Number(parts[1])] : data.voices[Number(parts[1])];
        if (!source) return;
        voice = Object.assign({}, source);
        if (source.tuning) tuning = Object.assign({}, data.tuning, source.tuning);
        if (source.flags) flags = Object.assign({}, defaultFlags, source.flags);
        syncControls();
        playLine();
      }

      sliders.forEach(function (slider) {
        slider.disabled = false;
        slider.addEventListener("input", function () {
          var key = slider.getAttribute("data-nv-key");
          var value = Number(slider.value);
          if (slider.getAttribute("data-nv-target") === "voice") voice[key] = value; else tuning[key] = value;
          showValue(slider, key, value);
          drawSpectrum();
        });
        slider.addEventListener("change", audition);
      });
      options.forEach(function (option) {
        option.disabled = false;
        option.addEventListener("click", function () {
          flags[option.getAttribute("data-nv-toggle")] = JSON.parse(option.getAttribute("data-nv-value"));
          syncControls();
          playLine();
        });
      });
      vowelButtons.forEach(function (button) {
        button.disabled = false;
        button.addEventListener("click", function () {
          vowel = button.getAttribute("data-nv-vowel");
          selectPressed(vowelButtons, button);
          drawSpectrum();
          audition();
        });
      });

      $("preset").disabled = false;
      $("preset").addEventListener("change", function () { loadPreset($("preset").value); });
      $("name").disabled = false;
      $("name").addEventListener("input", function () {
        voice.label = $("name").value.trim() || "Unnamed";
        player.speaker.textContent = voice.label;
      });
      $("text").disabled = false;
      $("text").addEventListener("keydown", function (event) {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        playLine();
      });
      player.playButton.addEventListener("click", playLine);

      $("save").addEventListener("click", function () {
        var entry = Object.assign({}, voice, { tuning: Object.assign({}, tuning), flags: Object.assign({}, flags) });
        var existing = saved.findIndex(function (other) { return other.label === entry.label; });
        if (existing >= 0) saved[existing] = entry; else saved.push(entry);
        var isStored = storeSaved(saved);
        renderSaved();
        $("preset").value = "saved:" + (existing >= 0 ? existing : saved.length - 1);
        $("rate").textContent = isStored ? "Saved “" + entry.label + "” in this browser." : "Couldn't save here (private window?). Copy as data instead.";
      });
      $("copy").addEventListener("click", function () {
        var yaml = voiceAsYaml(voice);
        var out = $("yaml");
        out.textContent = yaml;
        out.hidden = false;
        var done = function () { $("rate").textContent = "Copied. Paste it into data/npc-voices/voices.yaml."; };
        var showSelect = function () { $("rate").textContent = "Select the text below to copy it."; };
        if (!navigator.clipboard) { showSelect(); return; }
        navigator.clipboard.writeText(yaml).then(done, showSelect);
      });
      $("reset").addEventListener("click", function () {
        voice = Object.assign({}, data.voices[0]);
        tuning = Object.assign({}, data.tuning);
        flags = Object.assign({}, defaultFlags);
        $("preset").value = "cast:0";
        $("yaml").hidden = true;
        syncControls();
      });

      window.addEventListener("resize", drawSpectrum);
      renderSaved();
      syncControls();
    }
  };
})();
