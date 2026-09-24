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
    // 'double' — двух коротких импульса подряд: у вибромотора часов нет отдельного режима для этого,
    // поэтому это два обычных коротких импульса с небольшой паузой между ними.
    vibrate: function (mode) {
      if (mode === 'double') {
        vibrator.vibrate({ mode: 'short', success: noop, fail: noop });
        setTimeout(function () {
          vibrator.vibrate({ mode: 'short', success: noop, fail: noop });
        }, 120);
        return;
      }
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
    // get/set на реальном устройстве изредка отдают fail без видимой причины — один повтор перед тем,
    // как сдаться, спасает от того, что настройки «не сохранились», хотя на самом деле не прочитались/не записались.
    load: function (key, fallback, done) {
      function attempt(retriesLeft) {
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
            if (retriesLeft > 0) attempt(retriesLeft - 1);
            else done(fallback);
          }
        });
      }
      attempt(1);
    },
    // done(ok) необязателен: страница «Сохранить» показывает по нему, записалось ли на самом деле.
    save: function (key, value, done) {
      var json = JSON.stringify(value);
      function attempt(retriesLeft) {
        storage.set({
          key: key,
          value: json,
          success: function () {
            if (done) done(true);
          },
          fail: function () {
            if (retriesLeft > 0) attempt(retriesLeft - 1);
            else if (done) done(false);
          }
        });
      }
      attempt(1);
    }
  };
}
