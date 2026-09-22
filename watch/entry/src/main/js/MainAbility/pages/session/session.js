import app from '@system.app';
import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import { toConfig } from '../../common/core/presets.js';
import { createSession } from '../../common/core/session.js';
import { ballScale, displaySecond, formatClock } from '../../common/core/view.js';
import { normalizeSettings, phasesFor } from '../../common/core/settings.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { navigate, setIfChanged, translatorFor } from '../../common/watch.js';

// Экран сессии: шарик, фаза, секунда, оставшееся время, прогресс.
// Касание — пауза («II» вместо цифры) / продолжение цикла заново со вдоха.
// По завершении — итоги: время и число циклов; касание закрывает приложение.
// Свайп вправо — на главный экран.

// Экран вертикальный, 408 × 480: шарик с пульсацией (до 1.04) помещается по ширине с полями ~27 px.
var BALL_DIAMETER = 340;
var SCREEN_WIDTH = 408;
var SCREEN_HEIGHT = 480;
// Касание сразу после конца сессии — скорее всего, попытка поставить паузу, а не выход.
var EXIT_GUARD_MS = 1000;

// Цвет шарика по фазам — через style: привязка данных в class на Lite не поддерживается.
var BALL_COLORS = {
    inhale: '#3cc9bb',
    holdIn: '#3aa7c9',
    exhale: '#5b8ee0',
    holdOut: '#6f6fcf'
};

var settings = null;
var session = null;
var t = null;
var doneAt = 0;

export default {
    data: {
        settingsJson: '',
        ballColor: '#3cc9bb',
        ballSize: 153,
        ballRadius: 76,
        ballLeft: 128,
        ballTop: 164,
        running: true,
        counting: true,
        paused: false,
        done: false,
        phaseLabel: '',
        timeLabel: '',
        counter: '',
        percent: 0,
        doneLabel: '',
        statsTime: '',
        statsTimeLabel: '',
        statsCycles: '',
        statsCyclesLabel: '',
        exitHint: ''
    },

    onInit: function () {
        var platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        settings = normalizeSettings(this.settingsJson);
        t = translatorFor(platform, settings);
        doneAt = 0;
        this.doneLabel = t('session.done');
        this.statsTimeLabel = t('stats.time');
        this.statsCyclesLabel = t('stats.cycles');
        this.exitHint = t('stats.exitHint');

        var vm = this;
        session = createSession(toConfig(phasesFor(settings, settings.presetId), settings.sessionSec), platform, {
            vibration: settings.vibration,
            sound: settings.sound,
            onFrame: function (state) {
                vm.renderFrame(state);
            }
        });
    },

    onReady: function () {
        if (session) session.start();
    },

    onDestroy: function () {
        if (session) session.stop();
        session = null;
    },

    renderFrame: function (state) {
        if (state.done) {
            this.renderStats(state);
            return;
        }
        var size = Math.round(BALL_DIAMETER * ballScale(state));
        setIfChanged(this, 'ballSize', size);
        setIfChanged(this, 'ballRadius', Math.floor(size / 2));
        setIfChanged(this, 'ballLeft', Math.round((SCREEN_WIDTH - size) / 2));
        setIfChanged(this, 'ballTop', Math.round((SCREEN_HEIGHT - size) / 2));
        setIfChanged(this, 'ballColor', BALL_COLORS[state.phase]);
        setIfChanged(this, 'phaseLabel', t(state.paused ? 'session.paused' : 'phase.' + state.phase));
        setIfChanged(this, 'timeLabel', formatClock(state.sessionLeft));
        setIfChanged(this, 'counter', String(displaySecond(state)));
        setIfChanged(this, 'counting', !state.paused);
        setIfChanged(this, 'paused', state.paused);
        setIfChanged(this, 'percent', Math.floor(state.progress01 * 100));
    },

    renderStats: function (state) {
        if (this.done) return;
        doneAt = new Date().getTime();
        this.statsTime = formatClock(state.elapsed);
        this.statsCycles = String(state.cyclesDone);
        this.running = false;
        this.counting = false;
        this.paused = false;
        this.done = true;
    },

    onTap: function () {
        var state = session && session.state();
        if (this.done) {
            if (new Date().getTime() - doneAt >= EXIT_GUARD_MS) this.quit();
        } else if (!state) {
            return;
        } else if (state.paused) {
            session.resume();
        } else {
            session.pause();
        }
    },

    onSwipe: function (e) {
        if (e && e.direction === 'right') this.exit();
    },

    exit: function () {
        if (session) session.stop();
        session = null;
        navigate(router, 'index', settings);
    },

    // Закрыть приложение; если система не даёт — хотя бы вернуться на главный.
    quit: function () {
        if (session) session.stop();
        session = null;
        try {
            app.terminate();
        } catch (e) {
            navigate(router, 'index', settings);
        }
    }
};
