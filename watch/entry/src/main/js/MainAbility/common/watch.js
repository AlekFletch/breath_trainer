// Помощники страниц часов. Только для watch/ — в src/ не копируется.
// Страницы сменяют друг друга через router.replace (стека страниц на Lite нет), поэтому настройки
// передаются в параметрах перехода и сохраняются в storage.

import { SETTINGS_KEY, encodeSettings, normalizeSettings } from './core/settings.js';
import { createTranslator, resolveLanguage } from './core/i18n.js';

// Настройки из параметров перехода, а при первом запуске — из хранилища; apply вызывается один раз.
// Значения по умолчанию заранее не рисуются: страница ждёт настоящих (иначе при запуске мерцает смена
// пресета и надписей); нет сохранённых — normalizeSettings(null) даст значения по умолчанию.
export function loadSettings(vm, platform, apply) {
  if (vm.settingsJson) {
    apply(normalizeSettings(vm.settingsJson));
    return;
  }
  platform.load(SETTINGS_KEY, null, function (raw) {
    apply(normalizeSettings(raw));
  });
}

// Вызывает done, когда fn-ready позвали count раз: страница показывается, только когда всё готово.
export function whenReady(count, done) {
  var left = count;
  return function () {
    left--;
    if (left === 0) done();
  };
}

// done(ok) необязателен — см. platform.save.
export function saveSettings(platform, settings, done) {
  platform.save(SETTINGS_KEY, encodeSettings(settings), done);
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

// Круглые часы (WATCH GT: 454 × 454, 466 × 466) узнаются по screenShape или по квадратному экрану
// не меньше 440 px (симулятор всегда отдаёт 'rect'). @media для этого не годится: в рантайме Lite условие
// по ширине сверяется не с реальным экраном, а составное условие роняет движок.
export var ROUND_MIN_SIDE = 440;
var RECT_SCREEN = { width: 408, height: 480, round: false };

export function isRoundScreen(shape, width, height) {
  if (shape === 'circle') return true;
  return width === height && width >= ROUND_MIN_SIDE;
}

// Экран часов: apply({ width, height, round }) вызывается один раз, когда размер известен. getInfo отвечает
// асинхронно, поэтому страницы до этого ничего не рисуют (иначе сначала мелькает прямоугольная раскладка).
// Без @system.device или при ошибке — прямоугольный 408 × 480.
export function readScreen(device, apply) {
  var applied = false;
  function once(screen) {
    if (applied) return;
    applied = true;
    apply(screen);
  }
  try {
    device.getInfo({
      success: function (info) {
        var width = info.windowWidth || RECT_SCREEN.width;
        var height = info.windowHeight || RECT_SCREEN.height;
        once({ width: width, height: height, round: isRoundScreen(info.screenShape, width, height) });
      },
      fail: function () {
        once(RECT_SCREEN);
      }
    });
  } catch (e) {
    once(RECT_SCREEN);
  }
}

// Размеры страниц со списком (настройки, язык): заголовок с «<» сверху, под ним список.
// На круглом экране заголовок уже и ниже, список уже — так строки не заходят за край круга.
export function listLayout(screen) {
  if (!screen.round) {
    return {
      screenWidth: screen.width, screenHeight: screen.height,
      headWidth: 360, headTop: 24, titleWidth: 298,
      contentWidth: 360, listHeight: screen.height - 112, switchLabelWidth: 280
    };
  }
  var cy = Math.round(screen.height / 2);
  return {
    screenWidth: screen.width, screenHeight: screen.height,
    headWidth: 240, headTop: cy - 190, titleWidth: 178,
    contentWidth: 290, listHeight: 296, switchLabelWidth: 210
  };
}

export function applyLayout(vm, layout) {
  for (var key in layout) {
    if (Object.prototype.hasOwnProperty.call(layout, key)) setIfChanged(vm, key, layout[key]);
  }
}
