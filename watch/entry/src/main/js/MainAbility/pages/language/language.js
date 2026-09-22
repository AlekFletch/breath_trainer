import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import { AUTO_LANGUAGE, LANGUAGES, languageName, matchLocale } from '../../common/core/i18n.js';
import { updateSettings } from '../../common/core/settings.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { focusRotation, loadSettings, navigate, saveSettings, setIfChanged, translatorFor } from '../../common/watch.js';

// Выбор языка: «Как в системе» и шесть языков. Выбор сохраняется и возвращает в настройки.
// Выбранный пункт подсвечивается цветом через style: привязка данных в class на Lite не поддерживается.

var COLOR_SELECTED = '#4fd1c5';
var COLOR_NORMAL = '#e8eaf0';

var platform = null;
var settings = null;
var OPTION_CODES = [AUTO_LANGUAGE].concat(LANGUAGES.map(function (language) {
    return language.code;
}));

var page = {
    data: {
        settingsJson: '',
        backGlyph: '<',
        title: '',
        option0Name: '', option0Sub: '', option0Color: COLOR_NORMAL, option0Selected: false,
        option1Name: '', option1Color: COLOR_NORMAL, option1Selected: false,
        option2Name: '', option2Color: COLOR_NORMAL, option2Selected: false,
        option3Name: '', option3Color: COLOR_NORMAL, option3Selected: false,
        option4Name: '', option4Color: COLOR_NORMAL, option4Selected: false,
        option5Name: '', option5Color: COLOR_NORMAL, option5Selected: false,
        option6Name: '', option6Color: COLOR_NORMAL, option6Selected: false
    },

    onInit: function () {
        platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        var vm = this;
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
        navigate(router, target, settings);
    },

    refresh: function () {
        var t = translatorFor(platform, settings);
        setIfChanged(this, 'title', t('language.title'));
        for (var i = 0; i < OPTION_CODES.length; i++) {
            var code = OPTION_CODES[i];
            var selected = code === settings.language;
            setIfChanged(this, 'option' + i + 'Name', code === AUTO_LANGUAGE ? t('language.auto') : languageName(code));
            setIfChanged(this, 'option' + i + 'Color', selected ? COLOR_SELECTED : COLOR_NORMAL);
            setIfChanged(this, 'option' + i + 'Selected', selected);
        }
        setIfChanged(this, 'option0Sub', languageName(matchLocale(platform.systemLocale())));
    },

    pick: function (index) {
        settings = updateSettings(settings, { language: OPTION_CODES[index] });
        saveSettings(platform, settings);
        this.leave('settings');
    },

    goBack: function () {
        this.leave('settings');
    },

    onSwipe: function (e) {
        if (e && e.direction === 'right') this.goBack();
    }
};

function bindPick(index) {
    return function () {
        this.pick(index);
    };
}
for (var i = 0; i < OPTION_CODES.length; i++) {
    page['pick' + i] = bindPick(i);
}

export default page;
