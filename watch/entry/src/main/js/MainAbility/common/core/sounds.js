// Копия src/core/sounds.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Звуковое сопровождение поверх кадров движка: какие команды дать звуковому адаптеру в этом кадре.
//   вдох / выдох — звук на всю фазу; адаптер растягивает его на durationMs и начинает с offsetMs
//   задержки     — тик на каждой секунде
//   конец сессии — завершающий сигнал
// Команды: { cmd: 'play', sound: 'inhale' | 'exhale' | 'tick' | 'end', durationMs, offsetMs }
//          { cmd: 'stop' } — оборвать длинный звук фазы (короткие тик и финал доигрывают сами).
// Звук выключен по умолчанию.

var BREATH = { inhale: true, exhale: true };
var HOLD = { holdIn: true, holdOut: true };

export function createSoundCues(options) {
  var opts = options || {};
  var enabled = opts.enabled === true;
  var lastPhaseKey = null; // фаза, для которой уже отдан звук; null — ничего не звучит
  var wasPaused = false;

  // result — то, что вернул engine.tick(); возвращает массив команд, возможно пустой.
  function frame(result) {
    var out = [];
    if (!enabled) return out;
    var state = result.state;
    var events = result.events;

    if (state.paused) {
      if (!wasPaused) {
        wasPaused = true;
        if (lastPhaseKey !== null) out.push({ cmd: 'stop' });
        lastPhaseKey = null; // после паузы звук фазы начнётся заново
      }
      return out;
    }
    wasPaused = false;

    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'end') {
        if (lastPhaseKey !== null) out.push({ cmd: 'stop' });
        lastPhaseKey = null;
        out.push({ cmd: 'play', sound: 'end' });
        return out;
      }
    }

    // Смена фазы определяется по состоянию, а не по событиям: после подвисания,
    // перескочившего через фазу, звучит та фаза, в которой мы на самом деле оказались.
    var key = state.cycleIndex + ':' + state.phaseIndex;
    if (key !== lastPhaseKey) {
      if (lastPhaseKey !== null) out.push({ cmd: 'stop' });
      lastPhaseKey = key;
      if (BREATH[state.phase]) {
        out.push({ cmd: 'play', sound: state.phase, durationMs: state.phaseDuration, offsetMs: state.phaseElapsed });
      }
    }

    // Не больше одного тика за кадр; тики чужих, уже прошедших задержек не звучат.
    if (HOLD[state.phase]) {
      for (var j = 0; j < events.length; j++) {
        var e = events[j];
        if (e.type === 'secondTick' && e.phase === state.phase && e.cycleIndex === state.cycleIndex) {
          out.push({ cmd: 'play', sound: 'tick' });
          break;
        }
      }
    }
    return out;
  }

  return { frame: frame };
}
