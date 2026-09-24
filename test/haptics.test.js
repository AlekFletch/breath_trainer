import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../src/core/engine.js';
import { createHaptics } from '../src/core/haptics.js';

const cfg = (inhale, holdIn, exhale, holdOut, sessionSec) => ({ inhale, holdIn, exhale, holdOut, sessionSec });

// Прогоняет сессию частыми кадрами и собирает импульсы с фазой, в которой они прозвучали.
function pulses(config, options, stepMs = 10) {
  const engine = createEngine(config);
  const haptics = createHaptics(options);
  engine.start(0);
  const out = [];
  for (let t = 0; ; t += stepMs) {
    const result = engine.tick(t);
    const mode = haptics.frame(result);
    if (mode) out.push({ mode, phase: result.state.phase, t });
    if (result.state.done) break;
  }
  return out;
}

const shortsIn = (list, phase) => list.filter((p) => p.mode === 'short' && p.phase === phase);

test('4-7-8 на 3 Гц: вдох 10 импульсов (последняя секунда молчит), задержка 7 (последняя секунда — двойная), выдох молчит, в конце long', () => {
  const list = pulses(cfg(4, 7, 8, 0, 19), { inhalePulseHz: 3 });
  assert.equal(shortsIn(list, 'inhale').length, 10);
  assert.deepEqual(shortsIn(list, 'holdIn').map((p) => p.t), [4000, 5000, 6000, 7000, 8000, 9000]);
  assert.deepEqual(
    list.filter((p) => p.mode === 'double' && p.phase === 'holdIn').map((p) => p.t),
    [10000]
  );
  assert.equal(shortsIn(list, 'exhale').length, 0);
  assert.deepEqual(list.at(-1), { mode: 'long', phase: 'inhale', t: 19000 });
  assert.equal(list.filter((p) => p.mode === 'long').length, 1);
});

test('квадрат: нижняя задержка тоже тикает посекундно', () => {
  const list = pulses(cfg(4, 4, 4, 4, 16), { inhalePulseHz: 2 });
  assert.equal(shortsIn(list, 'inhale').length, 7);
  assert.deepEqual(shortsIn(list, 'holdOut').map((p) => p.t), [12000, 13000, 14000, 15000]);
});

test('выключенная вибрация молчит всю сессию', () => {
  assert.equal(pulses(cfg(4, 4, 4, 4, 16), { enabled: false }).length, 0);
});

test('после подвисания — один импульс за кадр, а не очередь', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 60));
  const haptics = createHaptics();
  engine.start(0);
  haptics.frame(engine.tick(0));
  // Пересекли разом все 4 тика задержки после вдоха, включая последний — итог схлопывается в двойной импульс.
  assert.equal(haptics.frame(engine.tick(7500)), 'double');
  assert.equal(haptics.frame(engine.tick(7500)), null);
});

test('на паузе вдоха импульсов нет', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 60));
  const haptics = createHaptics({ inhalePulseHz: 3 });
  engine.start(0);
  haptics.frame(engine.tick(0));
  engine.pause(100);
  for (let t = 100; t < 5000; t += 40) assert.equal(haptics.frame(engine.tick(t)), null);
});

test('последняя секунда вдоха молчит: между последним импульсом вдоха и первым импульсом задержки — пауза около секунды', () => {
  const list = pulses(cfg(4, 4, 4, 4, 16), { inhalePulseHz: 3 });
  const inhale = shortsIn(list, 'inhale');
  const firstHold = shortsIn(list, 'holdIn')[0];
  assert.ok(inhale.every((p) => p.t < 4000 - 900));
  assert.equal(firstHold.t, 4000);
  const gap = firstHold.t - inhale.at(-1).t;
  assert.ok(gap >= 900 && gap <= 1100, `пауза ${gap} мс`);
});

test('очень короткий вдох не прерывается', () => {
  assert.ok(shortsIn(pulses(cfg(1, 0, 1, 0, 2), { inhalePulseHz: 3 }), 'inhale').length >= 3);
});
