// Копия src/core/engine.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Движок дыхательной сессии: конечный автомат без DOM и без таймеров платформы.
// Время приходит снаружи (now, мс) — состояние считается от абсолютного времени, поэтому дрейфа нет.
// Синтаксис ES5 + export: этот же файл исполняется JS-рантаймом ArkUI.Lite на часах.

export var PHASES = ['inhale', 'holdIn', 'exhale', 'holdOut'];

var MAX_PHASE_SEC = 60;
var MAX_SESSION_SEC = 60 * 60;

// Возвращает текст ошибки или null, если конфигурация корректна.
export function validateConfig(config) {
  if (!config) return 'config is required';
  for (var i = 0; i < PHASES.length; i++) {
    var value = config[PHASES[i]];
    if (typeof value !== 'number' || !isFinite(value) || value < 0 || value > MAX_PHASE_SEC) {
      return PHASES[i] + ' must be a number of seconds in 0..' + MAX_PHASE_SEC;
    }
  }
  if (config.inhale + config.holdIn + config.exhale + config.holdOut <= 0) {
    return 'cycle length must be positive';
  }
  var session = config.sessionSec;
  if (typeof session !== 'number' || !isFinite(session) || session < 1 || session > MAX_SESSION_SEC) {
    return 'sessionSec must be in 1..' + MAX_SESSION_SEC;
  }
  return null;
}

