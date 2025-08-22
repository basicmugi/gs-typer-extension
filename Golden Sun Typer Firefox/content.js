// TypeBleeps content script
(() => {
  const state = {
    enabled: true,
    volume: 0.7,
    playInPasswords: false,
    includeContentEditable: true,
    buffers: {},
    ctx: null
  };

  const SPECIAL_SET = new Set(["!", "~", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", "="]);

  function log(...args) {
    // Uncomment to debug:
    // console.log("[TypeBleeps]", ...args);
  }

  function getAudioContext() {
    if (!state.ctx) {
      state.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return state.ctx;
  }

  async function loadBuffer(name, url) {
    const ctx = getAudioContext();
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    state.buffers[name] = buf;
  }

  async function preload() {
    const base = chrome.runtime.getURL("sounds/");
    await Promise.all([
      loadBuffer("bleep", base + "bleep.wav"),
      loadBuffer("special", base + "special.wav"),
      loadBuffer("question", base + "question.wav")
    ]);
    log("Sounds preloaded");
  }

  function randf(min, max) {
    return Math.random() * (max - min) + min;
  }

  function play(name, rate) {
    if (!state.enabled) return;
    const buf = state.buffers[name];
    if (!buf) return;
    const ctx = getAudioContext();
    // iOS/Safari note: FF Desktop only; still safe.
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const gain = ctx.createGain();
    gain.gain.value = state.volume;

    src.playbackRate.value = rate;

    src.connect(gain).connect(ctx.destination);
    // Some sites suspend audio; resume if needed
    if (ctx.state === "suspended") {
      ctx.resume().then(() => src.start());
    } else {
      src.start();
    }
  }

  function playForChar(c) {
    if (c === "backspace") {
      play("bleep", 0.8);
      return;
    }
    if (c === "?") {
      play("question", 1.0);
      return;
    }
    if (SPECIAL_SET.has(c)) {
      play("special", 1.2);
      return;
    }
    // default letter/number/punctuation
    play("bleep", randf(0.95, 1.05));
  }

  function isEditableTarget(t) {
    if (!t) return false;
    // Inputs & textareas
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
      if (t.type === "password" && !state.playInPasswords) return false;
      // Do not play for readonly or disabled fields
      if (t.readOnly || t.disabled) return false;
      return true;
    }
    // contentEditable
    if (state.includeContentEditable) {
      let el = t;
      while (el && el !== document.documentElement) {
        if (el instanceof HTMLElement && el.isContentEditable) return true;
        el = el.parentElement;
      }
    }
    return false;
  }

  function onKeydown(ev) {
    if (!state.enabled) return;
    const t = ev.target;
    if (!isEditableTarget(t)) return;

    // Ignore typical modifier-only presses
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

    const k = ev.key; // already the "printed" character (e.g., "A" or "?")
    if (!k) return;

    if (k === "Backspace") {
      playForChar("backspace");
      return;
    }
    if (k.length === 1) {
      // Single printable char
      // Lowercase for comparison with Godot code, though we only care for sets
      const c = k.toLowerCase();
      // Special handling uses original character (so '?' matches)
      playForChar(k);
      return;
    }
    // Optional: Enter confirmation can be silent per original code
    // else: ignore other navigation keys
  }

  // Load settings
  chrome.storage.local.get(["tb_enabled", "tb_volume", "tb_play_in_passwords", "tb_include_content_editable"], (res) => {
    state.enabled = res.tb_enabled ?? true;
    state.volume = typeof res.tb_volume === "number" ? res.tb_volume : 0.7;
    state.playInPasswords = !!res.tb_play_in_passwords;
    state.includeContentEditable = res.tb_include_content_editable !== false;
  });

  // React to setting changes live
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.tb_enabled) state.enabled = changes.tb_enabled.newValue;
    if (changes.tb_volume) state.volume = changes.tb_volume.newValue;
    if (changes.tb_play_in_passwords) state.playInPasswords = changes.tb_play_in_passwords.newValue;
    if (changes.tb_include_content_editable) state.includeContentEditable = changes.tb_include_content_editable.newValue;
  });

  // Preload sounds once DOM is ready (and on initial load)
  preload().catch(err => log("Preload error", err));

  // Listen at capture phase to catch keys early
  window.addEventListener("keydown", onKeydown, true);
})();
