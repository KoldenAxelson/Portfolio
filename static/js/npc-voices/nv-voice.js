/* Mumble speech for /misc/npc-voices/, rebuilt from the Mythfall devlog's
   description: the line is read into a timeline of letters, and the letters
   that start a vowel group get a sound. Every sound is synthesized here (a
   buzz through three vowel bands); nothing is recorded. The widget is NvLab
   (shortcodes/npc-voices/lab.html), loaded lazily. Voices, the Simple view's
   choices and every tuning number come from data/npc-voices/*.yaml via the
   data-nv-* attributes (partials/npc-voices/data.html). */
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
  // Consonants, by how the mouth makes them. Each is heard mostly in how the
  // vowel's bands glide in from it: every place in the mouth has a "locus" the
  // second band points back to. Delattre, Liberman & Cooper (1955) found 720 Hz
  // for b, 1800 Hz for d and 3000 Hz for g, the g only before vowels whose
  // second band is above about 1200 Hz. Hiss peaks follow Jongman, Wayland &
  // Wong (2000): "sh" around 2.5-3 kHz, "s" well above it. The glide bands,
  // levels and lengths are tuned by ear.
  //   kind   : stop (silence, then a pop) · nasal (a hum) · hiss (filtered
  //            noise) · breath (h) · glide (l, r, w, y slide into the vowel)
  //   place  : the locus the bands glide from (PLACE_HZ)
  //   voiced : the buzz runs through the consonant too
  //   hissHz / hissLevel : the noise band and its loudness against the vowel
  var PLACE_HZ = { lip: 720, teeth: 1600, ridge: 1800, palate: 2200, velum: 3000 };
  var CONSONANTS = {
    b: { kind: "stop", place: "lip", voiced: true },
    p: { kind: "stop", place: "lip" },
    d: { kind: "stop", place: "ridge", voiced: true },
    t: { kind: "stop", place: "ridge" },
    g: { kind: "stop", place: "velum", voiced: true },
    k: { kind: "stop", place: "velum" },
    ch: { kind: "stop", place: "palate", hissHz: 2800, hissLevel: 0.4 },
    j: { kind: "stop", place: "palate", voiced: true, hissHz: 2800, hissLevel: 0.3 },
    m: { kind: "nasal", place: "lip", voiced: true },
    n: { kind: "nasal", place: "ridge", voiced: true },
    f: { kind: "hiss", place: "lip", hissHz: 4500, hissLevel: 0.12 },
    v: { kind: "hiss", place: "lip", voiced: true, hissHz: 4500, hissLevel: 0.08 },
    th: { kind: "hiss", place: "teeth", hissHz: 5000, hissLevel: 0.1 },
    s: { kind: "hiss", place: "ridge", hissHz: 5500, hissLevel: 0.45 },
    z: { kind: "hiss", place: "ridge", voiced: true, hissHz: 5500, hissLevel: 0.3 },
    sh: { kind: "hiss", place: "palate", hissHz: 2800, hissLevel: 0.45 },
    h: { kind: "breath" },
    l: { kind: "glide", bands: [360, 1000, 2700] },
    r: { kind: "glide", bands: [420, 1150, 1600] },
    w: { kind: "glide", bands: [300, 700, 2200] },
    y: { kind: "glide", bands: [280, 2250, 3000] }
  };
  // The pop as a stop opens, by place; a velar pop sits near the vowel's own second band.
  // Kept soft and 10 ms long: a loud, short pop is the click the video's consonants were.
  var BURSTS = { lip: { hz: 900, width: 1500, level: 0.18 }, ridge: { hz: 4000, width: 2500, level: 0.3 }, palate: { hz: 2800, width: 1500, level: 0.3 }, velum: { level: 0.3, width: 700 } };
  var KIND_LENGTH = { stop: 1, nasal: 0.9, hiss: 1.1, breath: 0.8, glide: 0.7 };
  var DIGRAPHS = { sh: "sh", ch: "ch", th: "th", ph: "f", wh: "w", ck: "k", gh: "g" };
  var LETTER_CONSONANT = { q: "k", x: "z" };
  var PAUSE_KINDS = { ",": "comma", ";": "comma", ":": "comma", ".": "stop", "?": "stop", "!": "stop", "…": "stop" };
  var BAND_WIDTHS_HZ = [90, 110, 170];
  var BEEP_S = 0.028;
  var PEAK = 0.32;
  var STORE_KEY = "nv-lab-voices";
  // Time to start the first sound after Play, so it never starts late.
  var LEAD_S = 0.03;

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

  function consonantOfLetter(chars, i) {
    var ch = chars[i].toLowerCase();
    if (ch === "c") return /[eiy]/i.test(chars[i + 1] || "") ? "s" : "k";
    return LETTER_CONSONANT[ch] || (CONSONANTS[ch] ? ch : null);
  }

  // The consonant a vowel group opens with: the letter right before it in the
  // same word, or the digraph (sh, ch, th…) its last two letters make.
  function consonantBefore(chars, i) {
    if (!isLetter(chars[i - 1]) || isVowelAt(chars, i - 1)) return null;
    var pair = ((chars[i - 2] || "") + chars[i - 1]).toLowerCase();
    return DIGRAPHS[pair] || consonantOfLetter(chars, i - 1);
  }

  // Sounding every letter, a consonant letter is its consonant on a short "uh"
  // (the second letter of a digraph plays the digraph); a vowel stands alone.
  function onsetFor(chars, i, flags) {
    if (!flags.every) return consonantBefore(chars, i);
    if (isVowelAt(chars, i)) return null;
    var pair = ((chars[i - 1] || "") + chars[i]).toLowerCase();
    return DIGRAPHS[pair] || consonantOfLetter(chars, i);
  }

  // How long a consonant runs. Before a vowel group it runs ahead of the
  // vowel's letter; sounding every letter it has to fit in the letter's sound.
  function consonantMs(onset, flags, tuning) {
    var ms = tuning.consonantMs * KIND_LENGTH[CONSONANTS[onset].kind];
    return flags.every ? Math.min(ms, tuning.letterMs * 1.5 * 0.45) : ms;
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
    sound.onset = flags.consonants && flags.tone !== "beep" ? onsetFor(chars, i, flags) : null;
    sound.leadMs = sound.onset && !flags.every ? consonantMs(sound.onset, flags, tuning) : 0;
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
  function smoothstep(x) {
    var t = Math.max(0, Math.min(1, x));
    return t * t * (3 - 2 * t);
  }

  // A resonator whose centre slides from fromHz to the band's own pitch over
  // glideLen samples starting at glideAt. That slide is what a consonant
  // sounds like. Coefficients are refreshed every few samples while it moves.
  function resonateGliding(input, output, band, fromHz, glideAt, glideLen, rate) {
    var y1 = 0;
    var y2 = 0;
    var c = null;
    var isMoving = fromHz !== band.hz;
    for (var i = 0; i < input.length; i++) {
      if (!c || (isMoving && i % 16 === 0)) {
        var hz = fromHz + (band.hz - fromHz) * smoothstep((i - glideAt) / glideLen);
        c = resonatorCoefficients({ hz: hz, width: band.width, gain: band.gain }, rate);
      }
      var y = (1 - c.r) * input[i] + c.feedback * y1 - c.r * c.r * y2;
      output[i] += c.gain * y;
      y2 = y1;
      y1 = y;
    }
  }

  function resonate(input, output, band, rate) { resonateGliding(input, output, band, band.hz, 0, 1, rate); }

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

  // The buzz from the vocal folds, with its breath, jitter and wobble.
  function makeBuzz(length, voice, sound, flags, tuning, clockS, rate) {
    var buzz = new Float32Array(length);
    var hz = voice.pitchHz * Math.pow(2, sound.semis / 12);
    var jitter = flags.human ? tuning.jitterPct / 100 : 0;
    var breath = flags.human ? voice.breath : 0;
    // Whispering is breath with the buzz faded out: the vowel bands still
    // shape the noise, so the vowels survive with no pitch at all.
    var whisper = voice.whisper || 0;
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
      buzz[i] = tilted * (1 - whisper) + (Math.random() * 2 - 1) * (breath + whisper);
    }
    return buzz;
  }

  function renderVoice(ctx, voice, sound, flags, tuning, clockS) {
    var rate = ctx.sampleRate;
    // On every letter the sounds must be short enough not to pile up.
    var vowelMs = flags.every ? tuning.letterMs * 1.5 : tuning.soundMs;
    var leadMs = sound.onset ? consonantMs(sound.onset, flags, tuning) : 0;
    var totalMs = flags.every ? vowelMs : vowelMs + leadMs;
    var length = Math.max(1, Math.round(totalMs / 1000 * rate));
    var buffer = ctx.createBuffer(1, length, rate);
    var out = buffer.getChannelData(0);
    var buzz = makeBuzz(length, voice, sound, flags, tuning, clockS, rate);
    var bands = bandsFor(sound.vowel, voice, tuning);
    if (sound.onset) {
      renderSyllable(out, buzz, CONSONANTS[sound.onset], bands, voice, tuning, Math.round(leadMs / 1000 * rate), rate);
    } else {
      bands.forEach(function (band) { resonate(buzz, out, band, rate); });
    }
    shapeEnvelope(out, flags.shape, tuning, rate);
    normalize(out, PEAK * sound.gain);
    return buffer;
  }

  // 1 inside [from, to), easing in and out over fade samples at each edge.
  function inside(n, from, to, fade) {
    if (n < from || n >= to) return 0;
    return Math.min(1, (n - from + 1) / fade, (to - n) / fade);
  }

  // Where each of the vowel's bands starts its glide. Stops, nasals and hisses
  // aim the second band at their place's locus (most of the way: a transition
  // points at its locus without reaching it) and start the first band low;
  // glides start from their own bands; h starts on the vowel itself.
  function glideStarts(spec, bands, tube) {
    if (spec.kind === "breath") return bands.map(function (band) { return band.hz; });
    if (spec.kind === "glide") return spec.bands.map(function (hz) { return hz * tube; });
    var second = bands[1].hz;
    var hasVelarLocus = spec.place !== "velum" || second >= 1200 * tube;
    var locus = hasVelarLocus ? PLACE_HZ[spec.place] * tube : second * 1.15;
    var secondStart = second + (locus - second) * 0.6;
    // A velar pinches the second and third bands together.
    var thirdStart = spec.place === "velum" ? secondStart + 250 * tube : bands[2].hz;
    return [bands[0].hz * (spec.kind === "hiss" ? 0.7 : 0.5), secondStart, thirdStart];
  }

  function peakOf(samples, from) {
    var peak = 0;
    for (var i = from || 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
    return peak;
  }

  function addScaled(out, part, scale) {
    for (var i = 0; i < out.length; i++) out[i] += part[i] * scale;
  }

  // A consonant then its vowel. The consonant runs up to vowelAt, built from
  // four sources laid out in time by its kind: the buzz and aspiration go
  // through the gliding vowel bands, hiss through its own noise band, and a
  // nasal hum through a low one. Hiss and hum are set against the vowel's
  // loudness, so consonant strength (tuning.consonantMix) means the same thing
  // at every pitch.
  function renderSyllable(out, buzz, spec, bands, voice, tuning, vowelAt, rate) {
    var length = out.length;
    var ms = function (value) { return Math.max(1, Math.round(value / 1000 * rate)); };
    var fade = ms(3);
    var closeEnd = Math.round(vowelAt * 0.55);
    var burstEnd = closeEnd + ms(10);
    var isAffricate = spec.kind === "stop" && spec.hissHz;
    var voiced = new Float32Array(length);
    var hissSource = new Float32Array(length);
    var humSource = new Float32Array(length);
    for (var n = 0; n < length; n++) {
      var noise = Math.random() * 2 - 1;
      var voicing = inside(n, vowelAt, length + fade, fade);
      var aspiration = 0;
      var hiss = 0;
      var hum = 0;
      if (spec.kind === "stop") {
        if (spec.voiced) voicing = inside(n, burstEnd, length + fade, fade);
        hum = spec.voiced ? inside(n, 0, closeEnd, fade) : 0;
        // A pop opens fast and dies away; a flat-topped one is a click.
        hiss = isAffricate ? inside(n, closeEnd, vowelAt, ms(3)) : inside(n, closeEnd, burstEnd, ms(2)) * Math.exp(-(n - closeEnd) / ms(4));
        if (!spec.voiced && !isAffricate) aspiration = 0.55 * inside(n, burstEnd, vowelAt + ms(8), fade);
      } else if (spec.kind === "nasal") {
        hum = inside(n, 0, vowelAt + ms(5), fade);
        voicing = inside(n, vowelAt - ms(3), length + fade, fade);
      } else if (spec.kind === "hiss") {
        hiss = inside(n, 0, vowelAt, Math.max(fade, Math.round(vowelAt * 0.3)));
        if (spec.voiced) voicing = Math.max(voicing, 0.35 * inside(n, 0, vowelAt, fade));
      } else if (spec.kind === "breath") {
        aspiration = 0.6 * inside(n, 0, vowelAt + ms(5), fade);
      } else {
        voicing = n < vowelAt ? 0.75 * inside(n, 0, vowelAt, fade) : 1;
      }
      voiced[n] = buzz[n] * voicing + noise * aspiration;
      hissSource[n] = noise * hiss;
      humSource[n] = buzz[n] * hum;
    }

    var starts = glideStarts(spec, bands, voice.tube);
    var glideLen = ms(spec.kind === "glide" ? 70 : 45);
    var tract = new Float32Array(length);
    bands.forEach(function (band, k) { resonateGliding(voiced, tract, band, starts[k], vowelAt, glideLen, rate); });
    var vowelPeak = peakOf(tract, vowelAt) || 1;
    out.set(tract);

    var burst = BURSTS[spec.place] || BURSTS.ridge;
    var hissBand = spec.hissHz
      ? { hz: spec.hissHz * Math.sqrt(voice.tube), width: spec.hissHz * 0.35, gain: 1 }
      : { hz: burst.hz || bands[1].hz * 1.1, width: burst.width, gain: 1 };
    var hissLevel = spec.hissLevel || burst.level;
    mixBand(out, hissSource, hissBand, hissLevel * vowelPeak * tuning.consonantMix, rate);
    var humLevel = spec.kind === "nasal" ? 0.45 : 0.12;
    mixBand(out, humSource, { hz: 280 * voice.tube, width: 120, gain: 1 }, humLevel * vowelPeak * tuning.consonantMix, rate);
  }

  // Filters a source through one band and adds it to out at the given peak.
  function mixBand(out, source, band, peak, rate) {
    if (!peakOf(source)) return;
    var shaped = new Float32Array(out.length);
    resonate(source, shaped, band, rate);
    addScaled(out, shaped, peak / (peakOf(shaped) || 1));
  }

  // The plain beep: a short sine an octave over the voice, struck and fading,
  // so each character still gets its own. A voice can bring its own blip in
  // flags.blip (picker.yaml's encore): its length, attack and release, the
  // octave, and a random pitch wobble per blip.
  var PLAIN_BLIP = { ms: BEEP_S * 1000, octave: 2, wobble: 0 };

  function renderBeep(ctx, voice, sound, flags, tuning) {
    var rate = ctx.sampleRate;
    var blip = flags.blip || PLAIN_BLIP;
    var length = Math.round(blip.ms / 1000 * rate);
    var buffer = ctx.createBuffer(1, length, rate);
    var out = buffer.getChannelData(0);
    var wobble = 1 + (Math.random() * 2 - 1) * blip.wobble;
    var hz = blip.octave * voice.pitchHz * wobble * Math.pow(2, sound.semis / 12);
    // A square wave keeps a low beep audible on small speakers: its harmonics carry it.
    var isSquare = flags.wave === "square";
    for (var i = 0; i < length; i++) {
      var sine = Math.sin(2 * Math.PI * hz * i / rate);
      out[i] = isSquare ? Math.sign(sine) : sine;
    }
    if (flags.blip) shapeBlip(out, blip, rate); else shapeEnvelope(out, "hit", tuning, rate);
    normalize(out, PEAK * 0.6);
    return buffer;
  }

  // Up fast, hold, then a curved let-go: a blip that reads as "duh", not "tick".
  function shapeBlip(samples, blip, rate) {
    var attack = Math.max(1, Math.round(blip.attackMs / 1000 * rate));
    var release = Math.max(1, Math.round(blip.releaseMs / 1000 * rate));
    for (var i = 0; i < samples.length; i++) {
      var fromEnd = samples.length - 1 - i;
      var level = Math.min(1, i / attack, fromEnd < release ? Math.pow(fromEnd / release, 2) : 1);
      samples[i] *= level;
    }
  }

  function renderSound(ctx, voice, sound, flags, tuning, clockS) {
    return flags.tone === "beep" ? renderBeep(ctx, voice, sound, flags, tuning) : renderVoice(ctx, voice, sound, flags, tuning, clockS);
  }

  function startBuffer(sink, buffer, whenS) {
    var node = sink.ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(sink.out);
    node.start(whenS);
    return node;
  }

  // Where the speakers are on the audio clock right now. getOutputTimestamp is
  // the browser's own report of the sample being heard, which the latency
  // estimates miss: Safari reports no outputLatency before 18.4 and can play
  // Web Audio a second late over Bluetooth (WebKit bug 221334). The 3 s cap
  // drops older Safari's timestamps, which came back in the wrong units.
  function heardTimeS(ctx) {
    var stamp = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
    var behindS = stamp ? ctx.currentTime - stamp.contextTime : Infinity;
    if (stamp && stamp.contextTime > 0 && stamp.performanceTime > 0 && behindS >= 0 && behindS < 3) {
      return stamp.contextTime + (performance.now() - stamp.performanceTime) / 1000;
    }
    return ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0);
  }

  /* ---- The dialogue box ------------------------------------------------- */

  function rgbVar(root, name) {
    var triple = getComputedStyle(root).getPropertyValue(name).trim();
    return triple ? "rgb(" + triple.split(/\s+/).join(",") + ")" : "#888";
  }

  // Types a plan into #<prefix>-line, plays its sounds and draws the pitch
  // strip. Ids come from partials/npc-voices/box.html.
  //
  // Every sound is scheduled on the audio clock up front, and each frame the
  // letters catch up to the sample the speakers are playing (heardTimeS).
  // Timers and audio used to run on separate clocks, and the letters lit
  // before you heard them by the whole output delay.
  function initPlayer(root, prefix, onPlay) {
    var $ = function (name) { return root.querySelector("#" + prefix + "-" + name); };
    var playButton = $("play");
    var line = $("line");
    var canvas = $("tune");
    var paint = canvas.getContext("2d");
    var run = null;
    var plan = null;
    var letterMs = 0;
    var spans = [];

    // Colours come from the strip's frame (.nv-tune-well in npc-voices.css),
    // which matches the dialogue box in both themes.
    function tuneColor(name) { return getComputedStyle(canvas).getPropertyValue(name).trim() || "#888"; }

    function drawTune(playedUpTo) {
      var width = canvas.width;
      var height = canvas.height;
      paint.clearRect(0, 0, width, height);
      paint.fillStyle = tuneColor("--nv-tune-line");
      paint.fillRect(0, height / 2, width, 1);
      if (!plan) return;
      var count = plan.steps.length;
      plan.sounds.forEach(function (sound) {
        var x = 10 + (count > 1 ? sound.index / (count - 1) : 0) * (width - 20);
        var y = height / 2 - Math.max(-9, Math.min(9, sound.semis)) * (height / 22);
        var isPlayed = sound.index <= playedUpTo;
        paint.globalAlpha = isPlayed ? Math.max(0.35, Math.min(1, sound.gain)) : 0.5;
        paint.fillStyle = tuneColor(isPlayed ? "--nv-tune-lit" : "--nv-tune-dot");
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

    function stopRun(shouldSilence) {
      if (!run) return;
      cancelAnimationFrame(run.frame);
      if (shouldSilence) run.nodes.forEach(function (node) { try { node.stop(); } catch (error) { /* already ended */ } });
      run = null;
    }

    // One button: Play while idle, Stop while a line plays.
    function showPlaying(isPlaying) {
      playButton.setAttribute("data-playing", String(isPlaying));
      playButton.setAttribute("aria-label", isPlaying ? "Stop" : "Play");
      playButton.title = isPlaying ? "Stop" : "Play";
    }

    function finish(note) {
      spans.forEach(function (span) { span.classList.remove("is-hidden"); });
      drawTune(Infinity);
      showPlaying(false);
      showRate(note);
    }

    function scheduleClock(voice, flags, tuning, thisRun) {
      var sink = wakeAudio();
      if (!sink) {
        var startedAt = performance.now();
        return function () { return performance.now() - startedAt; };
      }
      var ctx = sink.ctx;
      // A sound with a consonant starts that much before its vowel's letter,
      // so the vowel still lands on the letter.
      var startMs = function (step) { return step.atMs - step.sound.leadMs; };
      var buffers = plan.steps.map(function (step) {
        return step.sound ? renderSound(ctx, voice, step.sound, flags, tuning, startMs(step) / 1000) : null;
      });
      var maxLeadMs = plan.sounds.reduce(function (most, sound) { return Math.max(most, sound.leadMs); }, 0);
      // Read after rendering, which takes a few milliseconds on a long line.
      var startS = ctx.currentTime + LEAD_S + maxLeadMs / 1000;
      buffers.forEach(function (buffer, i) {
        if (buffer) thisRun.nodes.push(startBuffer(sink, buffer, startS + startMs(plan.steps[i]) / 1000));
      });
      // A swelling sound is heard partway up its attack, not at its first sample.
      var onsetMs = flags.tone !== "beep" && flags.shape !== "hit" ? tuning.attackMs / 3 : 0;
      return function () { return (heardTimeS(ctx) - startS) * 1000 - onsetMs; };
    }

    function play(text, voice, flags, tuning) {
      stopRun(true);
      letterMs = tuning.letterMs;
      plan = buildPlan(text, flags, tuning);
      var atMs = 0;
      plan.steps.forEach(function (step) {
        step.atMs = atMs;
        atMs += step.waitMs;
      });
      line.textContent = "";
      spans = plan.steps.map(function (step) {
        var span = document.createElement("span");
        span.className = "nv-ch is-hidden" + (step.sound ? " is-voiced" : "");
        span.textContent = step.ch;
        line.appendChild(span);
        return span;
      });
      $("rate").textContent = "";
      showPlaying(true);
      drawTune(-1);
      var thisRun = { nodes: [], frame: 0 };
      run = thisRun;
      var clock = scheduleClock(voice, flags, tuning, thisRun);
      var shown = 0;
      var lastVoiced = -1;
      (function reveal() {
        if (run !== thisRun) return;
        var nowMs = clock();
        var voicedBefore = lastVoiced;
        for (; shown < plan.steps.length && plan.steps[shown].atMs <= nowMs; shown++) {
          spans[shown].classList.remove("is-hidden");
          if (plan.steps[shown].sound) lastVoiced = shown;
        }
        if (lastVoiced !== voicedBefore) drawTune(lastVoiced);
        if (shown < plan.steps.length) {
          thisRun.frame = requestAnimationFrame(reveal);
          return;
        }
        stopRun(false);
        finish();
      })();
    }

    // Stopping shows the whole line at once; the voice stops because there
    // are no letters left to type.
    function stop() {
      stopRun(true);
      finish(" (stopped)");
    }

    // onPlay starts a line with whatever settings are current when it's pressed.
    playButton.addEventListener("click", function () { if (run) stop(); else onPlay(); });
    canvas.hidden = false;
    drawTune(-1);
    playButton.hidden = false;
    return { play: play, speaker: $("speaker"), line: line, rate: $("rate") };
  }

  function readJson(root, name, fallback) {
    try { return JSON.parse(root.getAttribute(name)) || fallback; } catch (error) { return fallback; }
  }

  function selectPressed(buttons, chosen) {
    buttons.forEach(function (button) { button.setAttribute("aria-pressed", String(button === chosen)); });
  }

  function claim(root) {
    if (!root || root.getAttribute("data-nv-ready")) return false;
    root.setAttribute("data-nv-ready", "1");
    return true;
  }

  function enable(elements) { elements.forEach(function (element) { element.disabled = false; }); }

  /* ---- Simple view: a voice from a few picks ---------------------------- */

  var VOICE_FIELDS = ["pitchHz", "tube", "mouth", "breath", "whisper", "wobble"];

  // Starts from picker.yaml's base and applies each category's picked option
  // in file order. Voice fields and tuning keys share one namespace there.
  // Starts from picker.yaml's base and applies each category's picked option
  // in file order, then the option's encore when picks.encore names it. Voice
  // fields and tuning keys share one namespace there.
  function settingsFromPicks(picker, picks, tuningDefaults) {
    var voice = {};
    var tuning = Object.assign({}, tuningDefaults);
    VOICE_FIELDS.forEach(function (field) { voice[field] = picker.base[field]; });
    var flags = Object.assign({}, picker.base.flags);
    var targetOf = function (key) { return VOICE_FIELDS.indexOf(key) >= 0 ? voice : tuning; };
    var apply = function (option) {
      Object.keys(option.set || {}).forEach(function (key) { targetOf(key)[key] = option.set[key]; });
      Object.keys(option.scale || {}).forEach(function (key) { targetOf(key)[key] *= option.scale[key]; });
      Object.assign(flags, option.flags || {});
    };
    var name = null;
    picker.categories.forEach(function (category) {
      var option = category.options.find(function (candidate) { return candidate.key === picks[category.key]; });
      if (!option) return;
      apply(option);
      if (!option.encore || picks.encore !== option.key) return;
      apply(option.encore);
      name = option.encore.name;
    });
    voice.label = name || (picker.names || {})[picks.age + "-" + picks.voice] || "Stranger";
    return { voice: voice, tuning: tuning, flags: flags };
  }

  /* ---- Advanced view: saved voices -------------------------------------- */

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
    VOICE_FIELDS.forEach(function (field) { lines.push("  " + field + ": " + Math.round((voice[field] || 0) * 100) / 100); });
    return lines.join("\n");
  }

  function formatValue(value, unit) {
    var shown = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 100) / 100;
    return shown + (unit ? " " + unit : "");
  }

  function copySettings(settings) {
    return { voice: Object.assign({}, settings.voice), tuning: Object.assign({}, settings.tuning), flags: Object.assign({}, settings.flags) };
  }

  /* ---- The widget ------------------------------------------------------- */

  window.NvLab = {
    init: function (root) {
      if (!claim(root)) return;
      var voices = readJson(root, "data-nv-voices", []);
      var tuningDefaults = readJson(root, "data-nv-tuning", {});
      var picker = readJson(root, "data-nv-picker", null);
      if (!voices.length || !picker) return;
      var $ = function (id) { return root.querySelector("#nv-lab-" + id); };
      var all = function (selector) { return Array.prototype.slice.call(root.querySelectorAll(selector)); };
      var player = initPlayer(root, "nv-lab", function () { playLine(); });
      var chips = all("[data-nv-pick]");
      var sliders = all("[data-nv-key]");
      var options = all("[data-nv-toggle]");
      var vowelButtons = all("[data-nv-vowel]");
      var spectrum = $("spectrum");
      var paint = spectrum.getContext("2d");
      var picks = {};
      var view = "simple";
      var simple = null;
      var advanced = null;
      // Advanced follows the Simple pick until its own controls are touched.
      var isAdvancedOwn = false;
      var vowel = "ah";
      var saved = loadSaved();

      chips.forEach(function (chip) {
        if (chip.getAttribute("aria-pressed") === "true") picks[chip.getAttribute("data-nv-pick")] = chip.getAttribute("data-nv-option");
      });

      function current() { return view === "simple" ? simple : advanced; }

      function lineText() { return $("text").value.trim() || $("text").defaultValue; }

      function playLine() {
        var settings = current();
        var text = settings.flags.lowercase ? lineText().toLowerCase() : lineText();
        player.play(text, settings.voice, settings.flags, settings.tuning);
      }

      // The speaker's name and the box's typeface follow whichever voice is showing.
      function dressBox(settings) {
        player.speaker.textContent = settings.voice.label;
        player.speaker.parentElement.setAttribute("data-face", settings.flags.face || "");
      }

      /* Simple */

      // A chip with an encore swaps its label and hint while the encore is on.
      var plainText = new Map();
      chips.forEach(function (chip) {
        var hint = chip.querySelector(".nv-chip-hint");
        plainText.set(chip, { label: chip.querySelector(".nv-chip-label").textContent, hint: hint ? hint.textContent : "" });
      });

      function showChip(chip) {
        var option = chip.getAttribute("data-nv-option");
        var isPicked = picks[chip.getAttribute("data-nv-pick")] === option;
        var isEncore = isPicked && picks.encore === option;
        chip.setAttribute("aria-pressed", String(isPicked));
        if (!chip.hasAttribute("data-nv-encore-label")) return;
        chip.setAttribute("data-encore", String(isEncore));
        var hint = chip.querySelector(".nv-chip-hint");
        chip.querySelector(".nv-chip-label").textContent = isEncore ? chip.getAttribute("data-nv-encore-label") : plainText.get(chip).label;
        if (hint) hint.textContent = isEncore ? chip.getAttribute("data-nv-encore-hint") : plainText.get(chip).hint;
      }

      function applyPicks() {
        simple = settingsFromPicks(picker, picks, tuningDefaults);
        chips.forEach(showChip);
        if (!isAdvancedOwn) advanced = copySettings(simple);
        if (view === "simple") dressBox(simple);
      }

      // Pressing a picked chip that has an encore flips the encore; picking
      // anything else in that row leaves it.
      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          var category = chip.getAttribute("data-nv-pick");
          var option = chip.getAttribute("data-nv-option");
          var isAgain = picks[category] === option;
          if (isAgain && chip.hasAttribute("data-nv-encore-label")) picks.encore = picks.encore === option ? null : option;
          if (!isAgain && picks.encore === picks[category]) picks.encore = null;
          picks[category] = option;
          applyPicks();
        });
      });

      /* Simple or Advanced: one toggle, pressed for Advanced. */

      function showView(name) {
        view = name;
        $("mode").setAttribute("aria-pressed", String(name === "advanced"));
        $("simple").hidden = name !== "simple";
        $("advanced").hidden = name !== "advanced";
        if (name === "advanced") syncAdvanced(); else dressBox(simple);
      }

      $("mode").addEventListener("click", function () { showView(view === "simple" ? "advanced" : "simple"); });

      /* Advanced */

      function showValue(slider, key, value) {
        var text = formatValue(value, slider.getAttribute("data-nv-unit"));
        $("out-" + key).textContent = text;
        slider.setAttribute("aria-valuetext", text);
      }

      function syncAdvanced() {
        sliders.forEach(function (slider) {
          var key = slider.getAttribute("data-nv-key");
          var value = slider.getAttribute("data-nv-target") === "voice" ? advanced.voice[key] : advanced.tuning[key];
          slider.value = value;
          showValue(slider, key, Number(value));
        });
        options.forEach(function (option) {
          var isOn = JSON.stringify(advanced.flags[option.getAttribute("data-nv-toggle")]) === option.getAttribute("data-nv-value");
          option.setAttribute("aria-pressed", String(isOn));
        });
        $("name").value = advanced.voice.label;
        dressBox(advanced);
        drawSpectrum();
      }

      // The tube's response for the chosen vowel, with the buzz's harmonics
      // as stems: what the tube does to them is the vowel you hear.
      function drawSpectrum() {
        // Drawn at the canvas's on-screen size so the labels stay readable on a phone.
        var scale = window.devicePixelRatio || 1;
        var width = spectrum.clientWidth;
        var height = spectrum.clientHeight;
        if (!width) return;
        spectrum.width = Math.round(width * scale);
        spectrum.height = Math.round(height * scale);
        paint.setTransform(scale, 0, 0, scale, 0, 0);
        var maxHz = 5000;
        var rate = 48000;
        var voice = advanced.voice;
        var bands = bandsFor(vowel, voice, advanced.tuning);
        var points = [];
        var peak = 0;
        for (var x = 0; x <= width; x += 2) {
          var level = bandResponse(bands, Math.max(20, x / width * maxHz), rate);
          points.push(level);
          peak = Math.max(peak, level);
        }
        paint.clearRect(0, 0, width, height);
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
        paint.strokeStyle = rgbVar(root, "--c-accent");
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
        isAdvancedOwn = parts[0] !== "simple";
        if (!isAdvancedOwn) {
          advanced = copySettings(simple);
        } else {
          var source = parts[0] === "saved" ? saved[Number(parts[1])] : voices[Number(parts[1])];
          if (!source) return;
          // Cast entries are voice only; they keep the Simple pick's way of reading text.
          advanced = {
            voice: Object.assign({}, source),
            tuning: Object.assign({}, tuningDefaults, source.tuning || {}),
            flags: Object.assign({}, simple.flags, source.flags || {})
          };
        }
        syncAdvanced();
      }

      function touchAdvanced() {
        isAdvancedOwn = true;
        $("yaml").hidden = true;
      }

      sliders.forEach(function (slider) {
        slider.addEventListener("input", function () {
          var key = slider.getAttribute("data-nv-key");
          var value = Number(slider.value);
          touchAdvanced();
          if (slider.getAttribute("data-nv-target") === "voice") advanced.voice[key] = value; else advanced.tuning[key] = value;
          showValue(slider, key, value);
          drawSpectrum();
        });
      });
      options.forEach(function (option) {
        option.addEventListener("click", function () {
          touchAdvanced();
          advanced.flags[option.getAttribute("data-nv-toggle")] = JSON.parse(option.getAttribute("data-nv-value"));
          syncAdvanced();
        });
      });
      vowelButtons.forEach(function (button) {
        button.addEventListener("click", function () {
          vowel = button.getAttribute("data-nv-vowel");
          selectPressed(vowelButtons, button);
          drawSpectrum();
        });
      });

      $("preset").addEventListener("change", function () { loadPreset($("preset").value); });
      $("name").addEventListener("input", function () {
        touchAdvanced();
        advanced.voice.label = $("name").value.trim() || "Unnamed";
        player.speaker.textContent = advanced.voice.label;
      });
      $("save").addEventListener("click", function () {
        var entry = Object.assign({}, advanced.voice, { tuning: Object.assign({}, advanced.tuning), flags: Object.assign({}, advanced.flags) });
        var existing = saved.findIndex(function (other) { return other.label === entry.label; });
        if (existing >= 0) saved[existing] = entry; else saved.push(entry);
        var isStored = storeSaved(saved);
        renderSaved();
        isAdvancedOwn = true;
        $("preset").value = "saved:" + (existing >= 0 ? existing : saved.length - 1);
        player.rate.textContent = isStored ? "Saved “" + entry.label + "” in this browser." : "Couldn't save here (private window?). Copy as data instead.";
      });
      $("copy").addEventListener("click", function () {
        var yaml = voiceAsYaml(advanced.voice);
        var out = $("yaml");
        out.textContent = yaml;
        out.hidden = false;
        var done = function () { player.rate.textContent = "Copied. Paste it into data/npc-voices/voices.yaml."; };
        var showSelect = function () { player.rate.textContent = "Select the text below to copy it."; };
        if (!navigator.clipboard) { showSelect(); return; }
        navigator.clipboard.writeText(yaml).then(done, showSelect);
      });
      $("reset").addEventListener("click", function () {
        $("preset").value = "simple";
        $("yaml").hidden = true;
        loadPreset("simple");
      });

      $("text").addEventListener("keydown", function (event) {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        playLine();
      });
      window.addEventListener("resize", function () { if (view === "advanced") drawSpectrum(); });

      applyPicks();
      renderSaved();
      enable(chips.concat(sliders, options, vowelButtons, [$("preset"), $("name"), $("text"), $("save"), $("copy"), $("reset")]));
      $("mode").hidden = false;
      // Start the audio on the first touch, so the output is already awake by
      // the time a click lands; a cold start can take a moment on some devices.
      root.addEventListener("pointerdown", wakeAudio, { once: true });
    }
  };
})();
