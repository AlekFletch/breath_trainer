import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeriesEngine, validateSeriesConfig, MAX_OPEN_HOLD_SEC } from '../src/core/series.js';
import { createRunner } from '../src/core/runner.js';
import { createHaptics } from '../src/core/haptics.js';
import { addEntry, bestEver, summarizeHolds, dayIndex, decodeHistory, encodeHistory, formatDay, MAX_ENTRIES } from '../src/core/history.js';
import { defaultSettings, encodeSettings, normalizeSettings, seriesConfig, stepSeries, seriesOptions } from '../src/core/settings.js';
import { STORAGE_MAX_VALUE } from '../src/platform/lite.js';

const cfg = (over) => ({ breaths: 3, inhale: 1.5, exhale: 1.5, hold: 0, relax: 10, rounds: 2, ...over });

// Прогон движка кадрами по 40 мс; onFrame(state, events, t) может вмешаться (release, pause).
function run(engine, untilT, onFrame) {
  const all = [];
  let t = 0;
  let last = null;
  engine.start(0);
  while (t <= untilT) {
    const { state, events } = engine.tick(t);
    for (const e of events) all.push({ ...e, t });
    last = state;
    if (state.done) break;
    if (onFrame) onFrame(state, events, t);
    t += 40;
  }
  return { events: all, state: last, t };
}

const phaseStarts = (events) => events.filter((e) => e.type === 'phaseStart').map((e) => e.phase);

test('проверка конфигурации серии', () => {
  assert.equal(validateSeriesConfig(cfg()), null);
  assert.match(validateSeriesConfig(cfg({ breaths: 0 })), /breaths/);
  assert.match(validateSeriesConfig(cfg({ inhale: 0 })), /inhale/);
  assert.match(validateSeriesConfig(cfg({ hold: MAX_OPEN_HOLD_SEC + 1 })), /hold/);
  assert.match(validateSeriesConfig(cfg({ rounds: 1.5 })), /rounds/);
  assert.throws(() => createSeriesEngine(cfg({ exhale: -1 })));
});

test('раунд: N вдохов-выдохов, задержка, расслабление, снова серия; последний раунд кончается задержкой', () => {
  const engine = createSeriesEngine(cfg({ hold: 20, rounds: 2 }));
  const { events, state } = run(engine, 120000);
  const round = ['inhale', 'exhale', 'inhale', 'exhale', 'inhale', 'exhale', 'holdOut'];
  assert.deepEqual(phaseStarts(events), [...round, 'relax', ...round]);
  const end = events.find((e) => e.type === 'end');
  assert.equal(end.at, 2 * (3 * 3000 + 20000) + 10000);
  assert.equal(state.done, true);
  assert.deepEqual(state.holds, [20000, 20000]);
});

test('расслабление: оставшееся время, после паузы продолжается с того же места', () => {
  const engine = createSeriesEngine(cfg({ hold: 20 }));
  engine.start(0);
  let s = engine.tick(29000 + 4000).state;
  assert.equal(s.phase, 'relax');
  assert.equal(s.hold, false);
  assert.equal(s.phaseDuration, 10000);
  assert.equal(s.phaseElapsed, 4000);
  engine.pause(33000);
  engine.resume(60000);
  s = engine.tick(60000).state;
  assert.equal(s.phase, 'relax');
  assert.equal(s.phaseElapsed, 4000);
});

test('без восстановления после задержки сразу новая серия', () => {
  const engine = createSeriesEngine(cfg({ breaths: 1, hold: 5, relax: 0, rounds: 2 }));
  const { events } = run(engine, 60000);
  assert.deepEqual(phaseStarts(events), ['inhale', 'exhale', 'holdOut', 'inhale', 'exhale', 'holdOut']);
});

test('задержка «до касания» длится до release и записывает фактическое время', () => {
  const engine = createSeriesEngine(cfg({ rounds: 2 }));
  const released = [];
  const { state } = run(engine, 200000, (s, _e, t) => {
    if (s.hold && s.open && s.phaseElapsed >= (released.length ? 7000 : 12000)) {
      released.push(t);
      engine.release(t);
    }
  });
  assert.equal(state.done, true);
  assert.equal(released.length, 2);
  assert.equal(state.holds.length, 2);
  assert.ok(Math.abs(state.holds[0] - 12000) <= 40, String(state.holds[0]));
  assert.ok(Math.abs(state.holds[1] - 7000) <= 40, String(state.holds[1]));
});

