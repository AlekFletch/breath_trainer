import test from 'node:test';
import assert from 'node:assert/strict';
import { createLitePlatform } from '../src/platform/lite.js';
import { createSession } from '../src/core/session.js';

function fakeModules({ locale = { language: 'ru', countryOrRegion: 'RU', dir: 'ltr' }, stored = '' } = {}) {
  const calls = { vibrate: [], screen: [], set: [] };
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
        return stored instanceof Error ? o.fail('boom', 500) : o.success(stored);
      },
      set: (o) => calls.set.push([o.key, o.value])
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

test('сессия на адаптере часов идёт без звука, даже если он включён в настройках', () => {
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
  assert.deepEqual(m.calls.vibrate, ['short', 'short', 'short', 'short', 'long']);
  assert.deepEqual(m.calls.screen, [true, false]);
});
