// Копия src/core/history.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// История тренировок «Бутейко»: по записи на тренировку — день, лучшая и средняя задержка (секунды).
// Хранилище часов принимает значение не длиннее 128 байт (см. lite.js), поэтому запись — 7 символов
// в base36: день (3 — дни от 1970 года по местному времени) + лучшая (2) + средняя (2), записи через запятую,
// новые в конце. Хранится MAX_ENTRIES последних: 14 × 8 − 1 = 111 символов вместе с запятыми.

export var HISTORY_KEY = 'breath.history';
export var MAX_ENTRIES = 14;
var DAY_MS = 24 * 60 * 60 * 1000;
var MAX_SEC = 36 * 36 - 1;

function pad36(value, width) {
  var text = value.toString(36);
  while (text.length < width) text = '0' + text;
  return text;
}

function clampSec(sec) {
  return Math.max(0, Math.min(MAX_SEC, Math.round(sec)));
}

// Номер дня по местному времени: offsetMin — Date.getTimezoneOffset() (минуты, к UTC).
export function dayIndex(ms, offsetMin) {
  return Math.floor((ms - (offsetMin || 0) * 60000) / DAY_MS);
}

// «дд.мм» для номера дня.
export function formatDay(day) {
  var date = new Date(day * DAY_MS);
  var d = date.getUTCDate();
  var m = date.getUTCMonth() + 1;
  return (d < 10 ? '0' : '') + d + '.' + (m < 10 ? '0' : '') + m;
}

// Строка из хранилища → [{ day, best, avg }], старые первыми. Испорченные записи пропускаются.
export function decodeHistory(text) {
  var out = [];
  if (typeof text !== 'string' || text === '') return out;
  var parts = text.split(',');
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p.length !== 7) continue;
    var day = parseInt(p.substring(0, 3), 36);
    var best = parseInt(p.substring(3, 5), 36);
    var avg = parseInt(p.substring(5, 7), 36);
    if (isNaN(day) || isNaN(best) || isNaN(avg)) continue;
    out.push({ day: day, best: best, avg: avg });
  }
  return out;
}

export function encodeHistory(entries) {
  var from = Math.max(0, entries.length - MAX_ENTRIES);
  var parts = [];
  for (var i = from; i < entries.length; i++) {
    var e = entries[i];
    parts.push(pad36(e.day, 3) + pad36(clampSec(e.best), 2) + pad36(clampSec(e.avg), 2));
  }
  return parts.join(',');
}

// Новая история с добавленной тренировкой; самые старые отбрасываются сверх MAX_ENTRIES.
export function addEntry(entries, entry) {
  var next = entries.concat([{ day: entry.day, best: clampSec(entry.best), avg: clampSec(entry.avg) }]);
  return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
}

// Лучшая задержка за всю сохранённую историю, секунды; 0 — истории нет.
export function bestEver(entries) {
  var best = 0;
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].best > best) best = entries[i].best;
  }
  return best;
}

// Итоги задержек в целых секундах: { count, best, avg }.
export function summarizeHolds(holds) {
  var best = 0;
  var total = 0;
  for (var i = 0; i < holds.length; i++) {
    var sec = Math.round(holds[i] / 1000);
    if (sec > best) best = sec;
    total += sec;
  }
  return { count: holds.length, best: best, avg: holds.length ? Math.round(total / holds.length) : 0 };
}
