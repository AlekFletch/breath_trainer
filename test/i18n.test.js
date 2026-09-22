import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_LANGUAGE,
  LANGUAGES,
  STRINGS,
  createTranslator,
  languageName,
  matchLocale,
  resolveLanguage
} from '../src/core/i18n.js';
import { PRESETS } from '../src/core/presets.js';
import { PHASES } from '../src/core/engine.js';

test('шесть языков, и у каждого есть таблица строк', () => {
  assert.deepEqual(LANGUAGES.map((l) => l.code), ['ru', 'en', 'es', 'de', 'fr', 'zh']);
  assert.deepEqual(Object.keys(STRINGS).sort(), LANGUAGES.map((l) => l.code).sort());
});

test('во всех языках ровно те же ключи, что в английском', () => {
  const reference = Object.keys(STRINGS.en).sort();
  for (const { code } of LANGUAGES) {
    assert.deepEqual(Object.keys(STRINGS[code]).sort(), reference, code);
    for (const key of reference) assert.ok(STRINGS[code][key].trim(), `${code}: пустая строка ${key}`);
  }
});

test('есть подписи для всех фаз и пресетов', () => {
  for (const phase of PHASES) assert.ok(STRINGS.en['phase.' + phase], phase);
  for (const preset of PRESETS) assert.ok(STRINGS.en['preset.' + preset.id], preset.id);
});

test('язык системы: поддержанный берётся, остальные — английский', () => {
  assert.equal(matchLocale('ru-RU'), 'ru');
  assert.equal(matchLocale('EN-gb'), 'en');
  assert.equal(matchLocale('es-419'), 'es');
  assert.equal(matchLocale('de'), 'de');
  assert.equal(matchLocale('fr_CA'), 'fr');
  assert.equal(matchLocale('zh-Hans-CN'), 'zh');
  assert.equal(matchLocale('zh-TW'), 'zh');
  assert.equal(matchLocale('ja-JP'), 'en');
  assert.equal(matchLocale('pt-BR'), 'en');
  assert.equal(matchLocale(''), 'en');
  assert.equal(matchLocale(undefined), 'en');
});

test('явный выбор важнее языка системы, «авто» и неизвестный код — по системе', () => {
  assert.equal(resolveLanguage('es', 'ru-RU'), 'es');
  assert.equal(resolveLanguage(AUTO_LANGUAGE, 'fr-FR'), 'fr');
  assert.equal(resolveLanguage(AUTO_LANGUAGE, 'ja-JP'), 'en');
  assert.equal(resolveLanguage(undefined, 'de-DE'), 'de');
  assert.equal(resolveLanguage('xx', 'zh-CN'), 'zh');
});

test('переводчик подставляет параметры и откатывается на английский', () => {
  assert.equal(createTranslator('ru')('session.cycles', { n: 15 }), 'Циклов: 15');
  assert.equal(createTranslator('zh')('phase.inhale'), '吸气');
  assert.equal(createTranslator('xx')('home.start'), 'Start');
  assert.equal(createTranslator('de')('no.such.key'), 'no.such.key');
});

test('названия языков — на самих языках', () => {
  assert.equal(languageName('de'), 'Deutsch');
  assert.equal(languageName('zh'), '中文');
});
