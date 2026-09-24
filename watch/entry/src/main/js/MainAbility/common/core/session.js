// Копия src/core/session.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Связка движка, вибрации, звука и платформы. Страница только рисует state, приходящий в onFrame.
//
// platform: { now(), vibrate(mode), keepScreenOn(on), startLoop(fn, fps) -> stop,
//             playSound(name, { durationMs, offsetMs }), stopSound() }  — звук необязателен
// options:  { vibration, sound, inhalePulseHz, fps, onFrame(state) }

import { createEngine } from './engine.js';
import { createHaptics } from './haptics.js';
import { createSoundCues } from './sounds.js';

// Часы иногда гасят экран сами по себе спустя несколько минут, будто keepScreenOn — это аренда,
// а не постоянный флаг: чтобы длинная сессия не обрывалась, запрос повторяется, пока сессия идёт.
var KEEP_SCREEN_ON_RENEW_MS = 60 * 1000;

export function createSession(config, platform, options) {
  var opts = options || {};
  var engine = createEngine(config);
  var haptics = createHaptics({ inhalePulseHz: opts.inhalePulseHz, enabled: opts.vibration });
  var canSound = typeof platform.playSound === 'function' && typeof platform.stopSound === 'function';
  var sounds = createSoundCues({ enabled: canSound && opts.sound === true });
  var fps = opts.fps > 0 ? opts.fps : 25;
  var stopLoop = null;
  var last = null;
  var keptScreenOnAt = 0;

  function step() {
    var now = platform.now();
    if (now - keptScreenOnAt >= KEEP_SCREEN_ON_RENEW_MS) {
      keptScreenOnAt = now;
      platform.keepScreenOn(true);
    }
    var result = engine.tick(now);
    last = result.state;

    var pulse = haptics.frame(result);
    if (pulse) platform.vibrate(pulse);

    var commands = sounds.frame(result);
    for (var i = 0; i < commands.length; i++) {
      if (commands[i].cmd === 'stop') platform.stopSound();
      else platform.playSound(commands[i].sound, commands[i]);
    }

    if (opts.onFrame) opts.onFrame(result.state);
    if (result.state.done) halt();
  }

  function runLoop() {
    if (!stopLoop) stopLoop = platform.startLoop(step, fps);
  }

  function haltLoop() {
    if (stopLoop) {
      stopLoop();
      stopLoop = null;
    }
  }

  function halt() {
    haltLoop();
    if (canSound) platform.stopSound();
    platform.keepScreenOn(false);
  }

  return {
    start: function () {
      engine.start(platform.now());
      keptScreenOnAt = platform.now();
      platform.keepScreenOn(true);
      runLoop();
      step();
    },
    // На паузе кадры не крутятся — батарея не тратится; экран остаётся включённым.
    pause: function () {
      if (!last || last.done || last.paused) return;
      engine.pause(platform.now());
      haltLoop();
      step();
    },
    resume: function () {
      if (!last || !last.paused) return;
      engine.resume(platform.now());
      runLoop();
      step();
    },
    stop: halt,
    state: function () {
      return last;
    }
  };
}
