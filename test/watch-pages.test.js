import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsDir = fileURLToPath(new URL('../watch/entry/src/main/js/MainAbility/', import.meta.url));
const pagesDir = join(jsDir, 'pages');

function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

// Список с фокусом колёсика, удалённый при router.replace, роняет движок на следующем касании.
test('страницы с фокусом колёсика уходят только через leave, который снимает фокус', () => {
  for (const page of readdirSync(pagesDir)) {
    const source = readFileSync(join(pagesDir, page, page + '.js'), 'utf8');
    if (!/rotation|focusRotation/.test(source)) continue;
    assert.match(source, /leave: function \(target\) \{\s*focusRotation\(this\.\$refs\.list, false\);\s*navigate\(/, `pages/${page}: нет leave`);
    assert.equal(source.match(/navigate\(/g).length, 1, `pages/${page}: переход в обход leave`);
  }
});

// JerryScript на часах собран без RegExp: регулярное выражение в любом модуле не даёт разобрать всю страницу.
test('код часов не использует регулярные выражения', () => {
  for (const file of jsFiles(jsDir)) {
    const code = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
    assert.doesNotMatch(code, /(^|[=(,:!&|?;{}\s])\/[^/*\s][^/\n]*\/[gimsuy]*/m, `${file}: регулярное выражение`);
    assert.doesNotMatch(code, /\bRegExp\b/, `${file}: RegExp`);
  }
});

// Сборщик Lite кладёт скомпилированный шаблон в options.render и затирает одноимённый метод страницы.
test('страницы часов не объявляют метод render', () => {
  for (const page of readdirSync(pagesDir)) {
    const source = readFileSync(join(pagesDir, page, page + '.js'), 'utf8');
    assert.doesNotMatch(source, /^\s*render\s*[:(]/m, `pages/${page}: метод render затрётся шаблоном`);
  }
});
