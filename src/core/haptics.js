// Рисунок вибрации поверх кадров движка. Решает, какой импульс дать в этом кадре; сам мотор не трогает.
//   вдох                    — череда коротких импульсов с частотой inhalePulseHz; на последней секунде вдоха — пауза
//                             (INHALE_GAP_MS до конца фазы), чтобы конец вдоха отличался от задержки, которая идёт следом
//   задержка после вдоха    — короткий импульс на каждой секунде, на последней секунде — двойной
//   задержка после выдоха   — один короткий импульс на каждой секунде
//   выдох                   — тишина
//   конец сессии            — длинный импульс
// Слабый (ночной) режим: вдох — один импульс на его последней секунде (вдох на 4 секунды — импульс на 4-й секунде, в момент t=3 с), задержка после вдоха — только на последней секунде,
// последняя секунда выдоха и задержки после выдоха — один импульс (сигнал: пора вдыхать),
// конец сессии — короткий импульс. Вибромотор часов силу не регулирует,
// поэтому «слабее» здесь значит реже и короче.
// За кадр — не больше одного импульса: после подвисания пропущенные тики сливаются в один, а не идут очередью.

export var DEFAULT_INHALE_PULSE_HZ = 3;

// Тишина перед концом вдоха, чуть короче секунды. Вдох короче двух секунд не прерывается: пауза съела бы его целиком.
export var INHALE_GAP_MS = 900;
var MIN_INHALE_FOR_GAP_MS = 2000;

export function createHaptics(options) {
  var opts = options || {};
  var weak = opts.strength === 'weak';
  var hz = opts.inhalePulseHz > 0 ? opts.inhalePulseHz : DEFAULT_INHALE_PULSE_HZ;
  var enabled = opts.enabled !== false;
  var lastInhalePulse = null;

  // result — то, что вернул engine.tick(); возвращает 'short', 'long' или null.
  function frame(result) {
    if (!enabled) return null;
    var events = result.events;
    var state = result.state;
    var pulse = null;

    for (var i = 0; i < events.length; i++) {
      var event = events[i];
      if (event.type === 'end') return weak ? 'short' : 'long';
      if (weak && event.type === 'secondTick' && event.phase === 'inhale' && event.last) pulse = 'short';
      if (event.type === 'secondTick' && event.phase === 'holdIn') {
        if (!weak) pulse = event.last ? 'double' : 'short';
        else if (event.last) pulse = 'short';
      } else if (event.type === 'secondTick' && event.phase === 'holdOut') {
        if (!weak || event.last) pulse = 'short';
      } else if (weak && event.type === 'secondTick' && event.phase === 'exhale' && event.last) {
        pulse = 'short';
      }
    }

    var gapFrom = state.phaseDuration >= MIN_INHALE_FOR_GAP_MS ? state.phaseDuration - INHALE_GAP_MS : state.phaseDuration;
    if (!weak && state.phase === 'inhale' && !state.done && !state.paused && state.phaseElapsed < gapFrom) {
      var key = state.cycleIndex + ':' + Math.floor((state.phaseElapsed * hz) / 1000);
      if (key !== lastInhalePulse) {
        lastInhalePulse = key;
        pulse = 'short';
      }
    }
    return pulse;
  }

  return {
    frame: frame,
    setEnabled: function (value) {
      enabled = !!value;
    }
  };
}
