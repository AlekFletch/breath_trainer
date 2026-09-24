import { PRESETS, toConfig } from '../src/core/presets.js';
import { createSession } from '../src/core/session.js';
import { BALL, ballScale, displaySecond, formatClock } from '../src/core/view.js';
import { DEFAULT_INHALE_PULSE_HZ } from '../src/core/haptics.js';
import { AUTO_LANGUAGE, LANGUAGES, createTranslator, languageName, matchLocale, resolveLanguage } from '../src/core/i18n.js';
import { SETTINGS_KEY, normalizeSettings, phasesFor, settingValue, stepSetting, updateSettings } from '../src/core/settings.js';
import { createWebPlatform } from '../src/platform/web.js';

const $ = (id) => document.getElementById(id);

// Виртуальные часы: позволяют прогнать 5-минутную сессию ускоренно.
const clock = { speed: 1, virtual: Date.now(), lastReal: Date.now() };
function virtualNow() {
  const real = Date.now();
  clock.virtual += (real - clock.lastReal) * clock.speed;
  clock.lastReal = real;
  return Math.round(clock.virtual);
}

let emulatedLocale = ''; // пусто — язык браузера
const platform = createWebPlatform({
  now: virtualNow,
  onVibrate: showPulse,
  onSound: (name) => log(`♪ ${name}`),
  systemLocale: () => emulatedLocale || navigator.language || ''
});

let settings = normalizeSettings(platform.load(SETTINGS_KEY, null));
const tuning = { ...BALL, inhalePulseHz: DEFAULT_INHALE_PULSE_HZ, fps: 25 };

let session = null;
let pulseCount = 0;
const pulseLog = [];

let language = 'en';
let t = createTranslator(language);

function applyLanguage() {
  language = resolveLanguage(settings.language, platform.systemLocale());
  t = createTranslator(language);
  document.documentElement.lang = language;
  $('debug-lang').textContent = `система: ${platform.systemLocale() || '—'} → ${language}`;
}

