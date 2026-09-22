// Синхронизирует общий код и собирает пакет часов тем же hvigor, что DevEco Studio.
// Без аргументов — debug-пакет .hap; с аргументом release — подписанный релизный .app для AppGallery.
// Путь к DevEco Studio можно переопределить переменной DEVECO_STUDIO.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncWatch } from './watch-files.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const studio = process.env.DEVECO_STUDIO || 'C:\\Program Files\\Huawei\\DevEco Studio';
const jbr = join(studio, 'jbr');

syncWatch(root);

const release = process.argv[2] === 'release';
const task = release
  ? ['--mode', 'project', '-p', 'product=release', '-p', 'buildMode=release', 'assembleApp']
  : ['--mode', 'module', '-p', 'module=entry@default', '-p', 'product=default', '-p', 'buildMode=debug', 'assembleHap'];

const result = spawnSync(
  join(studio, 'tools', 'node', 'node.exe'),
  [
    join(studio, 'tools', 'hvigor', 'bin', 'hvigorw.js'),
    ...task,
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
