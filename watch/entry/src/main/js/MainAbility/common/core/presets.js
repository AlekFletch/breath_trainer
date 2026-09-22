// Копия src/core/presets.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Пресеты дыхания. Значения фаз — в секундах; «Своё» — значения по умолчанию, пользователь их переопределяет.
// Названия — в i18n.js под ключами preset.<id>.

export var DEFAULT_SESSION_SEC = 5 * 60;

export var PRESETS = [
  { id: '478', inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
  { id: 'box', inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
  { id: 'relax', inhale: 4, holdIn: 0, exhale: 6, holdOut: 0 },
  { id: 'custom', inhale: 5, holdIn: 2, exhale: 5, holdOut: 2 }
];

export function findPreset(id) {
  for (var i = 0; i < PRESETS.length; i++) {
    if (PRESETS[i].id === id) return PRESETS[i];
  }
  return null;
}

// Конфигурация для createEngine из значений фаз и длины сессии.
export function toConfig(phases, sessionSec) {
  return {
    inhale: phases.inhale,
    holdIn: phases.holdIn,
    exhale: phases.exhale,
    holdOut: phases.holdOut,
    sessionSec: sessionSec
  };
}