// config: { inhale, holdIn, exhale, holdOut, sessionSec } — всё в секундах.
// sessionSec — таймер. Сессия заканчивается не по таймеру, а по концу цикла, в котором он истёк:
// начатый цикл всегда додышивается.
// Пауза замораживает время; после возобновления прерванный цикл не засчитывается и начинается заново с первой фазы.
//
// tick(now) возвращает { state, events }:
//   state  — { phase, phaseIndex, phaseElapsed, phaseDuration, phaseProgress01, cycleIndex, cyclesDone,
//              elapsed, sessionLeft, progress01, paused, done }, времена в мс;
//              elapsed — время дыхания без пауз; sessionLeft и progress01 — по таймеру, после него 0 и 1;
//              cycleIndex — сквозной номер текущего цикла с нуля (прерванные паузой тоже получают номер);
//              cyclesDone — число полностью пройденных циклов.
//   events — границы, пересечённые с прошлого тика, по порядку и ровно по одному разу:
//              { type: 'phaseStart', phase, cycleIndex, at }
//              { type: 'secondTick', phase, n, cycleIndex, at, last }  — n-я секунда фазы, n = 1 совпадает
//                с началом фазы; last — true на последней секунде фазы (сигнал «сейчас закончится»)
//              { type: 'end', at }
export function createEngine(config) {
  var error = validateConfig(config);
  if (error) throw new Error(error);

  var durations = [];
  var offsets = [];
  var cycleMs = 0;
  for (var i = 0; i < PHASES.length; i++) {
    durations.push(Math.round(config[PHASES[i]] * 1000));
    offsets.push(cycleMs);
    cycleMs += durations[i];
  }
  var sessionMs = Math.round(config.sessionSec * 1000);

  var startedAt = null;
  var pausedAt = null;
  var pausedTotal = 0;
  // Отрезок — дыхание от старта или от возобновления: циклы в нём идут с первой фазы.
  var segStart = 0;     // elapsed начала отрезка
  var segCycleBase = 0; // cycleIndex первого цикла отрезка
  var doneBefore = 0;   // полных циклов в прошлых отрезках
  var endMs = 0;        // elapsed конца сессии
  var lastPos = -1;     // позиция в отрезке, до которой события уже отданы; -1 — ещё не отданы и события начала
  var endEmitted = false;

  // Конец сессии — первая граница цикла отрезка не раньше таймера, но не меньше одного целого цикла.
  function segmentEnd(start) {
    var cycles = Math.ceil((sessionMs - start) / cycleMs);
    return start + (cycles < 1 ? 1 : cycles) * cycleMs;
  }

  function elapsedAt(now) {
    if (startedAt === null) return 0;
    var until = pausedAt !== null ? pausedAt : now;
    var elapsed = until - startedAt - pausedTotal;
    if (elapsed < 0) return 0;
    return elapsed > endMs ? endMs : elapsed;
  }

  function stateAt(elapsed) {
    var local = Math.floor((elapsed - segStart) / cycleMs);
    var inCycle = elapsed - segStart - local * cycleMs;
    // Текущая фаза — последняя ненулевая, начавшаяся не позже inCycle: нулевые фазы так пропускаются сами.
    var index = -1;
    for (var i = 0; i < PHASES.length; i++) {
      if (durations[i] > 0 && offsets[i] <= inCycle) index = i;
    }
    var phaseElapsed = inCycle - offsets[index];
    var left = sessionMs - elapsed;
    return {
      phase: PHASES[index],
      phaseIndex: index,
      phaseElapsed: phaseElapsed,
      phaseDuration: durations[index],
      phaseProgress01: phaseElapsed / durations[index],
      cycleIndex: segCycleBase + local,
      cyclesDone: doneBefore + local,
      elapsed: elapsed,
      sessionLeft: left > 0 ? left : 0,
      progress01: left > 0 ? elapsed / sessionMs : 1,
      paused: pausedAt !== null,
      done: startedAt !== null && elapsed >= endMs
    };
  }

  // Все границы фаз и секунд с позициями в отрезке из (from, to]; границы в момент конца сессии и позже не отдаются.
  function collectEvents(from, to, out) {
    for (var c = from < 0 ? 0 : Math.floor(from / cycleMs); c * cycleMs <= to; c++) {
      for (var i = 0; i < PHASES.length; i++) {
        if (durations[i] === 0) continue;
        var phaseStart = c * cycleMs + offsets[i];
        for (var s = 0; s < durations[i]; s += 1000) {
          var pos = phaseStart + s;
          var at = segStart + pos;
          if (pos > to || at >= endMs) return;
          if (pos <= from) continue;
          var cycleIndex = segCycleBase + c;
          if (s === 0) out.push({ type: 'phaseStart', phase: PHASES[i], cycleIndex: cycleIndex, at: at });
          out.push({ type: 'secondTick', phase: PHASES[i], n: s / 1000 + 1, cycleIndex: cycleIndex, at: at, last: s + 1000 >= durations[i] });
        }
      }
    }
  }

  function tick(now) {
    var elapsed = elapsedAt(now);
    var pos = elapsed - segStart;
    var events = [];
    if (startedAt !== null && pos > lastPos) {
      collectEvents(lastPos, pos, events);
      lastPos = pos;
    }
    if (startedAt !== null && elapsed >= endMs && !endEmitted) {
      endEmitted = true;
      events.push({ type: 'end', at: endMs });
    }
    return { state: stateAt(elapsed), events: events };
  }

  return {
    start: function (now) {
      startedAt = now;
      pausedAt = null;
      pausedTotal = 0;
      segStart = 0;
      segCycleBase = 0;
      doneBefore = 0;
      endMs = segmentEnd(0);
      lastPos = -1;
      endEmitted = false;
    },
    pause: function (now) {
      if (startedAt === null || pausedAt !== null || elapsedAt(now) >= endMs) return;
      pausedAt = now;
    },
    // Время продолжается с момента паузы, а цикл — заново с первой фазы.
    resume: function (now) {
      if (pausedAt === null) return;
      var elapsed = elapsedAt(now);
      var local = Math.floor((elapsed - segStart) / cycleMs);
      pausedTotal += now - pausedAt;
      pausedAt = null;
      doneBefore += local;
      segCycleBase += local + 1;
      segStart = elapsed;
      endMs = segmentEnd(elapsed);
      lastPos = -1;
    },
    tick: tick
  };
}
