import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/core/session.js';
import { PRESETS, DEFAULT_SESSION_SEC, toConfig } from '../src/core/presets.js';
import { validateConfig } from '../src/core/engine.js';

const cfg = (inhale, holdIn, exhale, holdOut, sessionSec) => ({ inhale, holdIn, exhale, holdOut, sessionSec });

function fakePlatform() {
  const p = {
    t: 0,
    loop: null,
    vibrations: [],
    screen: [],
    now: () => p.t,
    vibrate: (mode) => p.vibrations.push(mode),
    keepScreenOn: (on) => p.screen.push(on),
    startLoop: (fn) => {
      p.loop = fn;
      return () => {
        p.loop = null;
      };
    }
  };
  return p;
}

function advance(p, untilT) {
  while (p.loop && p.t < untilT) {
    p.t += 40;
    p.loop();
  }
}

test('сессия держит экран, вибрирует по рисунку, в конце отпускает экран и останавливает кадры', () => {
  const p = fakePlatform();
  const frames = [];
  const session = createSession(cfg(2, 2, 2, 2, 8), p, { inhalePulseHz: 2, onFrame: (s) => frames.push(s) });
  session.start();
  advance(p, Infinity);

  assert.equal(p.t, 8000);
  assert.equal(p.loop, null);
  assert.deepEqual(p.screen, [true, false]);
  assert.equal(p.vibrations.filter((m) => m === 'short').length, 4 + 2 + 2); // вдох 2 с × 2 Гц, две задержки по 2 тика
  assert.equal(p.vibrations.at(-1), 'long');
  assert.equal(frames.at(-1).done, true);
});

test('пауза останавливает кадры, возобновление продолжает время с того же места', () => {
  const p = fakePlatform();
  const session = createSession(cfg(4, 4, 4, 4, 60), p);
  session.start();
  advance(p, 1000);
  session.pause();
  assert.equal(p.loop, null);
  assert.equal(session.state().paused, true);

  p.t += 5000;
  session.resume();
  assert.ok(p.loop);
  assert.equal(session.state().elapsed, 1000);
  assert.equal(session.state().phaseElapsed, 0);
});

test('stop отпускает экран', () => {
  const p = fakePlatform();
  const session = createSession(cfg(4, 4, 4, 4, 60), p);
  session.start();
  session.stop();
  assert.equal(p.loop, null);
  assert.deepEqual(p.screen, [true, false]);
});

test('со звуком: вдох, тики задержек, выдох и финал уходят в платформу', () => {
  const p = fakePlatform();
  p.sounds = [];
  p.playSound = (name) => p.sounds.push(name);
  p.stopSound = () => p.sounds.push('stop');
  const session = createSession(cfg(2, 2, 2, 2, 8), p, { sound: true, vibration: false });
  session.start();
  advance(p, Infinity);

  assert.deepEqual(p.vibrations, []);
  assert.deepEqual(p.sounds.filter((s) => s !== 'stop'), ['inhale', 'tick', 'tick', 'exhale', 'tick', 'tick', 'end']);
  assert.equal(p.sounds.at(-1), 'stop'); // остановка сессии обрывает звук фазы, финал не трогает
});

test('звук по умолчанию выключен, а платформа без звука не ломает сессию', () => {
  const quiet = fakePlatform();
  quiet.sounds = [];
  quiet.playSound = (name) => quiet.sounds.push(name);
  quiet.stopSound = () => {};
  createSession(cfg(2, 2, 2, 2, 8), quiet).start();
  advance(quiet, Infinity);
  assert.deepEqual(quiet.sounds, []);

  const mute = fakePlatform(); // нет playSound / stopSound
  assert.doesNotThrow(() => {
    createSession(cfg(2, 2, 2, 2, 8), mute, { sound: true }).start();
    advance(mute, Infinity);
  });
});

test('все пресеты — корректные конфигурации', () => {
  for (const preset of PRESETS) assert.equal(validateConfig(toConfig(preset, DEFAULT_SESSION_SEC)), null, preset.id);
});
