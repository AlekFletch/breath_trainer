// Движок тренировки «Бутейко»: раунд — N коротких вдохов-выдохов, после последнего выдоха задержка,
// затем расслабление (спокойное дыхание без счёта); раундов — rounds (0 — пока не остановят).
// После задержки последнего раунда тренировка кончается сразу, без расслабления.
// Как и engine.js: без DOM и таймеров платформы, время приходит снаружи (now, мс), синтаксис ES5 + export.
//
// config: { breaths, inhale, exhale, hold, relax, rounds } — времена в секундах (вдох и выдох — с шагом 0,5);
//   hold     — задержка после выдоха; 0 — «до касания»: длится, пока не вызовут release(now), но не дольше MAX_OPEN_HOLD_SEC;
//   relax    — расслабление после задержки; 0 — сразу новая серия.
//
// tick(now) возвращает { state, events }, как engine.js:
//   state  — { phase, phaseElapsed, phaseDuration, phaseProgress01, open, hold, round, rounds, breath, breaths,
//              cycleIndex, holds, elapsed, paused, done }, времена в мс;
//              phase — inhale / exhale / holdOut (задержка раунда) / relax (расслабление);
//              open — идёт задержка «до касания» (phaseDuration 0, progress 0); hold — идёт задержка раунда;
//              breath — номер вдоха в серии с единицы, 0 вне серии; round — номер раунда с единицы;
//              cycleIndex — сквозной номер шага (по нему вибрация отличает один вдох от другого);
//              holds — длительности завершённых задержек раундов, мс.
//   events — { type: 'phaseStart' | 'secondTick' | 'cue' | 'end', ... }:
//              secondTick — как в engine.js; на задержке раунда — только раз в HOLD_TICK_SEC секунд;
//              cue — отдельный сигнал { mode: 'double' | 'long' }: начало последнего выдоха серии («дальше задержка»)
//              и конец задержки раунда.
// Пауза замораживает время; после неё прерванный вдох-выдох начинается заново со вдоха.

export var MAX_OPEN_HOLD_SEC = 5 * 60;
export var HOLD_TICK_SEC = 10;

var INHALE = 0;
var EXHALE = 1;
var HOLD = 2;
var RELAX = 3;
var PHASE_OF = ['inhale', 'exhale', 'holdOut', 'relax'];

