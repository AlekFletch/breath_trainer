// Помощники страниц часов. Только для watch/ — в src/ не копируется.
// Страницы сменяют друг друга через router.replace (стека страниц на Lite нет), поэтому настройки
// передаются в параметрах перехода и сохраняются в storage.

import { SETTINGS_KEY, defaultSettings, normalizeSettings } from './core/settings.js';
import { createTranslator, resolveLanguage } from './core/i18n.js';

// Сначала — настройки из параметров перехода или значения по умолчанию, затем — из хранилища, если перехода не было.
export function loadSettings(vm, platform, apply) {
  if (vm.settingsJson) {
    apply(normalizeSettings(vm.settingsJson));
    return;
  }
  apply(defaultSettings());
  platform.load(SETTINGS_KEY, null, function (raw) {
    apply(normalizeSettings(raw));
  });
}

// done(ok) необязателен — см. platform.save.
export function saveSettings(platform, settings, done) {
  platform.save(SETTINGS_KEY, settings, done);
}

export function translatorFor(platform, settings) {
  return createTranslator(resolveLanguage(settings.language, platform.systemLocale()));
}

export function navigate(router, page, settings) {
  router.replace({ uri: 'pages/' + page + '/' + page, params: { settingsJson: JSON.stringify(settings) } });
}

// Список с фокусом колёсика нужно отпустить до ухода со страницы: иначе рантайм держит ссылку
// на удалённый список, и следующий поворот колёсика или касание роняют движок.
export function focusRotation(list, focus) {
  try {
    list.rotation({ focus: focus });
  } catch (e) {
    // без колёсика или в старом рантайме — прокрутка только касанием
  }
}

// Присваивание только при изменении: каждое присваивание данных страницы перерисовывает привязки.
export function setIfChanged(vm, key, value) {
  if (vm[key] !== value) vm[key] = value;
}
