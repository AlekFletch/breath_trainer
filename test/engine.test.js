import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngine, validateConfig } from '../src/core/engine.js';

const cfg = (inhale, holdIn, exhale, holdOut, sessionSec = 300) => ({ inhale, holdIn, exhale, holdOut, sessionSec });
const T0 = 1_000_000;

// Гоняет сессию кадрами до завершения; step(i) — длина i-го кадра в мс.
function run(config, step = () => 40) {
  const engine = createEngine(config);
  engine.start(T0);
  const events = [];
  let now = T0;
  let state;
  for (let i = 0; ; i++) {
    const result = engine.tick(now);
    events.push(...result.events);
    state = result.state;
    if (state.done) break;
    now += step(i);
  }
  return { events, state };
}

const starts = (events) => events.filter((e) => e.type === 'phaseStart');
const ticks = (events, phase) => events.filter((e) => e.type === 'secondTick' && (!phase || e.phase === phase));

test('validateConfig принимает корректное и отвергает неверное', () => {
  assert.equal(validateConfig(cfg(4, 7, 8, 0)), null);
  assert.match(validateConfig(cfg(0, 0, 0, 0)), /cycle/);
  assert.match(validateConfig(cfg(-1, 0, 4, 0)), /inhale/);
  assert.match(validateConfig(cfg(4, 0, 4, 61)), /holdOut/);
  assert.match(validateConfig(cfg(4, 0, 4, 0, 0)), /sessionSec/);
  assert.throws(() => createEngine(cfg(0, 0, 0, 0)));
});

test('первый тик отдаёт начало вдоха в t = 0, повторный — ничего', () => {
  const engine = createEngine(cfg(4, 7, 8, 0));
  engine.start(T0);
  const { state, events } = engine.tick(T0);
  assert.equal(state.phase, 'inhale');
  assert.deepEqual(events.map((e) => `${e.type}:${e.at}`), ['phaseStart:0', 'secondTick:0']);
  assert.equal(engine.tick(T0).events.length, 0);
});

test('4-7-8: длительности фаз и посекундные тики задержки', () => {
  const { events } = run(cfg(4, 7, 8, 0, 19));
  assert.deepEqual(
    starts(events).map((e) => [e.phase, e.at]),
    [['inhale', 0], ['holdIn', 4000], ['exhale', 11000]]
  );
  const hold = ticks(events, 'holdIn');
  assert.deepEqual(hold.map((e) => e.n), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(hold.map((e) => e.at), [4000, 5000, 6000, 7000, 8000, 9000, 10000]);
  assert.equal(ticks(events, 'inhale').length, 4);
  assert.equal(ticks(events, 'exhale').length, 8);
});

test('состояние внутри фазы', () => {
  const engine = createEngine(cfg(4, 7, 8, 0));
  engine.start(T0);
  const { state } = engine.tick(T0 + 5500);
  assert.equal(state.phase, 'holdIn');
  assert.equal(state.phaseElapsed, 1500);
  assert.equal(state.phaseDuration, 7000);
  assert.equal(state.cycleIndex, 0);
  assert.equal(state.sessionLeft, 294500);
});

test('нулевые фазы пропускаются', () => {
  const { events } = run(cfg(4, 0, 6, 0, 20));
  assert.deepEqual(starts(events).map((e) => e.phase), ['inhale', 'exhale', 'inhale', 'exhale']);
  assert.ok(!events.some((e) => e.phase === 'holdIn' || e.phase === 'holdOut'));
});

test('цикл может начинаться не с вдоха, если вдох нулевой', () => {
  const engine = createEngine(cfg(0, 4, 4, 4));
  engine.start(T0);
  assert.equal(engine.tick(T0).state.phase, 'holdIn');
  assert.equal(engine.tick(T0 + 4000).state.phase, 'exhale');
});

test('сессия 5 минут на 4-7-8 додышивает последний цикл после таймера', () => {
  const { events, state } = run(cfg(4, 7, 8, 0, 300), (i) => 20 + ((i * 37) % 45));
  const ends = events.filter((e) => e.type === 'end');
  assert.equal(ends.length, 1);
  assert.equal(ends[0].at, 16 * 19_000); // 300 с — внутри 16-го цикла, он доводится до конца
  assert.equal(state.elapsed, 304_000);
  assert.equal(state.sessionLeft, 0);
  assert.equal(state.progress01, 1);
  assert.equal(state.cyclesDone, 16);
  assert.equal(starts(events).filter((e) => e.phase === 'inhale').length, 16);
  assert.ok(events.filter((e) => e.type !== 'end').every((e) => e.at < 304_000));
});

test('таймер ровно на границе цикла — конец сразу, без лишнего цикла', () => {
  const { state } = run(cfg(4, 4, 4, 4, 32));
  assert.equal(state.elapsed, 32_000);
  assert.equal(state.cyclesDone, 2);
});

test('после таймера сессия идёт до конца цикла: время по таймеру — 0, прогресс — 1', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 20));
  engine.start(T0);
  const over = engine.tick(T0 + 25_000).state;
  assert.equal(over.done, false);
  assert.equal(over.phase, 'exhale');
  assert.equal(over.sessionLeft, 0);
  assert.equal(over.progress01, 1);
  assert.equal(engine.tick(T0 + 31_999).state.done, false);
  assert.equal(engine.tick(T0 + 32_000).state.done, true);
});

