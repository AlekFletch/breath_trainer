// Сессия обычного дыхания: движок engine.js в цикле кадров runner.js.
// config — как у createEngine; platform и options — как у createRunner.

import { createEngine } from './engine.js';
import { createRunner } from './runner.js';

export function createSession(config, platform, options) {
  return createRunner(createEngine(config), platform, options);
}