function inRange(value, min, max) {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

// Текст ошибки или null.
export function validateSeriesConfig(config) {
  if (!config) return 'config is required';
  if (!inRange(config.breaths, 1, 100) || Math.floor(config.breaths) !== config.breaths) return 'breaths must be in 1..100';
  if (!inRange(config.inhale, 0.5, 60)) return 'inhale must be in 0.5..60';
  if (!inRange(config.exhale, 0.5, 60)) return 'exhale must be in 0.5..60';
  if (!inRange(config.hold, 0, MAX_OPEN_HOLD_SEC)) return 'hold must be in 0..' + MAX_OPEN_HOLD_SEC;
  if (!inRange(config.relax, 0, 600)) return 'relax must be in 0..600';
  if (!inRange(config.rounds, 0, 100) || Math.floor(config.rounds) !== config.rounds) return 'rounds must be in 0..100';
  return null;
}

export function createSeriesEngine(config) {
  var error = validateSeriesConfig(config);
  if (error) throw new Error(error);

  var breaths = config.breaths;
  var rounds = config.rounds;
  var inhaleMs = Math.round(config.inhale * 1000);
  var exhaleMs = Math.round(config.exhale * 1000);
  var holdMs = Math.round(config.hold * 1000);
  var relaxMs = Math.round(config.relax * 1000);
  var perRound = 2 * breaths + 1 + (relaxMs > 0 ? 1 : 0);

  var startedAt = null;
  var pausedAt = null;
  var pausedTotal = 0;
  var index = 0;        // сквозной номер шага
  var stepStart = 0;    // elapsed начала шага
  var stepMs = 0;       // длительность шага; у задержки «до касания» — предел MAX_OPEN_HOLD_SEC, пока не отпустят
  var nextTick = 0;     // смещение следующего secondTick от начала шага
  var announced = false; // phaseStart текущего шага уже отдан
  var done = false;
  var holds = [];

  function kindOf(i) {
    var k = i % perRound;
    if (k < 2 * breaths) return k % 2 === 0 ? INHALE : EXHALE;
    return k === 2 * breaths ? HOLD : RELAX;
  }

  function durationOf(i) {
    switch (kindOf(i)) {
      case INHALE: return inhaleMs;
      case EXHALE: return exhaleMs;
      case HOLD: return holdMs > 0 ? holdMs : MAX_OPEN_HOLD_SEC * 1000;
      default: return relaxMs;
    }
  }

  function enter(i, at) {
    index = i;
    stepStart = at;
    stepMs = durationOf(i);
    nextTick = kindOf(i) === HOLD ? HOLD_TICK_SEC * 1000 : 0;
    announced = false;
  }

  function elapsedAt(now) {
    if (startedAt === null) return 0;
    var until = pausedAt !== null ? pausedAt : now;
    var elapsed = until - startedAt - pausedTotal;
    return elapsed < 0 ? 0 : elapsed;
  }

  // События текущего шага до момента elapsed (не включая его конец).
  function emitStep(elapsed, out) {
    var kind = kindOf(index);
    var phase = PHASE_OF[kind];
    if (!announced) {
      announced = true;
      out.push({ type: 'phaseStart', phase: phase, cycleIndex: index, at: stepStart });
      if (kind === EXHALE && Math.floor((index % perRound) / 2) === breaths - 1) {
        out.push({ type: 'cue', mode: 'double', at: stepStart });
      }
    }
    var period = kind === HOLD ? HOLD_TICK_SEC * 1000 : 1000;
    while (nextTick < stepMs && stepStart + nextTick <= elapsed) {
      out.push({
        type: 'secondTick',
        phase: phase,
        n: Math.floor(nextTick / 1000) + 1,
        cycleIndex: index,
        at: stepStart + nextTick,
        last: kind !== HOLD && nextTick + 1000 >= stepMs
      });
      nextTick += period;
    }
  }

  function advance(elapsed, out) {
    while (!done) {
      emitStep(elapsed, out);
      var end = stepStart + stepMs;
      if (elapsed < end) return;
      if (kindOf(index) === HOLD) {
        holds.push(stepMs);
        out.push({ type: 'cue', mode: 'long', at: end });
      }
      var next = index + 1;
      // Последний раунд кончается задержкой: расслабление после неё не нужно.
      if (rounds > 0 && next >= rounds * perRound - (relaxMs > 0 ? 1 : 0)) {
        done = true;
        out.push({ type: 'end', at: end });
        return;
      }
      enter(next, end);
    }
  }

  function stateAt(elapsed) {
    var kind = kindOf(index);
    var phaseElapsed = done ? stepMs : elapsed - stepStart;
    var open = kind === HOLD && holdMs === 0 && !done;
    var k = index % perRound;
    return {
      phase: PHASE_OF[kind],
      phaseElapsed: phaseElapsed,
      phaseDuration: open ? 0 : stepMs,
      phaseProgress01: open ? 0 : phaseElapsed / stepMs,
      open: open,
      hold: kind === HOLD && !done,
      round: Math.floor(index / perRound) + 1,
      rounds: rounds,
      breath: k < 2 * breaths ? Math.floor(k / 2) + 1 : 0,
      breaths: breaths,
      cycleIndex: index,
      holds: holds,
      elapsed: elapsed,
      paused: pausedAt !== null,
      done: done
    };
  }

  function tick(now) {
    var elapsed = elapsedAt(now);
    var events = [];
    if (startedAt !== null) advance(elapsed, events);
    return { state: stateAt(done ? stepStart + stepMs : elapsed), events: events };
  }

  return {
    start: function (now) {
      startedAt = now;
      pausedAt = null;
      pausedTotal = 0;
      holds = [];
      done = false;
      enter(0, 0);
    },
    pause: function (now) {
      if (startedAt === null || pausedAt !== null || done) return;
      pausedAt = now;
    },
    // Время продолжается с момента паузы; прерванный вдох-выдох — заново со вдоха.
    resume: function (now) {
      if (pausedAt === null) return;
      var elapsed = elapsedAt(now);
      pausedTotal += now - pausedAt;
      pausedAt = null;
      var kind = kindOf(index);
      if (kind === EXHALE) enter(index - 1, elapsed);
      else if (kind === INHALE) enter(index, elapsed);
    },
    // Касание на задержке раунда или на расслаблении: шаг заканчивается сейчас (длительность задержки записывается),
    // после задержки — расслабление, после расслабления — первый вдох следующей серии.
    release: function (now) {
      if (startedAt === null || pausedAt !== null || done) return;
      var kind = kindOf(index);
      if (kind !== HOLD && kind !== RELAX) return;
      var held = elapsedAt(now) - stepStart;
      stepMs = held > 0 ? held : 1;
    },
    tick: tick
  };
}
