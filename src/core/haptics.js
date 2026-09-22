// Рисунок вибрации поверх кадров движка. Решает, какой импульс дать в этом кадре; сам мотор не трогает.
//   вдох          — череда коротких импульсов с частотой inhalePulseHz всю фазу
//   задержки      — один короткий импульс на каждой секунде
//   выдох         — тишина
//   конец сессии  — длинный импульс
// За кадр — не больше одного импульса: после подвисания пропущенные тики сливаются в один, а не идут очередью.

export var DEFAULT_INHALE_PULSE_HZ = 3;

export function createHaptics(options) {
  var opts = options || {};
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
      if (event.type === 'end') return 'long';
      if (event.type === 'secondTick' && (event.phase === 'holdIn' || event.phase === 'holdOut')) {
        pulse = 'short';
      }
    }

    if (state.phase === 'inhale' && !state.done && !state.paused) {
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
