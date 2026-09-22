// Какие файлы общего кода копируются в проект часов и куда.
// Страницы ArkUI.Lite собираются отдельными бандлами внутри watch/, поэтому код держим там копией.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const WATCH_COMMON = 'watch/entry/src/main/js/MainAbility/common';

export const SYNCED_FILES = [
  'src/core/engine.js',
  'src/core/haptics.js',
  'src/core/sounds.js',
  'src/core/session.js',
  'src/core/view.js',
  'src/core/presets.js',
  'src/core/i18n.js',
  'src/core/settings.js',
  'src/platform/lite.js'
];

export function targetPath(root, file) {
  return join(root, WATCH_COMMON, file.replace(/^src\//, ''));
}

export function expectedCopy(root, file) {
  const header = `// Копия ${file}. Не редактировать: правьте исходник и запустите npm run sync:watch\n`;
  return header + readFileSync(join(root, file), 'utf8');
}

export function syncWatch(root) {
  for (const file of SYNCED_FILES) {
    const target = targetPath(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, expectedCopy(root, file));
  }
  return SYNCED_FILES.length;
}
