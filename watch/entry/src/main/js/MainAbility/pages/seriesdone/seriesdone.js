import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import device from '@system.device';
import { HISTORY_KEY, addEntry, bestEver, dayIndex, decodeHistory, encodeHistory, summarizeHolds } from '../../common/core/history.js';
import { formatClock } from '../../common/core/view.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { loadSettings, navigate, translatorFor, withScreen } from '../../common/watch.js';

// Итоги «Серий»: лучшая и средняя задержка, первые задержки по порядку; тренировка добавляется в историю.
// Задержки приходят в параметре перехода holds — миллисекунды через запятую. Касание или свайп — к «Сериям».

// Касание сразу после конца тренировки — скорее всего, касание, задуманное для задержки, а не выход.
var EXIT_GUARD_MS = 1000;
// Сколько ждать ответа хранилища перед уходом: колбэк записи после перехода держит старую страницу в памяти.
var SAVE_WAIT_MS = 500;
// Сколько задержек перечислять — больше не помещается в строку. Секунды везде округляются, как в summarizeHolds.
var HOLDS_SHOWN = 4;

var platform = null;
var settings = null;
var screen = null;
var shownAt = 0;
var saving = false;
var exitTimer = null;

export default {
    data: {
        settingsJson: '',
        screenJson: '',
        holds: '',
        screenWidth: 408, screenHeight: 480,
        doneLabel: '',
        statsBest: '',
        statsBestLabel: '',
        statsAvg: '',
        statsAvgLabel: '',
        statsHolds: '',
        backHint: ''
    },

    onInit: function () {
        platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        shownAt = new Date().getTime();
        saving = false;
        exitTimer = null;
        var vm = this;
        withScreen(vm, device, function (found) {
            screen = found;
            vm.screenWidth = found.width;
            vm.screenHeight = found.height;
        });
        loadSettings(vm, platform, function (loaded) {
            settings = loaded;
            var t = translatorFor(platform, settings);
            var holds = vm.holds ? vm.holds.split(',').map(Number) : [];
            var sum = summarizeHolds(holds);
            var shown = [];
            for (var i = 0; i < holds.length && i < HOLDS_SHOWN; i++) shown.push(formatClock(Math.round(holds[i] / 1000) * 1000));
            vm.doneLabel = t('session.done');
            vm.statsBestLabel = t('stats.best');
            vm.statsAvgLabel = t('stats.avg');
            vm.backHint = t('stats.backHint');
            vm.statsBest = formatClock(sum.best * 1000);
            vm.statsAvg = formatClock(sum.avg * 1000);
            vm.statsHolds = shown.join('  ') + (holds.length > HOLDS_SHOWN ? '  ...' : '');
            if (sum.count) vm.saveHistory(sum, t('stats.record'));
        });
    },

    onDestroy: function () {
        if (exitTimer) clearTimeout(exitTimer);
        exitTimer = null;
    },

    // Запись в историю; если лучшая задержка — рекорд среди сохранённых тренировок, это пишется в итогах.
    saveHistory: function (sum, recordLabel) {
        var vm = this;
        saving = true;
        function saved() {
            if (!saving) return;
            saving = false;
            if (exitTimer) vm.exit();
        }
        platform.load(HISTORY_KEY, '', function (raw) {
            var entries = decodeHistory(raw);
            if (entries.length && sum.best > bestEver(entries)) vm.statsHolds = recordLabel + '  ' + vm.statsHolds;
            var now = new Date();
            entries = addEntry(entries, { day: dayIndex(now.getTime(), now.getTimezoneOffset()), best: sum.best, avg: sum.avg });
            platform.save(HISTORY_KEY, encodeHistory(entries), saved);
        });
    },

    onTap: function () {
        if (new Date().getTime() - shownAt >= EXIT_GUARD_MS) this.exit();
    },

    onSwipe: function (e) {
        if (e && e.direction === 'right') this.exit();
    },

    // Пока история пишется, уход откладывается до ответа хранилища, но не дольше SAVE_WAIT_MS.
    exit: function () {
        var vm = this;
        if (saving) {
            if (!exitTimer) {
                exitTimer = setTimeout(function () {
                    saving = false;
                    vm.exit();
                }, SAVE_WAIT_MS);
            }
            return;
        }
        if (exitTimer) clearTimeout(exitTimer);
        exitTimer = null;
        navigate(router, 'series', settings, screen);
    }
};
