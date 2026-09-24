// Адаптер платформы для браузерного прототипа.
// Вибрация уходит в onVibrate (индикатор в отладочной панели) и в navigator.vibrate, если он есть;
// удержание экрана — no-op. Длительности импульсов повторяют режимы short / long @system.vibrator.
// Звук синтезируется Web Audio: вдох и выдох — «шум дыхания» через полосовой фильтр
// (частота растёт на вдохе и падает на выдохе), тик — короткий щелчок, финал — два мягких тона.

export function createWebPlatform(options) {
  var opts = options || {};
  var audio = null;

  function ensureAudio() {
    if (audio) return audio;
    var AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioCtx) return null;
    var ctx = new AudioCtx();
    var master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    audio = { ctx: ctx, master: master, breath: null, noise: null };
    return audio;
  }

  function noiseBuffer(a) {
    if (!a.noise) {
      var length = a.ctx.sampleRate * 2;
      var buffer = a.ctx.createBuffer(1, length, a.ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      a.noise = buffer;
    }
    return a.noise;
  }

  function stopBreath(a) {
    if (!a.breath) return;
    var b = a.breath;
    a.breath = null;
    var now = a.ctx.currentTime;
    b.gain.gain.cancelScheduledValues(now);
    b.gain.gain.setValueAtTime(b.gain.gain.value, now);
    b.gain.gain.linearRampToValueAtTime(0, now + 0.08);
    b.source.stop(now + 0.1);
  }

  function playBreath(a, name, durationMs, offsetMs) {
    stopBreath(a);
    var ctx = a.ctx;
    var now = ctx.currentTime;
    var total = durationMs / 1000;
    var offset = Math.min(offsetMs || 0, durationMs) / 1000;
    var left = total - offset;
    if (left <= 0.05) return;

    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer(a);
    source.loop = true;
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    var gain = ctx.createGain();

    var from = name === 'inhale' ? 350 : 1300;
    var to = name === 'inhale' ? 1300 : 300;
    filter.frequency.setValueAtTime(from + (to - from) * (offset / total), now);
    filter.frequency.exponentialRampToValueAtTime(to, now + left);

    var peak = 0.5;
    var attack = Math.min(0.4, left / 3);
    var release = Math.min(0.6, left / 3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.setValueAtTime(peak, now + left - release);
    gain.gain.linearRampToValueAtTime(0, now + left);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(a.master);
    source.start(now);
    source.stop(now + left + 0.05);
    var breath = { source: source, gain: gain };
    source.onended = function () {
      if (a.breath === breath) a.breath = null;
    };
    a.breath = breath;
  }

  function playTick(a) {
    var ctx = a.ctx;
    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 2200;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(a.master);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  function playEnd(a) {
    var ctx = a.ctx;
    var tones = [523.25, 783.99];
    for (var i = 0; i < tones.length; i++) {
      var at = ctx.currentTime + i * 0.18;
      var osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = tones[i];
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.3, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 1.6);
      osc.connect(gain);
      gain.connect(a.master);
      osc.start(at);
      osc.stop(at + 1.7);
    }
  }

  return {
    hasSound: true,
    now:
      opts.now ||
      function () {
        return Date.now();
      },
    vibrate: function (mode) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (mode === 'long') navigator.vibrate(1000);
        else if (mode === 'double') navigator.vibrate([35, 90, 35]);
        else navigator.vibrate(35);
      }
      if (opts.onVibrate) opts.onVibrate(mode);
    },
    playSound: function (name, params) {
      var a = ensureAudio();
      if (!a) return;
      if (a.ctx.state === 'suspended') a.ctx.resume();
      if (name === 'inhale' || name === 'exhale') playBreath(a, name, params.durationMs, params.offsetMs);
      else if (name === 'tick') playTick(a);
      else if (name === 'end') playEnd(a);
      if (opts.onSound) opts.onSound(name);
    },
    stopSound: function () {
      if (audio) stopBreath(audio);
    },
    keepScreenOn: function () {},
    // Локаль системы вида 'ru-RU'; opts.systemLocale позволяет подменить её для отладки.
    systemLocale:
      opts.systemLocale ||
      function () {
        return (typeof navigator !== 'undefined' && navigator.language) || '';
      },
    startLoop: function (fn, fps) {
      var id = setInterval(fn, Math.round(1000 / fps));
      return function () {
        clearInterval(id);
      };
    },
    load: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    save: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // хранилище недоступно — настройки просто не переживут перезагрузку
      }
    }
  };
}
