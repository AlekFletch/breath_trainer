import test from 'node:test';
import assert from 'node:assert/strict';
import { createLitePlatform } from '../src/platform/lite.js';
import { createSession } from '../src/core/session.js';

function fakeModules({
  locale = { language: 'ru', countryOrRegion: 'RU', dir: 'ltr' },
  stored = '',
  getFailTimes = 0,
  setFailTimes = 0
} = {}) {
  const calls = { vibrate: [], screen: [], set: [] };
  let getAttempts = 0;
  let setAttempts = 0;
  const modules = {
    calls,
    vibrator: { vibrate: (o) => calls.vibrate.push(o.mode) },
    brightness: { setKeepScreenOn: (o) => calls.screen.push(o.keepScreenOn) },
    configuration: {
      getLocale: () => {
        if (locale instanceof Error) throw locale;
        return locale;
      }
    },
    storage: {
      get: (o) => {
        // Без default рантайм часов пишет JSI-ошибку, когда ключа ещё нет.
        assert.equal(o.default, '');
        getAttempts += 1;
        if (getAttempts <= getFailTimes) return o.fail('boom', 500);
        return stored instanceof Error ? o.fail('boom', 500) : o.success(stored);
      },
      set: (o) => {
        setAttempts += 1;
        calls.set.push([o.key, o.value]);
        if (setAttempts <= setFailTimes) o.fail('boom', 500);
        else o.success();
      }
    }
  };
  return modules;
}

test('вибрация и удержание экрана уходят в системные модули', () => {
  const m = fakeModules();
  const p = createLitePlatform(m);
  p.vibrate('short');
  p.vibrate('long');
  p.vibrate('weird');
  p.keepScreenOn(true);
  p.keepScreenOn(0);
  assert.deepEqual(m.calls.vibrate, ['short', 'long', 'short']);
  assert.deepEqual(m.calls.screen, [true, false]);
  assert.equal(p.hasSound, false);
  assert.equal(typeof p.playSound, 'undefined');
});

test('двойная вибрация — два коротких импульса подряд: у мотора часов нет отдельного режима', async () => {
  const m = fakeModules();
  const p = createLitePlatform(m);
  p.vibrate('double');
  assert.deepEqual(m.calls.vibrate, ['short']);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.deepEqual(m.calls.vibrate, ['short', 'short']);
});

test('локаль системы собирается из языка и региона', () => {
  assert.equal(createLitePlatform(fakeModules()).systemLocale(), 'ru-RU');
  assert.equal(createLitePlatform(fakeModules({ locale: { language: 'zh', countryOrRegion: '' } })).systemLocale(), 'zh');
  assert.equal(createLitePlatform(fakeModules({ locale: null })).systemLocale(), '');
  assert.equal(createLitePlatform(fakeModules({ locale: new Error('no api') })).systemLocale(), '');
});

test('хранилище: JSON туда и обратно, пустое / битое / ошибка — значение по умолчанию', () => {
  const m = fakeModules();
  const p = createLitePlatform(m);
  p.save('breath.settings', { a: 1 });
  assert.deepEqual(m.calls.set, [['breath.settings', '{"a":1}']]);

  const results = [];
  createLitePlatform(fakeModules({ stored: '{"a":1}' })).load('k', 'fb', (v) => results.push(v));
  createLitePlatform(fakeModules({ stored: '' })).load('k', 'fb', (v) => results.push(v));
  createLitePlatform(fakeModules({ stored: '{oops' })).load('k', 'fb', (v) => results.push(v));
  createLitePlatform(fakeModules({ stored: new Error('io') })).load('k', 'fb', (v) => results.push(v));
  assert.deepEqual(results, [{ a: 1 }, 'fb', 'fb', 'fb']);
});

test('чтение и запись переживают одну случайную неудачу — повтор подхватывает результат', () => {
  const readResults = [];
  createLitePlatform(fakeModules({ stored: '{"a":1}', getFailTimes: 1 })).load('k', 'fb', (v) => readResults.push(v));
  assert.deepEqual(readResults, [{ a: 1 }]); // не откатилось на fallback из-за одной неудачи

  const m = fakeModules({ setFailTimes: 1 });
  createLitePlatform(m).save('breath.settings', { a: 1 });
  assert.deepEqual(m.calls.set, [
    ['breath.settings', '{"a":1}'],
    ['breath.settings', '{"a":1}']
  ]); // вторая попытка того же значения долетела
});

test('чтение сдаётся на fallback только после двух неудач подряд, а не зависает', () => {
  const results = [];
  createLitePlatform(fakeModules({ stored: '{"a":1}', getFailTimes: 2 })).load('k', 'fb', (v) => results.push(v));
  assert.deepEqual(results, ['fb']);
});

test('сессия на адаптере часов идёт без звука, даже если он включён в настройках', async () => {
  const m = fakeModules();
  const p = createLitePlatform(m);
  let now = 0;
  let loop = null;
  p.now = () => now;
  p.startLoop = (fn) => {
    loop = fn;
    return () => {
      loop = null;
    };
  };
  createSession({ inhale: 1, holdIn: 1, exhale: 1, holdOut: 1, sessionSec: 4 }, p, { sound: true, inhalePulseHz: 2 }).start();
  while (loop) {
    now += 50;
    loop();
  }
  // Однoсекундная задержка после вдоха — сразу и первая, и последняя: двойной импульс, второй короткий приходит
  // чуть позже (реальным таймером), поэтому в потоке событий он оказывается после конца сессии.
  assert.deepEqual(m.calls.vibrate, ['short', 'short', 'short', 'short', 'long']);
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.deepEqual(m.calls.vibrate, ['short', 'short', 'short', 'short', 'long', 'short']);
  assert.deepEqual(m.calls.screen, [true, false]);
});

test('save сообщает результат записи: успех, успех после повтора, отказ после двух неудач', () => {
  const results = [];
  createLitePlatform(fakeModules()).save('k', 1, (ok) => results.push(ok));
  createLitePlatform(fakeModules({ setFailTimes: 1 })).save('k', 1, (ok) => results.push(ok));
  createLitePlatform(fakeModules({ setFailTimes: 2 })).save('k', 1, (ok) => results.push(ok));
  assert.deepEqual(results, [true, true, false]);
});

test('save отказывает сразу, если значение длиннее предела хранилища часов (128), и не зовёт storage', () => {
  const m = fakeModules();
  const results = [];
  createLitePlatform(m).save('k', 'x'.repeat(200), (ok) => results.push(ok));
  assert.deepEqual(results, [false]);
  assert.deepEqual(m.calls.set, []);
});
