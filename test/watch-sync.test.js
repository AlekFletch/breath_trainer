import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SYNCED_FILES, expectedCopy, targetPath } from '../scripts/watch-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('копии общего кода в проекте часов совпадают с исходниками (иначе: npm run sync:watch)', () => {
  for (const file of SYNCED_FILES) {
    const target = targetPath(root, file);
    assert.ok(existsSync(target), `нет копии ${file}`);
    assert.equal(readFileSync(target, 'utf8'), expectedCopy(root, file), `устарела копия ${file}`);
  }
});
