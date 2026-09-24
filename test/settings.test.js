import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSettings,
  normalizeSettings,
  phasesFor,
  settingValue,
  stepSetting,
  updateSettings
} from '../src/core/settings.js';

test('по умолчанию: 4-7-8, 5 минут, вибрация вкл, звук выкл, язык системы', () => {
  assert.deepEqual(defaultSettings(), {
    presetId: '478',
    sessionSec: 300,
    vibration: true,
    sound: false,
    language: 'auto',
    custom: { inhale: 5, holdIn: 2, exhale: 5, holdOut: 2 }
  });
});

test('мусор из хранилища превращается в настройки по умолчанию', () => {
  for (const raw of [null, undefined, '', 'not json', '42', 42, [], 'null']) {
    assert.deepEqual(normalizeSettings(raw), defaultSettings(), String(raw));
  }
});

test('корректные поля сохраняются, некорректные заменяются по отдельности', () => {
  const s = normalizeSettings(
    JSON.stringify({
      presetId: 'box',
      sessionSec: 90, // не целые минуты
      vibration: 'yes',
      sound: true,
      language: 'de',
      custom: { inhale: 3, holdIn: 0, exhale: 6, holdOut: 0 },
      extra: 1
    })
  );
  assert.deepEqual(s, {
    presetId: 'box',
    sessionSec: 300,
    vibration: true,
    sound: true,
    language: 'de',
    custom: { inhale: 3, holdIn: 0, exhale: 6, holdOut: 0 }
  });

  assert.equal(normalizeSettings({ presetId: 'nope' }).presetId, '478');
  assert.equal(normalizeSettings({ language: 'ja' }).language, 'auto');
  assert.deepEqual(normalizeSettings({ custom: { inhale: 0, holdIn: 0, exhale: 0, holdOut: 0 } }).custom, defaultSettings().custom);
  assert.deepEqual(normalizeSettings({ custom: { inhale: 61, holdIn: 1, exhale: 1, holdOut: 1 } }).custom, defaultSettings().custom);
  assert.equal(normalizeSettings({ sessionSec: 3660 }).sessionSec, 300);
});

test('updateSettings не меняет исходный объект и отвергает некорректное', () => {
  const s = defaultSettings();
  const next = updateSettings(s, { vibration: false, language: 'fr' });
  assert.equal(next.vibration, false);
  assert.equal(next.language, 'fr');
  assert.equal(s.vibration, true);

  assert.equal(updateSettings(s, { language: 'xx' }), s);
  assert.equal(updateSettings(s, { presetId: 'nope' }), s);
  assert.equal(updateSettings(s, { unknown: 1 }), s);
});

test('stepSetting: сессия в минутах с пределами', () => {
  let s = defaultSettings();
  s = stepSetting(s, 'session', 1);
  assert.equal(s.sessionSec, 360);
  s = updateSettings(s, { sessionSec: 60 });
  assert.equal(stepSetting(s, 'session', -1).sessionSec, 60);
  s = updateSettings(s, { sessionSec: 3600 });
  assert.equal(stepSetting(s, 'session', 1).sessionSec, 3600);
  assert.equal(settingValue(s, 'session'), 60);
});

test('stepSetting: правка фаз выбирает «Своё», пустой цикл не допускается', () => {
  let s = defaultSettings();
  s = stepSetting(s, 'inhale', 1);
  assert.equal(s.presetId, 'custom');
  assert.equal(s.custom.inhale, 6);
  assert.deepEqual(phasesFor(s, 'custom'), s.custom);
  assert.equal(phasesFor(s, '478').holdIn, 7);

  let zero = updateSettings(defaultSettings(), { custom: { inhale: 1, holdIn: 0, exhale: 0, holdOut: 0 } });
  assert.equal(zero.custom.inhale, 1);
  assert.equal(stepSetting(zero, 'inhale', -1), zero);
  assert.equal(stepSetting(zero, 'holdIn', -1).custom.holdIn, 0);
  assert.equal(stepSetting(defaultSettings(), 'unknown', 1).presetId, '478');
});

test('компактная запись для хранилища часов: короче 128 байт, обратимая, ломаная — по умолчанию', async () => {
  const { encodeSettings, normalizeSettings, defaultSettings, updateSettings } = await import('../src/core/settings.js');
  let s = updateSettings(defaultSettings(), { language: 'zh', vibration: false, sessionSec: 1200, presetId: 'custom', custom: { inhale: 60, holdIn: 60, exhale: 60, holdOut: 60 } });
  const text = encodeSettings(s);
  assert.ok(JSON.stringify(text).length <= 128, text);
  assert.deepEqual(normalizeSettings(text), s);
  assert.deepEqual(normalizeSettings('b1;bad;x'), defaultSettings());
  assert.deepEqual(normalizeSettings(encodeSettings(defaultSettings())), defaultSettings());
});
