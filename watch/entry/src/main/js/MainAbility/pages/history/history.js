import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import device from '@system.device';
import { HISTORY_KEY, decodeHistory, formatDay } from '../../common/core/history.js';
import { formatClock } from '../../common/core/view.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { applyLayout, focusRotation, listLayout, loadSettings, navigate, setIfChanged, translatorFor, withScreen } from '../../common/watch.js';

// История «Серий»: по строке на тренировку, новые сверху — дата, лучшая и средняя задержка. Список — колёсиком.

var platform = null;
var settings = null;
var screen = null;

var page = {
    data: {
        settingsJson: '',
        screenJson: '',
        screenWidth: 408, screenHeight: 480,
        headWidth: 360, headTop: 24, titleWidth: 298,
        contentWidth: 360, listHeight: 368, switchLabelWidth: 280,
        backGlyph: '<',
        title: '',
        columns: '',
        rows: []
    },

    onInit: function () {
        platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        var vm = this;
        withScreen(vm, device, function (found) {
            screen = found;
            applyLayout(vm, listLayout(screen));
        });
        loadSettings(vm, platform, function (loaded) {
            settings = loaded;
            var t = translatorFor(platform, settings);
            setIfChanged(vm, 'title', t('series.history'));
            platform.load(HISTORY_KEY, '', function (raw) {
                var entries = decodeHistory(raw);
                var rows = [];
                for (var i = entries.length - 1; i >= 0; i--) {
                    rows.push({
                        day: formatDay(entries[i].day),
                        holds: formatClock(entries[i].best * 1000) + ' / ' + formatClock(entries[i].avg * 1000)
                    });
                }
                vm.rows = rows;
                vm.columns = rows.length ? t('stats.best') + ' / ' + t('stats.avg') : t('history.empty');
            });
        });
    },

    onShow: function () {
        focusRotation(this.$refs.list, true);
    },

    leave: function (target) {
        focusRotation(this.$refs.list, false);
        navigate(router, target, settings, screen);
    },

    goBack: function () {
        this.leave('series');
    },

    onSwipe: function (e) {
        if (e && e.direction === 'right') this.goBack();
    }
};

export default page;
