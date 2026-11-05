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

  // Recorded blips (flags.blip.sample, picker.yaml), fetched and decoded once
  // per URL. If one can't load, the blip is synthesized as before.
  var samples = {};
  function loadSample(url) {
    if (samples[url]) return samples[url].ready;
    var entry = { data: null, rate: 0, done: false };
    var sink = getAudio();
    entry.ready = !sink || !window.fetch ? Promise.resolve() : fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        return response.arrayBuffer();
      })
      .then(function (bytes) {
        // The callback form: older Safari's decodeAudioData returns no promise.
        return new Promise(function (resolve, reject) { sink.ctx.decodeAudioData(bytes, resolve, reject); });
      })
      .then(function (decoded) {
        entry.data = decoded.getChannelData(0);
        entry.rate = decoded.sampleRate;
      })
      .catch(function () {})
      .then(function () { entry.done = true; });
    samples[url] = entry;
    return entry.ready;
  }

  function sampleFor(flags) {
    var url = flags.blip && flags.blip.sample;
    return url && samples[url] && samples[url].data ? samples[url] : null;
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
    // A consonant (All letters) gets the neutral "uh".
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

  // flags.letters (picker.yaml's Letter inclusion): which letters make a
  // sound. "select" is a vowel group's first letter, "vowels" every vowel,
  // "all" every letter. Past "select" the sounds are a letter long, so a run
  // of them can't pile up.
  function soundsAt(chars, i, flags) {
    if (flags.letters === "all") return isLetter(chars[i]);
    if (flags.letters === "vowels") return isVowelAt(chars, i);
    return startsVowelGroup(chars, i);
  }

  function isLetterLong(flags) { return flags.letters === "vowels" || flags.letters === "all"; }

  // Sounding every letter, a consonant letter is its consonant on a short "uh"
  // (the second letter of a digraph plays the digraph); a vowel stands alone.
  // Otherwise a vowel opens on the consonant before it, if any.
  function onsetFor(chars, i, flags) {
    if (flags.letters !== "all") return consonantBefore(chars, i);
    if (isVowelAt(chars, i)) return null;
    var pair = ((chars[i - 1] || "") + chars[i]).toLowerCase();
    return DIGRAPHS[pair] || consonantOfLetter(chars, i);
  }

  // How long a consonant runs. Before a vowel it runs ahead of the vowel's
  // letter; with letter-long sounds it has to fit in a letter's time.
  function consonantMs(onset, flags, tuning) {
    var ms = tuning.consonantMs * KIND_LENGTH[CONSONANTS[onset].kind];
    return isLetterLong(flags) ? Math.min(ms, tuning.letterMs * 1.5 * 0.45) : ms;
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
    sound.leadMs = sound.onset && flags.letters !== "all" ? consonantMs(sound.onset, flags, tuning) : 0;
    return sound;
  }

  function buildPlan(text, flags, tuning) {
    var chars = Array.from(text);
    var sounds = [];
    var steps = chars.map(function (ch, i) {
      var step = { ch: ch, waitMs: pauseAfter(ch, tuning), sound: null };
      if (!soundsAt(chars, i, flags)) return step;
      step.sound = makeSound(chars, i, flags, tuning);
      sounds.push(step.sound);
      return step;
    });
    if (flags.tune) applyTune(chars, sounds, tuning);
    // Talking (the Delay Lama encore) keeps the punctuation tune instead.
    if (flags.sing && !flags.talk) singMelody(chars, sounds);
    return { steps: steps, sounds: sounds };
  }

  // flags.sing (picker.yaml's Delay Lama): the syllables become one melody on
  // a minor pentatonic scale, walking a step or two at a time and coming home
  // to the root at the end of each phrase. The scale and the walk are by ear.
  var CHANT_SCALE = [-5, -2, 0, 3, 5, 7, 10];
  var CHANT_HOME = 2;
  var CHANT_STEPS = [-2, -1, -1, 0, 1, 1, 2];
  function singMelody(chars, sounds) {
    var degree = CHANT_HOME;
    phrasesOf(chars).forEach(function (phrase) {
      var inPhrase = sounds.filter(function (s) { return s.index >= phrase.start && s.index <= phrase.end; });
      inPhrase.forEach(function (sound, k) {
        var step = CHANT_STEPS[Math.floor(Math.random() * CHANT_STEPS.length)];
        degree = k === inPhrase.length - 1 ? CHANT_HOME : Math.max(0, Math.min(CHANT_SCALE.length - 1, degree + step));
        sound.semis += CHANT_SCALE[degree];
      });
    });
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
    // Letter-long sounds must be short enough not to pile up; on every
    // letter the consonant is inside the sound, otherwise it runs ahead.
    var vowelMs = isLetterLong(flags) ? tuning.letterMs * 1.5 : tuning.soundMs;
    var leadMs = sound.onset ? consonantMs(sound.onset, flags, tuning) : 0;
    var totalMs = flags.letters === "all" ? vowelMs : vowelMs + leadMs;
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

  // A recorded blip, played faster or slower for the letter's pitch: its own
  // pitch is blip.sampleHz, so the voice's pitchHz and the tune move it.
  function renderSampleBlip(ctx, voice, sound, blip, sample) {
    var wobble = 1 + (Math.random() * 2 - 1) * blip.wobble;
    var step = voice.pitchHz / blip.sampleHz * wobble * Math.pow(2, sound.semis / 12) * sample.rate / ctx.sampleRate;
    var length = Math.max(1, Math.floor((sample.data.length - 1) / step));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var out = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
      var at = i * step;
      var k = Math.floor(at);
      out[i] = sample.data[k] + (sample.data[k + 1] - sample.data[k]) * (at - k);
    }
    normalize(out, PEAK * 0.6);
    return buffer;
  }

  function renderBeep(ctx, voice, sound, flags, tuning) {
    var rate = ctx.sampleRate;
    var blip = flags.blip || PLAIN_BLIP;
    var sample = sampleFor(flags);
    if (sample) return renderSampleBlip(ctx, voice, sound, blip, sample);
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

  /* ---- The singing monk (flags.sing) ------------------------------------ */

  // Ported from MonkSynth's voice engine (github.com/JonET/monksynth, MIT,
  // dsp/voice.c), a free remake of the 2002 Delay Lama plug-in. It's FOF
  // synthesis, which MonkSynth credits to Xavier Rodet at IRCAM: the voice is
  // a run of 20 ms grains, each three decaying sine waves at the vowel's
  // formants plus a little breath, one grain started per pitch period and
  // overlapped. The constants are MonkSynth's; turning text into notes is ours.
  // Its MIT notice ships beside this file: monksynth-license.txt.
  var MONK = {
    grainS: 0.02,
    // Formant centres (Hz) at five points on MonkSynth's vowel axis. Its
    // comment calls them a, e, i, o, u; the values run oo, oh, ah, eh, ee.
    formants: [[280, 450, 800, 350, 270], [600, 800, 1150, 2000, 2140], [2240, 2830, 2900, 2800, 2950]],
    bandwidths: [32.5, 47.5, 62.5],
    breathPeriodsS: [0.000202, 0.000263],
    // Pitch and vowel walk to each new target in ten 10 ms steps, the ramp
    // MonkSynth says the original used.
    tickS: 0.01,
    rampTicks: 10,
    vibratoSemis: 0.2,
    jitterEveryS: 4586 / 44100,
    attackS: 0.03,
    releaseS: 0.25,
    lastNoteS: 0.7
  };
  var MONK_VOWEL = { oo: 0, oh: 0.25, uh: 0.4, ah: 0.5, eh: 0.75, ee: 1 };
  // Each syllable starts from "oo" and opens into its own vowel, the
  // "wooo-aaah" people know the plug-in by. This is how long the "oo" leads.
  var MONK_OPEN_S = 0.09;

  // Catmull-Rom through the five points with the ends repeated, as MonkSynth
  // builds its table.
  function monkFormant(f, vowel) {
    var points = MONK.formants[f];
    var padded = [points[0]].concat(points, [points[4]]);
    var x = Math.max(0, Math.min(1, vowel)) * 4;
    var seg = Math.min(3, Math.floor(x));
    var t = x - seg;
    var p0 = padded[seg], p1 = padded[seg + 1], p2 = padded[seg + 2], p3 = padded[seg + 3];
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
  }

  // The grain's window, each formant's decay and the breath, once per rate.
  function monkShapes(rate) {
    var n = Math.round(MONK.grainS * rate);
    var attack = Math.floor(rate * 0.0018);
    var releaseAt = Math.floor(rate * 0.013);
    var releaseLen = Math.floor(rate * 0.007);
    var window = new Float32Array(n);
    var breath = new Float32Array(n);
    var decays = MONK.bandwidths.map(function () { return new Float32Array(n); });
    for (var i = 0; i < n; i++) {
      // The release starts partway through its cosine, so a grain never quite
      // closes: MonkSynth keeps that "open" tail on purpose.
      window[i] = i < attack ? 0.5 - 0.5 * Math.cos(Math.PI * i / attack) : i >= releaseAt ? 0.5 - 0.5 * Math.cos(Math.PI * (releaseLen + i) / releaseLen) : 1;
      breath[i] = Math.sin(2 * Math.PI * i / (rate * MONK.breathPeriodsS[0])) * Math.exp(-150 * Math.PI * i / rate) +
        Math.sin(2 * Math.PI * i / (rate * MONK.breathPeriodsS[1])) * Math.exp(-175 * Math.PI * i / rate);
      for (var f = 0; f < decays.length; f++) decays[f][i] = Math.exp(-Math.PI * MONK.bandwidths[f] * i / rate);
    }
    return { n: n, window: window, breath: breath, decays: decays };
  }

  function addMonkGrain(out, at, shapes, vowel, scale, breathLevel, gain, rate) {
    var hz = MONK.formants.map(function (points, f) { return monkFormant(f, vowel) * scale; });
    for (var i = 0; i < shapes.n; i++) {
      var sample = breathLevel * shapes.breath[i];
      for (var f = 0; f < hz.length; f++) sample += Math.sin(2 * Math.PI * hz[f] * i / rate) * shapes.decays[f][i];
      out[at + i] += gain * sample * shapes.window[i];
    }
  }

  // Pitch is quantized to 32 steps a semitone before it sets the grain
  // spacing, a stepped quality MonkSynth keeps on purpose.
  function monkPeriod(note, rate) {
    var index = Math.floor((Math.max(0, Math.min(150, note)) - 12) * 32);
    return Math.max(1, Math.floor(rate / (Math.pow(2, index / 384) * 8.175799)));
  }

  // Low notes come out quieter, with more grains overlapping, so MonkSynth
  // lifts them.
  function monkLoudness(note) { return Math.max(0.1, Math.min(3, (note - 12) * (-1 / 72) + 2)); }

  // flags.talk, the Delay Lama tile's encore: the monk says the line. The
  // plug-in has a pitch, a vowel slider (oo, oh, ah, eh, ee) and nothing
  // else, so people make it talk by drawing the slider through each word:
  // two-part vowels slide ("my" ah to ee, "how" ah to oo), w, y, r and l
  // are just a vowel to start from, and a new note's dip in volume passes
  // for a consonant. Same here: a stop (p, t, k…) is a short silence, m and
  // n a quiet hum, a hiss (s, f…) a near silence, since grains of a vowel
  // can't hiss. The slides are quicker than singing's, and the pitch follows
  // the punctuation tune. The letter rules are by ear.
  var TALK = {
    rampTicks: 3,
    dipS: 0.035,
    glides: { w: "oo", y: "ee", r: "oh", l: "oh" },
    hums: "mn",
    stops: "pbtdkgcjqx",
    humGain: 0.3,
    hissGain: 0.12,
    diphthongs: { ai: ["eh", "ee"], ay: ["eh", "ee"], ei: ["eh", "ee"], ey: ["eh", "ee"], ou: ["ah", "oo"], ow: ["ah", "oo"], oi: ["oh", "ee"], oy: ["oh", "ee"], oa: ["oh", "oo"], oe: ["oh", "oo"], ew: ["ee", "oo"], ue: ["ee", "oo"] }
  };

  // A vowel group's start and end on the slider.
  function talkVowel(chars, i) {
    var group = "";
    for (var k = i; isVowelAt(chars, k); k++) group += chars[k].toLowerCase();
    var pair = TALK.diphthongs[group.slice(0, 2)];
    if (pair) return pair;
    var ch = group.charAt(0);
    var after = i + group.length;
    var isWordEnd = !isLetter(chars[after]);
    // A silent e after one consonant makes a long vowel: "like", "make", "home".
    var isMagicE = group.length === 1 && isLetter(chars[after]) && (chars[after + 1] || "").toLowerCase() === "e" && !isLetter(chars[after + 2]);
    if ((ch === "i" || ch === "y") && (isWordEnd || isMagicE)) return ["ah", "ee"];
    if (ch === "a" && isMagicE) return ["eh", "ee"];
    if (ch === "o" && (isWordEnd || isMagicE)) return ["oh", "oo"];
    var vowel = vowelFromLetters(chars, i);
    return [vowel, vowel];
  }

  // What the letter before a vowel group does: a vowel to start from, or a
  // dip in volume before it.
  function talkOnset(chars, i) {
    if (!isLetter(chars[i - 1]) || isVowelAt(chars, i - 1)) return {};
    var ch = chars[i - 1].toLowerCase();
    if (ch === "h" && (chars[i - 2] || "").toLowerCase() === "w") return { vowel: "oo" };
    if (TALK.glides[ch]) return { vowel: TALK.glides[ch] };
    if (TALK.hums.indexOf(ch) >= 0) return { gain: TALK.humGain, vowel: "oo" };
    if (TALK.stops.indexOf(ch) >= 0) return { gain: 0 };
    return { gain: TALK.hissGain };
  }

  function talkTargets(steps, homeNote) {
    var chars = steps.map(function (step) { return step.ch; });
    var voiced = steps.filter(function (step) { return step.sound; });
    var ramp = TALK.rampTicks;
    var targets = [];
    voiced.forEach(function (step, k) {
      var i = step.sound.index;
      var atS = step.atMs / 1000;
      var nextIndex = voiced[k + 1] ? voiced[k + 1].sound.index : chars.length;
      var gapS = voiced[k + 1] ? voiced[k + 1].atMs / 1000 - atS : MONK.lastNoteS;
      var shape = talkVowel(chars, i);
      var onset = talkOnset(chars, i);
      if (onset.gain !== undefined && k > 0) targets.push({ atS: atS - TALK.dipS, gain: onset.gain, vowel: onset.vowel && MONK_VOWEL[onset.vowel], ramp: ramp });
      targets.push({ atS: atS, note: homeNote + step.sound.semis, vowel: MONK_VOWEL[onset.vowel || shape[0]], gain: 1, ramp: ramp });
      if (onset.vowel) targets.push({ atS: atS + Math.min(0.05, gapS / 4), vowel: MONK_VOWEL[shape[0]], ramp: ramp });
      if (shape[1] !== shape[0]) targets.push({ atS: atS + gapS * 0.5, vowel: MONK_VOWEL[shape[1]], ramp: ramp * 2 });
      // A comma or full stop before the next syllable is a breath.
      var isPause = chars.slice(i, nextIndex).some(function (ch) { return PAUSE_KINDS[ch]; });
      if (isPause) targets.push({ atS: atS + Math.min(0.22, gapS * 0.6), gain: 0, ramp: ramp * 2 });
    });
    return targets.sort(function (a, b) { return a.atS - b.atS; });
  }

  // Each syllable is two targets: its note with the mouth at "oo", then its
  // own vowel a moment later (sooner if the next syllable is close).
  function chantTargets(voice, steps, flags) {
    var voiced = steps.filter(function (step) { return step.sound; });
    // MonkSynth's period table sounds an octave below the note it's given
    // (monkPeriod's "- 12"), so ask for one octave up to hear pitchHz.
    var homeNote = 69 + 12 * Math.log2(voice.pitchHz / 440) + 12;
    if (flags.talk) return talkTargets(steps, homeNote);
    var targets = [];
    voiced.forEach(function (step, k) {
      var atS = step.atMs / 1000;
      var gapS = voiced[k + 1] ? voiced[k + 1].atMs / 1000 - atS : MONK.lastNoteS;
      targets.push({ atS: atS, note: homeNote + step.sound.semis, vowel: MONK_VOWEL.oo });
      targets.push({ atS: atS + Math.min(MONK_OPEN_S, gapS / 2), vowel: MONK_VOWEL[step.sound.vowel] });
    });
    return targets;
  }

  // The whole line as one voice, starting at the first syllable's letter.
  function renderChant(ctx, voice, steps, flags) {
    var rate = ctx.sampleRate;
    var shapes = monkShapes(rate);
    var targets = chantTargets(voice, steps, flags);
    var startS = targets[0].atS;
    var stopS = targets[targets.length - 1].atS + MONK.lastNoteS;
    var singing = Math.ceil((stopS + MONK.releaseS) * rate);
    var buffer = ctx.createBuffer(1, singing + shapes.n, rate);
    var out = buffer.getChannelData(0);
    var tick = Math.max(1, Math.round(MONK.tickS * rate));
    var jitterEvery = Math.max(1, Math.round(MONK.jitterEveryS * rate));
    var scale = voice.tube;
    var breathLevel = Math.min(1, voice.breath * 4);
    // gain is talking's dips (a target may leave any of the three alone);
    // a target's own ramp, in ticks, overrides MonkSynth's.
    var now = { note: targets[0].note, vowel: targets[0].vowel, gain: 1 };
    var goal = { note: now.note, vowel: now.vowel, gain: 1 };
    var stepBy = { note: 0, vowel: 0, gain: 0 };
    var ticksLeft = { note: 0, vowel: 0, gain: 0 };
    var keys = ["note", "vowel", "gain"];
    var next = 0;
    var sinceGrain = Infinity;
    var vibratoPhase = 0;
    var vibratoHz = 4;
    for (var i = Math.floor(startS * rate); i < singing; i++) {
      var atS = i / rate;
      for (; next < targets.length && targets[next].atS <= atS; next++) {
        var target = targets[next];
        var ticks = target.ramp || MONK.rampTicks;
        keys.forEach(function (key) {
          if (target[key] === undefined) return;
          goal[key] = target[key];
          stepBy[key] = (goal[key] - now[key]) / ticks;
          ticksLeft[key] = ticks;
        });
      }
      if (i % tick === 0) {
        keys.forEach(function (key) {
          if (!ticksLeft[key]) return;
          ticksLeft[key]--;
          now[key] = ticksLeft[key] ? now[key] + stepBy[key] : goal[key];
        });
      }
      if (i % jitterEvery === 0) vibratoHz = 5 + Math.random() * 2;
      vibratoPhase += vibratoHz / rate;
      var note = now.note + MONK.vibratoSemis * Math.sin(2 * Math.PI * vibratoPhase);
      sinceGrain++;
      if (sinceGrain < monkPeriod(note, rate)) continue;
      sinceGrain = 0;
      addMonkGrain(out, i, shapes, now.vowel, scale, breathLevel, monkLoudness(now.note) * now.gain, rate);
    }
    for (var j = 0; j < out.length; j++) {
      var tS = j / rate;
      out[j] *= Math.min(1, Math.max(0, (tS - startS) / MONK.attackS)) * Math.min(1, Math.max(0, (stopS + MONK.releaseS - tS) / MONK.releaseS));
    }
    normalize(out, PEAK);
    return buffer;
  }

  function renderSound(ctx, voice, sound, flags, tuning, clockS) {
    return flags.tone === "beep" ? renderBeep(ctx, voice, sound, flags, tuning) : renderVoice(ctx, voice, sound, flags, tuning, clockS);
  }

  // flags.echo: the stereo delay from MonkSynth's dsp/delay.c (see the monk
  // section): two lines at different times, one per speaker, each feeding
  // back into itself. Output is the dry voice plus both taps; `mix` scales
  // what goes into the lines, feedback included. Its Rabten preset's values.
  var MONK_DELAY = { leftS: 13653 / 44100, rightS: 17570 / 44100, feedback: 0.5, mix: 0.8 };
  function makeEcho(ctx, destination) {
    var input = ctx.createGain();
    var spread = ctx.createChannelMerger(2);
    input.connect(destination);
    [MONK_DELAY.leftS, MONK_DELAY.rightS].forEach(function (seconds, channel) {
      var line = ctx.createDelay(1);
      var send = ctx.createGain();
      var loop = ctx.createGain();
      line.delayTime.value = seconds;
      send.gain.value = MONK_DELAY.mix;
      loop.gain.value = MONK_DELAY.feedback * MONK_DELAY.mix;
      input.connect(send);
      send.connect(line);
      line.connect(loop);
      loop.connect(line);
      line.connect(spread, 0, channel);
    });
    spread.connect(destination);
    return { out: input, unplug: function () { input.disconnect(); spread.disconnect(); } };
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
    var echo = null;
    var plan = null;
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

    function stopRun(shouldSilence) {
      if (shouldSilence && echo) {
        echo.unplug();
        echo = null;
      }
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

    function finish() {
      spans.forEach(function (span) { span.classList.remove("is-hidden"); });
      drawTune(Infinity);
      showPlaying(false);
    }

    function scheduleClock(voice, flags, tuning, thisRun) {
      var sink = wakeAudio();
      if (!sink) {
        var startedAt = performance.now();
        return function () { return performance.now() - startedAt; };
      }
      var ctx = sink.ctx;
      // The last line's echo rings on after it ends; a new line cuts it off.
      if (echo) echo.unplug();
      echo = flags.echo ? makeEcho(ctx, sink.out) : null;
      var target = echo ? { ctx: ctx, out: echo.out } : sink;
      // A sound with a consonant starts that much before its vowel's letter,
      // so the vowel still lands on the letter.
      var startMs = function (step) { return step.atMs - step.sound.leadMs; };
      // A singer is one continuous voice, so the whole line is one buffer
      // starting with the first letter; everything else is a sound per syllable.
      var buffers = flags.sing && plan.sounds.length ? [renderChant(ctx, voice, plan.steps, flags)] : plan.steps.map(function (step) {
        return step.sound ? renderSound(ctx, voice, step.sound, flags, tuning, startMs(step) / 1000) : null;
      });
      var maxLeadMs = plan.sounds.reduce(function (most, sound) { return Math.max(most, sound.leadMs); }, 0);
      // Read after rendering, which takes a few milliseconds on a long line.
      var startS = ctx.currentTime + LEAD_S + maxLeadMs / 1000;
      buffers.forEach(function (buffer, i) {
        if (buffer) thisRun.nodes.push(startBuffer(target, buffer, startS + (flags.sing ? 0 : startMs(plan.steps[i]) / 1000)));
      });
      // A swelling sound is heard partway up its attack, not at its first sample.
      var onsetMs = flags.tone !== "beep" && flags.shape !== "hit" ? tuning.attackMs / 3 : 0;
      return function () { return (heardTimeS(ctx) - startS) * 1000 - onsetMs; };
    }

    function play(text, voice, flags, tuning) {
      // A recorded blip still loading: play once it's in (or has failed).
      var url = flags.blip && flags.blip.sample;
      if (url && !(samples[url] && samples[url].done)) {
        loadSample(url).then(function () { play(text, voice, flags, tuning); });
        return;
      }
      stopRun(true);
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
      finish();
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

  // `needs` (lab.yaml, picker.yaml): flag values a control only matters
  // under. A list of values means any of them will do.
  function meetsKey(needs, key, flags) {
    return [].concat(needs[key]).some(function (value) { return flags[key] === value; });
  }

  function meetsNeeds(needs, flags) {
    return Object.keys(needs || {}).every(function (key) { return meetsKey(needs, key, flags); });
  }

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
    // A pick greyed out by its row's or its own `needs` adds nothing, so
    // what you hear matches what the chips show (NvLab's showPickNeeds).
    var name = null;
    picker.categories.forEach(function (category) {
      var option = category.options.find(function (candidate) { return candidate.key === picks[category.key]; });
      if (!option || !meetsNeeds(category.needs, flags) || !meetsNeeds(option.needs, flags)) return;
      apply(option);
      if (!option.encore || picks.encore !== option.key) return;
      apply(option.encore);
      name = option.encore.name;
    });
    voice.label = name || (picker.names || {})[picks.age + "-" + picks.voice] || "Stranger";
    return { voice: voice, tuning: tuning, flags: flags };
  }

  /* ---- Advanced view: saved voices -------------------------------------- */

  // Voices saved before Letter inclusion carry an on/off `every` instead.
  function upgradeSaved(entry) {
    var flags = entry.flags || {};
    if (!("every" in flags) || flags.letters) return entry;
    flags.letters = flags.every ? "all" : "select";
    delete flags.every;
    return entry;
  }

  function loadSaved() {
    try { var list = JSON.parse(localStorage.getItem(STORE_KEY)); return Array.isArray(list) ? list.map(upgradeSaved) : []; } catch (error) { return []; }
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
      var pickRows = all("#nv-lab-simple .nv-pick-row");
      var advancedRows = all("#nv-lab-advanced [data-nv-needs]");
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

      // A control only some settings use (`needs` in lab.yaml and picker.yaml,
      // carried as data-nv-needs) greys out while they're off, with a note
      // saying what to switch.

      function switchNote(needs, flags) {
        var unmet = Object.keys(needs).filter(function (key) { return !meetsKey(needs, key, flags); });
        return "needs " + unmet.map(function (key) {
          var want = JSON.stringify([].concat(needs[key])[0]);
          var group = root.querySelector('[data-nv-toggle-group="' + key + '"]');
          var button = options.find(function (option) { return option.getAttribute("data-nv-toggle") === key && option.getAttribute("data-nv-value") === want; });
          return (group ? group.getAttribute("aria-label") : key) + ": " + (button ? button.textContent : want);
        }).join(", ");
      }

      function needsOf(element) {
        var raw = element.getAttribute("data-nv-needs");
        return raw ? JSON.parse(raw) : {};
      }

      // Simple rows: a row with nothing to offer is hidden; otherwise just
      // the chips that do nothing now grey out. Neither gets a note.
      function showPickNeeds(flags) {
        pickRows.forEach(function (row) {
          var isRowOn = meetsNeeds(needsOf(row), flags);
          row.querySelectorAll("[data-nv-pick]").forEach(function (chip) {
            var isOn = isRowOn && meetsNeeds(needsOf(chip), flags);
            chip.disabled = !isOn;
            chip.classList.toggle("is-off", isRowOn && !isOn);
          });
          row.hidden = !isRowOn;
        });
      }

      function showNeeds(rows, flags) {
        rows.forEach(function (row) {
          var needs = JSON.parse(row.getAttribute("data-nv-needs"));
          var isOn = meetsNeeds(needs, flags);
          var note = row.querySelector(".nv-off-note");
          row.classList.toggle("is-off", !isOn);
          row.querySelectorAll("button, input").forEach(function (control) { control.disabled = !isOn; });
          note.hidden = isOn;
          if (!isOn) note.textContent = switchNote(needs, flags);
        });
      }

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
        // Fetch a recorded blip as soon as its voice is picked, not on Play.
        if (simple.flags.blip && simple.flags.blip.sample) loadSample(simple.flags.blip.sample);
        chips.forEach(showChip);
        showPickNeeds(simple.flags);
        if (!isAdvancedOwn) advanced = copySettings(simple);
        if (view === "simple") dressBox(simple);
      }

      // A row with `follows` (picker.yaml) jumps to whichever of its options
      // matches what the rows before it add up to, e.g. Letter inclusion to
      // All letters when Animal Crossing is picked. It can be changed after.
      function followPicks(changed) {
        picker.categories.forEach(function (category) {
          if (category.follows !== changed) return;
          var without = Object.assign({}, picks);
          without[category.key] = null;
          var flags = settingsFromPicks(picker, without, tuningDefaults).flags;
          var match = category.options.find(function (option) {
            return Object.keys(option.flags || {}).every(function (key) { return flags[key] === option.flags[key]; });
          });
          picks[category.key] = (match || category.options[0]).key;
        });
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
          followPicks(category);
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
        showNeeds(advancedRows, advanced.flags);
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
      // After enable, which wakes every control, including the greyed ones.
      showPickNeeds(simple.flags);
      showNeeds(advancedRows, advanced.flags);
      $("mode").hidden = false;
      // Start the audio on the first touch, so the output is already awake by
      // the time a click lands; a cold start can take a moment on some devices.
      root.addEventListener("pointerdown", wakeAudio, { once: true });
    }
  };
})();