test('задержка «до касания» без касания кончается через MAX_OPEN_HOLD_SEC', () => {
  const engine = createSeriesEngine(cfg({ breaths: 1, relax: 0, rounds: 1 }));
  const { state } = run(engine, 400000);
  assert.equal(state.done, true);
  assert.deepEqual(state.holds, [MAX_OPEN_HOLD_SEC * 1000]);
});

test('состояние: номер вдоха и раунда, open и hold на задержке, прогресс задержки «до касания» — 0', () => {
  const engine = createSeriesEngine(cfg());
  engine.start(0);
  let s = engine.tick(3500).state;
  assert.equal(s.phase, 'inhale');
  assert.equal(s.breath, 2);
  assert.equal(s.round, 1);
  s = engine.tick(9000 + 15000).state;
  assert.equal(s.phase, 'holdOut');
  assert.equal(s.open, true);
  assert.equal(s.hold, true);
  assert.equal(s.breath, 0);
  assert.equal(s.phaseDuration, 0);
  assert.equal(s.phaseProgress01, 0);
  assert.equal(s.phaseElapsed, 15000);
});

test('сигналы: двойной в начале последнего выдоха серии, длинный в конце задержки; тик задержки раз в 10 с', () => {
  const engine = createSeriesEngine(cfg({ hold: 30, rounds: 1 }));
  const { events } = run(engine, 120000);
  const cues = events.filter((e) => e.type === 'cue');
  assert.deepEqual(cues.map((e) => [e.mode, e.at]), [['double', 7500], ['long', 9000 + 30000]]);
  const holdTicks = events.filter((e) => e.type === 'secondTick' && e.phase === 'holdOut');
  assert.deepEqual(holdTicks.map((e) => e.at - 9000), [10000, 20000]);
});

test('пауза на вдохе-выдохе: время стоит, после неё вдох начинается заново', () => {
  const engine = createSeriesEngine(cfg());
  engine.start(0);
  engine.tick(2000); // выдох первого вдоха
  engine.pause(2000);
  assert.equal(engine.tick(50000).state.paused, true);
  assert.equal(engine.tick(50000).state.elapsed, 2000);
  engine.resume(50000);
  const { state, events } = engine.tick(50000);
  assert.equal(state.phase, 'inhale');
  assert.equal(state.breath, 1);
  assert.deepEqual(phaseStarts(events), ['inhale']);
});

test('касание на расслаблении — сразу первый вдох следующей серии', () => {
  const engine = createSeriesEngine(cfg({ hold: 20 }));
  engine.start(0);
  assert.equal(engine.tick(32000).state.phase, 'relax');
  engine.release(32000);
  const { state, events } = engine.tick(32040);
  assert.equal(state.phase, 'inhale');
  assert.equal(state.breath, 1);
  assert.equal(state.round, 2);
  assert.deepEqual(phaseStarts(events), ['inhale']);
  assert.deepEqual(state.holds, [20000]);
});

test('release вне задержки и расслабления ничего не делает', () => {
  const engine = createSeriesEngine(cfg());
  engine.start(0);
  engine.tick(1000);
  engine.release(1000);
  const s = engine.tick(1040).state;
  assert.equal(s.phase, 'inhale');
  assert.deepEqual(s.holds, []);
});

test('раундов 0 — без ограничения', () => {
  const engine = createSeriesEngine(cfg({ hold: 5, relax: 0, rounds: 0 }));
  engine.start(0);
  const s = engine.tick(10 * 14000).state;
  assert.equal(s.done, false);
  assert.equal(s.round, 11);
});

test('итоги задержек', () => {
  assert.deepEqual(summarizeHolds([42000, 51400, 58600]), { count: 3, best: 59, avg: 51 });
  assert.deepEqual(summarizeHolds([]), { count: 0, best: 0, avg: 0 });
});

