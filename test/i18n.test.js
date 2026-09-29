import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_LANGUAGE,
  LANGUAGES,
  KEYS,
  TEXTS,
  createTranslator,
  languageName,
  matchLocale,
  resolveLanguage,
  stringsFor
} from '../src/core/i18n.js';
import { PRESETS } from '../src/core/presets.js';
import { PHASES } from '../src/core/engine.js';

test('шесть языков, и у каждого есть таблица строк', () => {
  assert.deepEqual(LANGUAGES.map((l) => l.code), ['ru', 'en', 'es', 'de', 'fr', 'zh']);
  assert.deepEqual(Object.keys(TEXTS).sort(), LANGUAGES.map((l) => l.code).sort());
});

test('в каждом языке по строке на каждый ключ, без пустых', () => {
  assert.equal(new Set(KEYS).size, KEYS.length, 'повторяющиеся ключи');
  for (const { code } of LANGUAGES) {
    const texts = TEXTS[code].split('|');
    assert.equal(texts.length, KEYS.length, `${code}: строк не столько, сколько ключей`);
    for (let i = 0; i < KEYS.length; i++) assert.ok(texts[i].trim(), `${code}: пустая строка ${KEYS[i]}`);
  }
});

test('таблица языка: ключ → строка, неподдержанный язык — английский', () => {
  assert.equal(stringsFor('ru')['phase.inhale'], 'Вдох');
  assert.equal(stringsFor('en')['stats.backHint'], 'Tap to go back');
  assert.deepEqual(stringsFor('xx'), stringsFor('en'));
});

test('есть подписи для всех фаз и пресетов', () => {
  const en = stringsFor('en');
  for (const phase of PHASES) assert.ok(en['phase.' + phase], phase);
  for (const preset of PRESETS) assert.ok(en['preset.' + preset.id], preset.id);
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
