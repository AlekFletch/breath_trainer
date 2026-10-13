import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import device from '@system.device';
import { resolveLanguage } from '../../common/core/i18n.js';
import { SERIES_FIELDS, stepSeries } from '../../common/core/settings.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { applyLayout, focusRotation, listLayout, loadSettings, navigate, saveSettings, setIfChanged, translatorFor, withScreen } from '../../common/watch.js';

// «Бутейко»: старт, параметры тренировки и история задержек. Список прокручивается колёсиком.
// Раунд: N коротких вдохов-выдохов → задержка после выдоха → расслабление (см. series.js).

var LABEL_KEYS = {
    breaths: 'series.breaths',
    inhale: 'settings.inhale',
    exhale: 'settings.exhale',
    hold: 'settings.holdOut',
    relax: 'series.relax',
    rounds: 'series.rounds'
};

var platform = null;
var settings = null;
var screen = null;

// Десятые доли секунды → «1,5» (в английском и китайском — «1.5»).
function tenths(value, language) {
    var whole = Math.floor(value / 10);
    var rest = value % 10;
    if (!rest) return String(whole);
    return whole + (language === 'en' || language === 'zh' ? '.' : ',') + rest;
}

var page = {
    data: {
        settingsJson: '',
        screenJson: '',
        screenWidth: 408, screenHeight: 480,
        headWidth: 360, headTop: 24, titleWidth: 298,
        contentWidth: 360, listHeight: 368, switchLabelWidth: 280,
        backGlyph: '<',
        title: '',
        startLabel: '',
        historyLabel: '',
        breathsLabel: '', breathsValue: '',
        inhaleLabel: '', inhaleValue: '',
        exhaleLabel: '', exhaleValue: '',
        holdLabel: '', holdValue: '',
        relaxLabel: '', relaxValue: '',
        roundsLabel: '', roundsValue: ''
    },

    onInit: function () {
        platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        var vm = this;
        // Как в настройках: экран и настройки из параметров перехода применяются до первой отрисовки,
        // список виден сразу и получает фокус колёсика в onShow.
        withScreen(vm, device, function (found) {
            screen = found;
            applyLayout(vm, listLayout(screen));
        });
        loadSettings(vm, platform, function (loaded) {
            settings = loaded;
            vm.refresh();
        });
    },

    onShow: function () {
        focusRotation(this.$refs.list, true);
    },

    leave: function (target) {
        focusRotation(this.$refs.list, false);
        navigate(router, target, settings, screen);
    },

    refresh: function () {
        var t = translatorFor(platform, settings);
        var language = resolveLanguage(settings.language, platform.systemLocale());
        var s = settings.series;
        var sec = ' ' + t('unit.sec');
        setIfChanged(this, 'title', t('home.series'));
        setIfChanged(this, 'startLabel', t('home.start'));
        setIfChanged(this, 'historyLabel', t('series.history'));
        for (var i = 0; i < SERIES_FIELDS.length; i++) {
            setIfChanged(this, SERIES_FIELDS[i] + 'Label', t(LABEL_KEYS[SERIES_FIELDS[i]]));
        }
        setIfChanged(this, 'breathsValue', String(s.breaths));
        setIfChanged(this, 'inhaleValue', tenths(s.inhale, language) + sec);
        setIfChanged(this, 'exhaleValue', tenths(s.exhale, language) + sec);
        setIfChanged(this, 'holdValue', s.hold ? s.hold + sec : t('series.untilTap'));
        setIfChanged(this, 'relaxValue', s.relax ? s.relax + sec : t('common.off'));
        setIfChanged(this, 'roundsValue', s.rounds ? String(s.rounds) : t('series.unlimited'));
    },

    // Каждая правка сразу пишется в хранилище, как в настройках.
    step: function (key, delta) {
        var next = stepSeries(settings, key, delta);
        if (next === settings) return;
        settings = next;
        saveSettings(platform, settings);
        this.refresh();
    },

    start: function () {
        this.leave('seriesrun');
    },

    openHistory: function () {
        this.leave('history');
    },

    goBack: function () {
        this.leave('index');
    },

    onSwipe: function (e) {
        if (e && e.direction === 'right') this.goBack();
    }
};

// Обработчики «−/+» без аргументов: breathsMinus, breathsPlus, inhaleMinus, ...
function bindStep(key, delta) {
    return function () {
        this.step(key, delta);
    };
}
for (var f = 0; f < SERIES_FIELDS.length; f++) {
    page[SERIES_FIELDS[f] + 'Minus'] = bindStep(SERIES_FIELDS[f], -1);
    page[SERIES_FIELDS[f] + 'Plus'] = bindStep(SERIES_FIELDS[f], 1);
}

export default page;