test('вибрация серии: импульсы вдоха, двойной перед задержкой, длинный в конце задержки, слабый режим — короткие', () => {
  const frames = (strength) => {
    const engine = createSeriesEngine(cfg({ breaths: 2, hold: 10, relax: 0, rounds: 2 }));
    const haptics = createHaptics({ strength, inhalePulseHz: 2 });
    const out = [];
    engine.start(0);
    for (let t = 0; t <= 40000; t += 40) {
      const pulse = haptics.frame(engine.tick(t));
      if (pulse) out.push(pulse);
    }
    return out;
  };
  const strong = frames('strong');
  assert.ok(strong.includes('double'));
  assert.equal(strong.filter((p) => p === 'long').length, 2); // конец задержки первого раунда; конец второго совпадает с концом тренировки
  assert.ok(!frames('weak').some((p) => p === 'double' || p === 'long'));
});

test('runner: release заканчивает задержку, в конце экран отпускается', () => {
  const p = { t: 0, loop: null, screen: [], vibrations: [] };
  p.now = () => p.t;
  p.vibrate = (m) => p.vibrations.push(m);
  p.keepScreenOn = (on) => p.screen.push(on);
  p.startLoop = (fn) => {
    p.loop = fn;
    return () => { p.loop = null; };
  };
  let last = null;
  const runner = createRunner(createSeriesEngine(cfg({ breaths: 1, relax: 0, rounds: 1 })), p, { onFrame: (s) => { last = s; } });
  runner.start();
  while (p.loop && p.t < 8000) { p.t += 40; p.loop(); }
  assert.equal(last.hold, true);
  runner.release();
  assert.equal(last.done, true);
  assert.equal(p.loop, null);
  assert.equal(p.screen.at(-1), false);
});

test('история: компактная запись, не длиннее предела хранилища, старые отбрасываются', () => {
  let entries = [];
  for (let i = 0; i < MAX_ENTRIES + 5; i++) entries = addEntry(entries, { day: 20738 + i, best: 300, avg: 1295 });
  assert.equal(entries.length, MAX_ENTRIES);
  assert.equal(entries[0].day, 20738 + 5);
  const text = encodeHistory(entries);
  assert.ok(JSON.stringify(text).length <= STORAGE_MAX_VALUE, String(text.length));
  assert.deepEqual(decodeHistory(text), entries);
  assert.deepEqual(decodeHistory('мусор,g02!!01,'), []);
  assert.deepEqual(decodeHistory(null), []);
  assert.equal(bestEver([{ day: 1, best: 40, avg: 30 }, { day: 2, best: 55, avg: 50 }]), 55);
});

test('история: день по местному времени и подпись дд.мм', () => {
  const ms = Date.UTC(2026, 9, 12, 22, 30); // 12.10 22:30 UTC — в Москве (UTC+3) уже 13.10
  assert.equal(formatDay(dayIndex(ms, 0)), '12.10');
  assert.equal(formatDay(dayIndex(ms, -180)), '13.10');
});

test('настройки серии: по умолчанию, шаги по списку значений, сохранение и чтение старых строк', () => {
  const s = defaultSettings();
  assert.deepEqual(s.series, { breaths: 10, inhale: 15, exhale: 15, hold: 0, relax: 30, rounds: 3 });
  assert.deepEqual(seriesConfig(s), { breaths: 10, inhale: 1.5, exhale: 1.5, hold: 0, relax: 30, rounds: 3 });

  assert.equal(stepSeries(s, 'hold', 1).series.hold, 5);
  assert.equal(stepSeries(s, 'hold', -1), s);
  let r = s;
  for (let i = 0; i < 20; i++) r = stepSeries(r, 'rounds', 1);
  assert.equal(r.series.rounds, 0);
  assert.equal(stepSeries(r, 'rounds', -1).series.rounds, 10);
  assert.equal(stepSeries(s, 'inhale', 1).series.inhale, 20);

  const changed = stepSeries(stepSeries(s, 'breaths', 1), 'hold', 1);
  const text = encodeSettings(changed);
  assert.ok(JSON.stringify(text).length <= STORAGE_MAX_VALUE);
  assert.deepEqual(normalizeSettings(text).series, changed.series);
  assert.deepEqual(normalizeSettings('b1;478;5;1;0;auto;4,7,8,0;s').series, s.series);
  assert.deepEqual(normalizeSettings({ series: { ...s.series, inhale: 17 } }).series, s.series);
  for (const key of ['breaths', 'inhale', 'exhale', 'hold', 'relax', 'rounds']) assert.ok(seriesOptions(key).includes(s.series[key]), key);
});
