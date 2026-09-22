// Копия src/platform/lite.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Адаптер платформы для часов (ArkUI.Lite, Lite Wearable).
// Системные модули передаются снаружи: страница импортирует @system.*, а адаптер остаётся проверяемым в Node.
// Звука нет: в JS API Lite Wearable нет аудио-модуля, поэтому playSound / stopSound не объявлены
// и сессия идёт без звука (см. session.js).

function noop() {}

// modules: { vibrator, brightness, storage, configuration } — @system.vibrator, @system.brightness, ...
export function createLitePlatform(modules) {
  var vibrator = modules.vibrator;
  var brightness = modules.brightness;
  var storage = modules.storage;
  var configuration = modules.configuration;

  return {
    hasSound: false,
    now: function () {
      return new Date().getTime();
    },
    vibrate: function (mode) {
      vibrator.vibrate({ mode: mode === 'long' ? 'long' : 'short', success: noop, fail: noop });
    },
    keepScreenOn: function (on) {
      brightness.setKeepScreenOn({ keepScreenOn: !!on, success: noop, fail: noop });
    },
    // Локаль системы вида 'ru-RU'.
    systemLocale: function () {
      try {
        var locale = configuration.getLocale();
        if (!locale || !locale.language) return '';
        return locale.countryOrRegion ? locale.language + '-' + locale.countryOrRegion : locale.language;
      } catch (e) {
        return '';
      }
    },
    startLoop: function (fn, fps) {
      var id = setInterval(fn, Math.round(1000 / fps));
      return function () {
        clearInterval(id);
      };
    },
    // Хранилище на часах асинхронное и хранит строки: результат приходит в done уже разобранным.
    load: function (key, fallback, done) {
      storage.get({
        key: key,
        default: '',
        success: function (data) {
          var value = fallback;
          if (typeof data === 'string' && data !== '') {
            try {
              value = JSON.parse(data);
            } catch (e) {
              value = fallback;
            }
          }
          done(value);
        },
        fail: function () {
          done(fallback);
        }
      });
    },
    save: function (key, value) {
      storage.set({ key: key, value: JSON.stringify(value), success: noop, fail: noop });
    }
  };
}
