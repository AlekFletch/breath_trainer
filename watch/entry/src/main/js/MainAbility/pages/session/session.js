import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import device from '@system.device';
import { toConfig } from '../../common/core/presets.js';
import { createSession } from '../../common/core/session.js';
import { ballScale, displaySecond, formatClock } from '../../common/core/view.js';
import { normalizeSettings, phasesFor } from '../../common/core/settings.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { navigate, readScreen, setIfChanged, translatorFor, whenReady } from '../../common/watch.js';

// Экран сессии: шарик, фаза, секунда, оставшееся время, прогресс.
// Касание — пауза («II» вместо цифры) / продолжение цикла заново со вдоха.
// По завершении — итоги: время и число циклов; касание возвращает на главный экран.
// Свайп вправо — на главный экран.

// Прямоугольный экран 408 × 480: шарик с пульсацией (до 1.04) помещается по ширине с полями ~27 px.
// Круглый экран (454 или 466): шарик меньше, чтобы не задевать фазу сверху и время снизу (placeLabels).
var RECT_BALL_DIAMETER = 340;
var ROUND_BALL_SHARE = 0.54;
// Касание сразу после конца сессии — скорее всего, попытка поставить паузу, а не выход.
var EXIT_GUARD_MS = 1000;

// Цвет шарика по фазам — через style: привязка данных в class на Lite не поддерживается.
var BALL_COLORS = {
    inhale: '#3cc9bb',
    holdIn: '#3aa7c9',
    exhale: '#5b8ee0',
    holdOut: '#6f6fcf'
};

var screen = null;
var starter = null;
var settings = null;
var session = null;
var t = null;
var doneAt = 0;

export default {
    data: {
        settingsJson: '',
        screenWidth: 408, screenHeight: 480,
        phaseLeft: 28, phaseTop: 22, phaseWidth: 220, phaseAlign: 'left',
        timeLeft: 240, timeTop: 22, timeWidth: 140, timeAlign: 'right',
        counterTop: 200,
        pauseLeft: 175, pauseRight: 215, pauseTop: 208,
        progressLeft: 28, progressTop: 436, progressWidth: 352,
        ballColor: '#3cc9bb',
        ballSize: 153,
        ballRadius: 76,
        ballLeft: 128,
        ballTop: 164,
        running: false,
        counting: false,
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
        backHint: ''
    },

    onInit: function () {
        var platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        settings = normalizeSettings(this.settingsJson);
        t = translatorFor(platform, settings);
        doneAt = 0;
        this.doneLabel = t('session.done');
        this.statsTimeLabel = t('stats.time');
        this.statsCyclesLabel = t('stats.cycles');
        this.backHint = t('stats.backHint');
        var vm = this;
        // Сессия стартует и рисуется, когда известен размер экрана и страница готова: без перерисовок на запуске.
        starter = whenReady(2, function () {
            if (!session) return;
            vm.running = true;
            vm.counting = true;
            session.start();
        });
        readScreen(device, function (found) {
            vm.placeLabels(found);
            starter();
        });

        session = createSession(toConfig(phasesFor(settings, settings.presetId), settings.sessionSec), platform, {
            vibration: settings.vibration,
            vibrationStrength: settings.vibrationStrength,
            sound: settings.sound,
            onFrame: function (state) {
                vm.renderFrame(state);
            }
        });
    },

    // Положение подписей по экрану: на прямоугольном фаза и время сверху по краям, прогресс снизу;
    // на круглом углов нет — фаза сверху по центру, время и прогресс снизу по центру.
    placeLabels: function (s) {
        var cx = Math.round(s.width / 2);
        var cy = Math.round(s.height / 2);
        screen = {
            width: s.width,
            height: s.height,
            round: s.round,
            ballDiameter: s.round ? Math.round(Math.min(s.width, s.height) * ROUND_BALL_SHARE) : RECT_BALL_DIAMETER
        };
        this.screenWidth = s.width;
        this.screenHeight = s.height;
        this.counterTop = cy - 40;
        this.pauseTop = cy - 32;
        this.pauseLeft = cx - 29;
        this.pauseRight = cx + 11;
        if (s.round) {
            this.phaseLeft = cx - 120; this.phaseTop = cy - 191; this.phaseWidth = 240; this.phaseAlign = 'center';
            this.timeLeft = cx - 100; this.timeTop = cy + 135; this.timeWidth = 200; this.timeAlign = 'center';
            this.progressLeft = cx - 90; this.progressTop = cy + 181; this.progressWidth = 180;
        } else {
            this.phaseLeft = 28; this.phaseTop = 22; this.phaseWidth = 220; this.phaseAlign = 'left';
            this.timeLeft = s.width - 168; this.timeTop = 22; this.timeWidth = 140; this.timeAlign = 'right';
            this.progressLeft = 28; this.progressTop = s.height - 44; this.progressWidth = s.width - 56;
        }
    },

    onReady: function () {
        if (starter) starter();
    },

    onDestroy: function () {
        if (session) session.stop();
        session = null;
        starter = null;
    },

    renderFrame: function (state) {
        if (state.done) {
            this.renderStats(state);
            return;
        }
        var size = Math.round(screen.ballDiameter * ballScale(state));
        setIfChanged(this, 'ballSize', size);
        setIfChanged(this, 'ballRadius', Math.floor(size / 2));
        setIfChanged(this, 'ballLeft', Math.round((screen.width - size) / 2));
        setIfChanged(this, 'ballTop', Math.round((screen.height - size) / 2));
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
            if (new Date().getTime() - doneAt >= EXIT_GUARD_MS) this.exit();
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
    }
};

