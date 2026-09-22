// Копия src/core/settings.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Настройки приложения: значения по умолчанию, проверка сохранённых данных, изменения.
// Общие для прототипа и часов. Хранилище может вернуть что угодно — наружу выходят только корректные настройки,
// а изменение, которое сделало бы их некорректными, просто не применяется.

import { DEFAULT_SESSION_SEC, findPreset } from './presets.js';
import { AUTO_LANGUAGE, isSupported } from './i18n.js';
import { PHASES } from './engine.js';

export var SETTINGS_KEY = 'breath.settings';

// Пределы для кнопок «−/+». session — в минутах, фазы — в секундах.
export var LIMITS = {
  session: { min: 1, max: 60 },
  inhale: { min: 0, max: 60 },
  holdIn: { min: 0, max: 60 },
  exhale: { min: 0, max: 60 },
  holdOut: { min: 0, max: 60 }
};

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isIntIn(value, min, max) {
  return typeof value === 'number' && isFinite(value) && Math.floor(value) === value && value >= min && value <= max;
}

export function defaultSettings() {
  var custom = findPreset('custom');
  return {
    presetId: '478',
    sessionSec: DEFAULT_SESSION_SEC,
    vibration: true,
    sound: false,
    language: AUTO_LANGUAGE,
    custom: { inhale: custom.inhale, holdIn: custom.holdIn, exhale: custom.exhale, holdOut: custom.holdOut }
  };
}

// raw — объект или JSON-строка из хранилища. Некорректные поля заменяются значениями по умолчанию.
export function normalizeSettings(raw) {
  var settings = defaultSettings();
  var source = raw;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch (e) {
      source = null;
    }
  }
  if (!source || typeof source !== 'object') return settings;

  if (typeof source.presetId === 'string' && findPreset(source.presetId)) settings.presetId = source.presetId;
  if (isIntIn(source.sessionSec / 60, LIMITS.session.min, LIMITS.session.max)) settings.sessionSec = source.sessionSec;
  if (typeof source.vibration === 'boolean') settings.vibration = source.vibration;
  if (typeof source.sound === 'boolean') settings.sound = source.sound;
  if (source.language === AUTO_LANGUAGE || (typeof source.language === 'string' && isSupported(source.language))) {
    settings.language = source.language;
  }

  if (source.custom && typeof source.custom === 'object') {
    var custom = {};
    var total = 0;
    for (var i = 0; i < PHASES.length; i++) {
      var phase = PHASES[i];
      var value = source.custom[phase];
      if (!isIntIn(value, LIMITS[phase].min, LIMITS[phase].max)) {
        custom = null;
        break;
      }
      custom[phase] = value;
      total += value;
    }
    if (custom && total > 0) settings.custom = custom;
  }
  return settings;
}

export function phasesFor(settings, presetId) {
  return presetId === 'custom' ? settings.custom : findPreset(presetId);
}

// Значение для строки настроек: сессия — в минутах, фазы «Своего» — в секундах.
export function settingValue(settings, key) {
  return key === 'session' ? settings.sessionSec / 60 : settings.custom[key];
}

// Новые настройки с изменёнными полями. Если результат некорректен — возвращаются прежние.
export function updateSettings(settings, patch) {
  var next = normalizeSettings(settings);
  for (var key in patch) {
    if (!hasOwn(patch, key)) continue;
    if (key === 'custom') {
      for (var i = 0; i < PHASES.length; i++) {
        if (hasOwn(patch.custom, PHASES[i])) next.custom[PHASES[i]] = patch.custom[PHASES[i]];
      }
    } else {
      next[key] = patch[key];
    }
  }
  var normalized = normalizeSettings(next);
  return JSON.stringify(normalized) === JSON.stringify(next) ? normalized : settings;
}

// Кнопка «−» (delta = -1) или «+» (delta = 1). Правка фаз выбирает пресет «Своё».
// Цикл из одних нулей не допускается — такое изменение не применяется.
export function stepSetting(settings, key, delta) {
  var limits = LIMITS[key];
  if (!limits) return settings;
  var value = Math.min(limits.max, Math.max(limits.min, settingValue(settings, key) + delta));
  if (key === 'session') return updateSettings(settings, { sessionSec: value * 60 });
  var custom = {};
  custom[key] = value;
  return updateSettings(settings, { custom: custom, presetId: 'custom' });
}
