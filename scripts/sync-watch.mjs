// Копирует общий код (src/core, src/platform/lite.js) в проект часов.
import { fileURLToPath } from 'node:url';
import { WATCH_COMMON, syncWatch } from './watch-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const count = syncWatch(root);
console.log(`Скопировано файлов: ${count} → ${WATCH_COMMON}`);
