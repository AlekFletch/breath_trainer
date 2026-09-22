// Копия src/core/view.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Чистые функции отображения: размер шарика, цифра, время. Общие для прототипа и часов.
// Подписи фаз — в i18n.js под ключами phase.<фаза>.

export var BALL = { min: 0.45, max: 1.0, pulseAmp: 0.04 };

function easeOut(t) {
  return Math.sin((t * Math.PI) / 2);
}

// Масштаб шарика 0..~1.04 для состояния движка. params — { min, max, pulseAmp }, по умолчанию BALL.
// Пульсация на задержках — синус с периодом ровно в секунду, начинается с нуля на границе секунды,
// то есть совпадает с вибротиками.
export function ballScale(state, params) {
  var p = params || BALL;
  if (state.done) return p.min;
  var beat = Math.sin(2 * Math.PI * ((state.phaseElapsed % 1000) / 1000));
  switch (state.phase) {
    case 'inhale':
      return p.min + (p.max - p.min) * easeOut(state.phaseProgress01);
    case 'holdIn':
      return p.max * (1 + p.pulseAmp * beat);
    case 'exhale':
      return p.max - (p.max - p.min) * easeOut(state.phaseProgress01);
    default:
      return p.min * (1 + p.pulseAmp * beat);
  }
}

// Цифра на шарике: номер текущей секунды фазы, с единицы.
export function displaySecond(state) {
  return Math.min(Math.floor(state.phaseElapsed / 1000) + 1, Math.ceil(state.phaseDuration / 1000));
}

// Оставшееся время «м:сс», секунды округляются вверх — 0:00 появляется только в самом конце.
export function formatClock(ms) {
  var total = Math.ceil(ms / 1000);
  var seconds = total % 60;
  return Math.floor(total / 60) + ':' + (seconds < 10 ? '0' : '') + seconds;
}