test('нет дрейфа: 10+ минут квадрата с неровными кадрами — тик на каждой целой секунде', () => {
  const { events } = run(cfg(4, 4, 4, 4, 640), (i) => 13 + ((i * 7919) % 90));
  const all = ticks(events);
  assert.equal(all.length, 640);
  all.forEach((e, i) => assert.equal(e.at, i * 1000));
});

test('после подвисания пропущенные события отдаются один раз и по порядку', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 60));
  engine.start(T0);
  engine.tick(T0);
  engine.tick(T0 + 500);
  const { events, state } = engine.tick(T0 + 5200);
  assert.deepEqual(events.map((e) => `${e.type}:${e.phase}:${e.at}`), [
    'secondTick:inhale:1000',
    'secondTick:inhale:2000',
    'secondTick:inhale:3000',
    'phaseStart:holdIn:4000',
    'secondTick:holdIn:4000',
    'secondTick:holdIn:5000'
  ]);
  assert.equal(state.phase, 'holdIn');
  assert.equal(engine.tick(T0 + 5200).events.length, 0);
});

test('пауза замораживает время, возобновление продолжает время, а цикл начинает со вдоха', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 60));
  engine.start(T0);
  engine.tick(T0 + 22_000); // второй цикл, вторая секунда задержки на вдохе
  engine.pause(T0 + 22_000);

  const frozen = engine.tick(T0 + 50_000);
  assert.equal(frozen.state.paused, true);
  assert.equal(frozen.state.elapsed, 22_000);
  assert.equal(frozen.state.phase, 'holdIn');
  assert.equal(frozen.events.length, 0);

  engine.resume(T0 + 52_000); // на паузе 30 с
  const again = engine.tick(T0 + 52_000);
  assert.equal(again.state.paused, false);
  assert.equal(again.state.phase, 'inhale');
  assert.equal(again.state.phaseElapsed, 0);
  assert.equal(again.state.elapsed, 22_000);
  assert.equal(again.state.cyclesDone, 1); // прерванный цикл не засчитан
  assert.deepEqual(again.events.map((e) => `${e.type}:${e.phase}:${e.at}`), ['phaseStart:inhale:22000', 'secondTick:inhale:22000']);
  assert.equal(again.state.cycleIndex, 2); // новый номер: вибрация и звук не путают его с прерванным

  const later = engine.tick(T0 + 57_000);
  assert.equal(later.state.phase, 'holdIn');
  assert.equal(later.state.phaseElapsed, 1000);

  // таймер 60 с истекает в третьем цикле после возобновления: 22 + 3 × 16 = 70 с дыхания
  assert.equal(engine.tick(T0 + 30_000 + 69_999).state.done, false);
  const end = engine.tick(T0 + 30_000 + 70_000);
  assert.equal(end.state.done, true);
  assert.equal(end.state.elapsed, 70_000);
  assert.equal(end.state.cyclesDone, 4);
});

test('пауза в добавочном цикле после таймера: после возобновления — ещё один целый цикл', () => {
  const engine = createEngine(cfg(4, 4, 4, 4, 20));
  engine.start(T0);
  engine.pause(T0 + 25_000);
  engine.resume(T0 + 26_000);
  assert.equal(engine.tick(T0 + 26_000 + 15_999).state.done, false);
  const end = engine.tick(T0 + 26_000 + 16_000).state;
  assert.equal(end.done, true);
  assert.equal(end.elapsed, 41_000);
  assert.equal(end.cyclesDone, 2);
});
