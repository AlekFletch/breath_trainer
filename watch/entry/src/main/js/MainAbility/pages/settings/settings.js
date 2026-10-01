import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import device from '@system.device';
import { AUTO_LANGUAGE, languageName } from '../../common/core/i18n.js';
import { settingValue, stepSetting, updateSettings } from '../../common/core/settings.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { applyLayout, focusRotation, listLayout, loadSettings, navigate, readScreen, saveSettings, setIfChanged, translatorFor, whenReady } from '../../common/watch.js';

// Настройки: язык, вибрация (вкл/выкл и сила: сильная или слабая ночная), длина сессии, фазы пресета «Своё». Список прокручивается колёсиком.
// Пункта «Звук» нет: на часах звук недоступен (см. src/platform/lite.js).

var STEP_FIELDS = [
    { key: 'session', unit: 'unit.min' },
    { key: 'inhale', unit: 'unit.sec' },
    { key: 'holdIn', unit: 'unit.sec' },
    { key: 'exhale', unit: 'unit.sec' },
    { key: 'holdOut', unit: 'unit.sec' }
];

var platform = null;
var settings = null;

var page = {
    data: {
        settingsJson: '',
        ready: false,
        screenWidth: 408, screenHeight: 480,
        headWidth: 360, headTop: 24, titleWidth: 298,
        contentWidth: 360, listHeight: 368, switchLabelWidth: 280,
        backGlyph: '<',
        title: '',
        languageLabel: '', languageValue: '',
        vibrationLabel: '', vibration: true,
        strengthLabel: '', strengthValue: '',
        customLabel: '',
        sessionLabel: '', sessionValue: '',
        inhaleLabel: '', inhaleValue: '',
        holdInLabel: '', holdInValue: '',
        exhaleLabel: '', exhaleValue: '',
        holdOutLabel: '', holdOutValue: ''
    },

    onInit: function () {
        platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        var vm = this;
        // Страница показывается, когда известны размер экрана и настройки: без перерисовок на запуске.
        var show = whenReady(2, function () {
            vm.ready = true;
        });
        readScreen(device, function (screen) {
            applyLayout(vm, listLayout(screen));
            show();
        });
        loadSettings(vm, platform, function (loaded) {
            settings = loaded;
            vm.refresh();
            show();
        });
    },

    onShow: function () {
        focusRotation(this.$refs.list, true);
    },

    onDestroy: function () {
    },

    leave: function (target) {
        focusRotation(this.$refs.list, false);
        navigate(router, target, settings);
    },

    refresh: function () {
        var t = translatorFor(platform, settings);
        setIfChanged(this, 'title', t('settings.title'));
        setIfChanged(this, 'languageLabel', t('settings.language'));
        setIfChanged(this, 'languageValue', settings.language === AUTO_LANGUAGE ? t('language.auto') : languageName(settings.language));
        setIfChanged(this, 'vibrationLabel', t('settings.vibration'));
        setIfChanged(this, 'vibration', settings.vibration);
        setIfChanged(this, 'strengthLabel', t('settings.vibrationStrength'));
        setIfChanged(this, 'strengthValue', t(settings.vibrationStrength === 'weak' ? 'settings.strengthWeak' : 'settings.strengthStrong'));
        setIfChanged(this, 'customLabel', t('settings.customSection'));
        for (var i = 0; i < STEP_FIELDS.length; i++) {
            var field = STEP_FIELDS[i];
            setIfChanged(this, field.key + 'Label', t('settings.' + field.key));
            setIfChanged(this, field.key + 'Value', settingValue(settings, field.key) + ' ' + t(field.unit));
        }
    },

    // Каждая правка сразу пишется в хранилище: кнопки «Сохранить» нет.
    apply: function (next) {
        if (next === settings) return;
        settings = next;
        saveSettings(platform, settings);
        this.refresh();
    },

    step: function (key, delta) {
        this.apply(stepSetting(settings, key, delta));
    },

    onVibrationChange: function (e) {
        var checked = e && typeof e.checked === 'boolean' ? e.checked : !settings.vibration;
        this.apply(updateSettings(settings, { vibration: checked }));
    },

    toggleStrength: function () {
        this.apply(updateSettings(settings, { vibrationStrength: settings.vibrationStrength === 'weak' ? 'strong' : 'weak' }));
    },

    openLanguage: function () {
        this.leave('language');
    },

    goBack: function () {
        this.leave('index');
    },

    onSwipe: function (e) {
        if (e && e.direction === 'right') this.goBack();
    }
};

// Обработчики «−/+» без аргументов: sessionMinus, sessionPlus, inhaleMinus, ...
function bindStep(key, delta) {
    return function () {
        this.step(key, delta);
    };
}
for (var f = 0; f < STEP_FIELDS.length; f++) {
    page[STEP_FIELDS[f].key + 'Minus'] = bindStep(STEP_FIELDS[f].key, -1);
    page[STEP_FIELDS[f].key + 'Plus'] = bindStep(STEP_FIELDS[f].key, 1);
}

export default page;
