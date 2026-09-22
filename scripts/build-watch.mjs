// Синхронизирует общий код и собирает debug-пакет часов тем же hvigor, что DevEco Studio.
// Путь к DevEco Studio можно переопределить переменной DEVECO_STUDIO.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncWatch } from './watch-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const studio = process.env.DEVECO_STUDIO || 'C:\\Program Files\\Huawei\\DevEco Studio';
const jbr = join(studio, 'jbr');

syncWatch(root);

const result = spawnSync(
  join(studio, 'tools', 'node', 'node.exe'),
  [
    join(studio, 'tools', 'hvigor', 'bin', 'hvigorw.js'),
    '--mode', 'module',
    '-p', 'module=entry@default',
    '-p', 'product=default',
    '-p', 'buildMode=debug',
    'assembleHap',
    '--no-daemon'
  ],
  {
    cwd: join(root, 'watch'),
    stdio: 'inherit',
    env: {
      ...process.env,
      JAVA_HOME: jbr,
      DEVECO_SDK_HOME: join(studio, 'sdk'),
      PATH: `${join(jbr, 'bin')};${process.env.PATH}`
    }
  }
);

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