// Применить новые настройки: сохранить и перерисовать текущий экран.
function apply(next) {
  if (next === settings) return;
  settings = next;
  platform.save(SETTINGS_KEY, settings);
  render();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ——— Навигация ———

const VIEWS = ['home', 'session', 'settings', 'language'];
let current = 'home';

function go(view) {
  current = view;
  for (const name of VIEWS) $('view-' + name).hidden = name !== view;
  if (view === 'settings' || view === 'language') $(view + '-rows').scrollTop = 0;
  render();
}

function render() {
  if (current === 'home') renderHome();
  else if (current === 'settings') renderSettings();
  else if (current === 'language') renderLanguage();
}

function goBack() {
  if (current === 'session' && session) {
    session.stop();
    session = null;
  }
  go(current === 'language' ? 'settings' : 'home');
}

// ——— Главный экран ———

function renderHome() {
  const grid = $('presets');
  grid.textContent = '';
  for (const preset of PRESETS) {
    const p = phasesFor(settings, preset.id);
    const card = el('button', 'card' + (preset.id === settings.presetId ? ' selected' : ''));
    card.append(el('b', '', t('preset.' + preset.id)), el('span', '', [p.inhale, p.holdIn, p.exhale, p.holdOut].join(' · ')));
    card.onclick = () => apply(updateSettings(settings, { presetId: preset.id }));
    grid.append(card);
  }
  $('open-settings').title = t('home.settings');
  $('open-settings').setAttribute('aria-label', t('home.settings'));
  $('vibro-toggle').textContent = t(settings.vibration ? 'home.vibrationOn' : 'home.vibrationOff');
  $('sound-toggle').textContent = t(settings.sound ? 'home.soundOn' : 'home.soundOff');
  const start = $('start');
  start.textContent = t('home.start');
  start.append(el('small', '', `${settings.sessionSec / 60} ${t('unit.min')}`));
}

function toggleSetting(key) {
  apply(updateSettings(settings, { [key]: !settings[key] }));
}

$('vibro-toggle').onclick = () => toggleSetting('vibration');
$('sound-toggle').onclick = () => toggleSetting('sound');
$('open-settings').onclick = () => go('settings');
$('start').onclick = startSession;

// ——— Настройки ———
// Порядок: общие настройки приложения сверху (язык виден сразу), ниже — фазы пресета «Своё».

const UNITS = { session: 'unit.min', inhale: 'unit.sec', holdIn: 'unit.sec', exhale: 'unit.sec', holdOut: 'unit.sec' };

function stepperRow(key) {
  const row = el('div', 'setting');
  const minus = el('button', '', '−');
  minus.onclick = () => apply(stepSetting(settings, key, -1));
  const plus = el('button', '', '+');
  plus.onclick = () => apply(stepSetting(settings, key, 1));
  row.append(
    el('span', 'label', t('settings.' + key)),
    minus,
    el('span', 'value', `${settingValue(settings, key)} ${t(UNITS[key])}`),
    plus
  );
  return row;
}

function toggleRow(key) {
  const row = el('button', 'setting setting-link');
  row.append(
    el('span', 'label', t('settings.' + key)),
    el('span', 'value', t(settings[key] ? 'common.on' : 'common.off')),
    el('span', 'switch' + (settings[key] ? ' on' : ''))
  );
  row.setAttribute('role', 'switch');
  row.setAttribute('aria-checked', String(settings[key]));
  row.onclick = () => toggleSetting(key);
  return row;
}

function languageRow() {
  const row = el('button', 'setting setting-link');
  const value = settings.language === AUTO_LANGUAGE ? t('language.auto') : languageName(settings.language);
  row.append(el('span', 'label', t('settings.language')), el('span', 'value', value), el('span', 'chevron', '›'));
  row.onclick = () => go('language');
  return row;
}

function renderSettings() {
  $('settings-title').textContent = t('settings.title');
  const rows = $('settings-rows');
  const scroll = rows.scrollTop;
  rows.textContent = '';
  rows.append(languageRow(), toggleRow('sound'), toggleRow('vibration'), stepperRow('session'));
  rows.append(el('div', 'section', t('settings.customSection')));
  for (const key of ['inhale', 'holdIn', 'exhale', 'holdOut']) rows.append(stepperRow(key));
  rows.scrollTop = scroll;
}

$('settings-back').onclick = () => go('home');

// ——— Выбор языка ———

function renderLanguage() {
  $('language-title').textContent = t('language.title');
  const rows = $('language-rows');
  rows.textContent = '';

  const options = [{ code: AUTO_LANGUAGE, name: t('language.auto'), sub: languageName(matchLocale(platform.systemLocale())) }]
    .concat(LANGUAGES);

  for (const option of options) {
    const selected = option.code === settings.language;
    const row = el('button', 'option' + (selected ? ' selected' : ''));
    row.append(el('span', '', option.name));
    if (option.sub) row.append(el('span', 'sub', option.sub));
    if (selected) row.append(el('span', 'check', '✓'));
    row.onclick = () => {
      settings = updateSettings(settings, { language: option.code });
      platform.save(SETTINGS_KEY, settings);
      applyLanguage();
      go('settings');
    };
    rows.append(row);
  }
}

$('language-back').onclick = () => go('settings');

// ——— Сессия ———

function startSession() {
  const config = toConfig(phasesFor(settings, settings.presetId), settings.sessionSec);
  pulseCount = 0;
  pulseLog.length = 0;
  $('pulse-count').textContent = '0';
  $('pulse-log').textContent = '';
  $('paused').textContent = t('session.paused');
  session = createSession(config, platform, {
    vibration: settings.vibration,
    sound: settings.sound,
    inhalePulseHz: tuning.inhalePulseHz,
    fps: tuning.fps,
    onFrame: renderFrame
  });
  go('session');
  session.start();
}

function renderFrame(state) {
  const ball = $('ball');
  ball.style.transform = `scale(${ballScale(state, tuning)})`;
  ball.dataset.phase = state.done ? 'done' : state.phase;
  $('phase-label').textContent = state.done ? t('session.done') : t('phase.' + state.phase);
  $('counter').textContent = state.done ? '✓' : state.paused ? 'II' : String(displaySecond(state));
  $('time-left').textContent = state.done ? `${formatClock(state.elapsed)} · ${t('session.cycles', { n: state.cyclesDone })}` : formatClock(state.sessionLeft);
  $('progress-fill').style.width = `${(state.progress01 * 100).toFixed(2)}%`;
  $('paused').hidden = !state.paused;
  $('debug-state').textContent =
    `цикл ${state.cycleIndex + 1} · ${state.phase}\n` +
    `фаза ${(state.phaseElapsed / 1000).toFixed(2)} / ${state.phaseDuration / 1000} с\n` +
    `сессия ${(state.elapsed / 1000).toFixed(1)} с`;
}

$('view-session').onclick = () => {
  const state = session && session.state();
  if (!state) return;
  if (state.done) return goBack();
  if (state.paused) session.resume();
  else session.pause();
};

$('back-button').onclick = goBack;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') goBack();
});

// ——— Отладка ———

function log(line) {
  const state = session && session.state();
  const at = state ? (state.elapsed / 1000).toFixed(2).padStart(7) : '';
  pulseLog.unshift(`${at} с  ${line}`);
  pulseLog.length = Math.min(pulseLog.length, 10);
  $('pulse-log').textContent = pulseLog.join('\n');
}

function showPulse(mode) {
  const dot = $('pulse-dot');
  dot.classList.remove('short', 'long', 'double');
  void dot.offsetWidth; // перезапуск CSS-анимации
  dot.classList.add(mode);

  pulseCount += 1;
  $('pulse-count').textContent = String(pulseCount);
  const state = session && session.state();
  log(`${mode.padEnd(5)} ${state ? state.phase : ''}`);
}

function bindRange(id, key, digits) {
  const input = $(id);
  const out = $(id + '-out');
  input.value = tuning[key];
  out.textContent = tuning[key].toFixed(digits);
  input.oninput = () => {
    tuning[key] = Number(input.value);
    out.textContent = tuning[key].toFixed(digits);
  };
}

bindRange('min', 'min', 2);
bindRange('amp', 'pulseAmp', 3);
bindRange('hz', 'inhalePulseHz', 1);

$('fps').onchange = (e) => {
  tuning.fps = Number(e.target.value);
};
$('speed').onchange = (e) => {
  virtualNow(); // зафиксировать прошедшее время на старой скорости
  clock.speed = Number(e.target.value);
};
$('system-locale').onchange = (e) => {
  emulatedLocale = e.target.value;
  applyLanguage();
  if (current !== 'session') render();
};

applyLanguage();
go('home');
