import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import { PRESETS } from '../../common/core/presets.js';
import { phasesFor, updateSettings } from '../../common/core/settings.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { loadSettings, navigate, saveSettings, setIfChanged, translatorFor } from '../../common/watch.js';

// Главный экран: четыре пресета, настройки, вибрация, старт.
// Выбранный пресет подсвечивается рамкой через style: привязка данных в class на Lite не поддерживается.

var BORDER_SELECTED = '#4fd1c5';
var BORDER_NORMAL = '#1b1e26';

var platform = null;
var settings = null;

export default {
    data: {
        settingsJson: '',
        card0Name: '', card0Phases: '', card0Border: BORDER_NORMAL,
        card1Name: '', card1Phases: '', card1Border: BORDER_NORMAL,
        card2Name: '', card2Phases: '', card2Border: BORDER_NORMAL,
        card3Name: '', card3Phases: '', card3Border: BORDER_NORMAL,
        settingsLabel: '',
        vibrationLabel: '',
        startLabel: ''
    },

    onInit: function () {
        platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        var vm = this;
        loadSettings(vm, platform, function (loaded) {
            settings = loaded;
            vm.refresh();
        });
    },

    refresh: function () {
        var t = translatorFor(platform, settings);
        for (var i = 0; i < PRESETS.length; i++) {
            var preset = PRESETS[i];
            var p = phasesFor(settings, preset.id);
            setIfChanged(this, 'card' + i + 'Name', t('preset.' + preset.id));
            setIfChanged(this, 'card' + i + 'Phases', p.inhale + ' · ' + p.holdIn + ' · ' + p.exhale + ' · ' + p.holdOut);
            setIfChanged(this, 'card' + i + 'Border', preset.id === settings.presetId ? BORDER_SELECTED : BORDER_NORMAL);
        }
        setIfChanged(this, 'settingsLabel', t('home.settings'));
        setIfChanged(this, 'vibrationLabel', t(settings.vibration ? 'home.vibrationOn' : 'home.vibrationOff'));
        setIfChanged(this, 'startLabel', t('home.start') + '  ' + settings.sessionSec / 60 + ' ' + t('unit.min'));
    },

    change: function (patch) {
        settings = updateSettings(settings, patch);
        saveSettings(platform, settings);
        this.refresh();
    },

    pick0: function () { this.change({ presetId: PRESETS[0].id }); },
    pick1: function () { this.change({ presetId: PRESETS[1].id }); },
    pick2: function () { this.change({ presetId: PRESETS[2].id }); },
    pick3: function () { this.change({ presetId: PRESETS[3].id }); },

    toggleVibration: function () {
        this.change({ vibration: !settings.vibration });
    },

    openSettings: function () {
        navigate(router, 'settings', settings);
    },

    start: function () {
        navigate(router, 'session', settings);
    }
};
