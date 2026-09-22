import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../src/core/engine.js';
import { createSoundCues } from '../src/core/sounds.js';

const cfg = (inhale, holdIn, exhale, holdOut, sessionSec) => ({ inhale, holdIn, exhale, holdOut, sessionSec });
const fmt = (t, c) => `${t}:${c.cmd}${c.sound ? ':' + c.sound : ''}`;

// Прогоняет сессию частыми кадрами и собирает команды «время:команда:звук».
function commands(config, options, stepMs = 10) {
  const engine = createEngine(config);
  const sounds = createSoundCues(options);
  engine.start(0);
  const out = [];
  for (let t = 0; ; t += stepMs) {
    const result = engine.tick(t);
    for (const c of sounds.frame(result)) out.push({ t, ...c });
    if (result.state.done) break;
  }
  return out;
}

test('звук выключен по умолчанию', () => {
  assert.equal(commands(cfg(4, 7, 8, 0, 19)).length, 0);
  assert.equal(commands(cfg(4, 7, 8, 0, 19), { enabled: false }).length, 0);
});

test('4-7-8: вдох на всю фазу, тик на каждой секунде задержки, выдох, финал', () => {
  const list = commands(cfg(4, 7, 8, 0, 19), { enabled: true });
  assert.deepEqual(list.map((c) => fmt(c.t, c)), [
    '0:play:inhale',
    '4000:stop',
    '4000:play:tick',
    '5000:play:tick',
    '6000:play:tick',
    '7000:play:tick',
    '8000:play:tick',
    '9000:play:tick',
    '10000:play:tick',
    '11000:stop',
    '11000:play:exhale',
    '19000:stop',
    '19000:play:end'
  ]);
  const inhale = list.find((c) => c.sound === 'inhale');
  assert.equal(inhale.durationMs, 4000);
  assert.equal(inhale.offsetMs, 0);
  assert.equal(list.find((c) => c.sound === 'exhale').durationMs, 8000);
});

test('квадрат: тикает и нижняя задержка', () => {
  const ticks = commands(cfg(4, 4, 4, 4, 16), { enabled: true }).filter((c) => c.sound === 'tick');
  assert.deepEqual(ticks.map((c) => c.t), [4000, 5000, 6000, 7000, 12000, 13000, 14000, 15000]);
});

test('пауза обрывает звук, после возобновления цикл звучит заново со вдоха', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 60));
  const sounds = createSoundCues({ enabled: true });
  engine.start(0);
  sounds.frame(engine.tick(0));
  sounds.frame(engine.tick(1500));

  engine.pause(1500);
  assert.deepEqual(sounds.frame(engine.tick(1500)), [{ cmd: 'stop' }]);
  assert.deepEqual(sounds.frame(engine.tick(1500)), []);

  engine.resume(9000);
  assert.deepEqual(sounds.frame(engine.tick(9000)), [{ cmd: 'play', sound: 'inhale', durationMs: 4000, offsetMs: 0 }]);
});

test('после подвисания звучит фаза, в которой оказались, и не больше одного тика', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 60));
  const sounds = createSoundCues({ enabled: true });
  engine.start(0);
  sounds.frame(engine.tick(0));
  assert.deepEqual(sounds.frame(engine.tick(5500)), [{ cmd: 'stop' }, { cmd: 'play', sound: 'tick' }]);
  assert.deepEqual(sounds.frame(engine.tick(9000)), [{ cmd: 'stop' }, { cmd: 'play', sound: 'exhale', durationMs: 4000, offsetMs: 1000 }]);
});
