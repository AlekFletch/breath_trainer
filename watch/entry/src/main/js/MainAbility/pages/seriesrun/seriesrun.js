import router from '@system.router';
import storage from '@system.storage';
import vibrator from '@system.vibrator';
import brightness from '@system.brightness';
import configuration from '@system.configuration';
import device from '@system.device';
import { createSeriesEngine } from '../../common/core/series.js';
import { createRunner } from '../../common/core/runner.js';
import { ballScale, formatClock } from '../../common/core/view.js';
import { normalizeSettings, seriesConfig } from '../../common/core/settings.js';
import { createLitePlatform } from '../../common/platform/lite.js';
import { navigate, setIfChanged, translatorFor, whenReady, withScreen } from '../../common/watch.js';

// Тренировка «Бутейко»: шарик, фаза, номер раунда, в центре — номер вдоха в серии, на задержке — секундомер,
// на расслаблении — оставшиеся секунды.
// Касание: на задержке после выдоха и на расслаблении — конец шага и переход к следующему;
// в остальное время — пауза / продолжение.
// Свайп вправо: если задержки уже были — итоги, иначе назад к «Бутейко».
// Итоги — отдельная страница seriesdone: разметка итогов и история здесь заняли бы память (куча JS — 100 КБ).

var RECT_BALL_DIAMETER = 340;
var ROUND_BALL_SHARE = 0.54;

var BALL_COLORS = {
    inhale: '#3cc9bb',
    relax: '#4fae8c',
    exhale: '#5b8ee0',
    holdOut: '#6f6fcf'
};

var platform = null;
var screen = null;
var ballDiameter = RECT_BALL_DIAMETER;
var starter = null;
var settings = null;
var session = null;
var t = null;

export default {
    data: {
        settingsJson: '',
        screenJson: '',
        screenWidth: 408, screenHeight: 480,
        phaseLeft: 28, phaseTop: 22, phaseWidth: 220, phaseAlign: 'left',
        timeLeft: 240, timeTop: 22, timeWidth: 140, timeAlign: 'right',
        counterTop: 200,
        pauseLeft: 175, pauseRight: 215, pauseTop: 208,
        progressLeft: 28, progressTop: 436, progressWidth: 352,
        hintLeft: 28, hintTop: 426, hintWidth: 352,
        ballColor: '#3cc9bb',
        ballSize: 153,
        ballRadius: 76,
        ballLeft: 128,
        ballTop: 164,
        running: false,
        counting: false,
        paused: false,
        holding: false,
        showProgress: false,
        phaseLabel: '',
        timeLabel: '',
        counter: '',
        percent: 0,
        hint: ''
    },

    onInit: function () {
        platform = createLitePlatform({ vibrator: vibrator, brightness: brightness, storage: storage, configuration: configuration });
        settings = normalizeSettings(this.settingsJson);
        t = translatorFor(platform, settings);
        this.hint = t('series.tapNext');
        var vm = this;
        starter = whenReady(2, function () {
            if (!session) return;
            vm.running = true;
            vm.counting = true;
            session.start();
        });
        withScreen(vm, device, function (found) {
            vm.placeLabels(found);
            starter();
        });

        session = createRunner(createSeriesEngine(seriesConfig(settings)), platform, {
            vibration: settings.vibration,
            vibrationStrength: settings.vibrationStrength,
            onFrame: function (state) {
                vm.renderFrame(state);
            }
        });
    },

    // Раскладка как на экране сессии; подсказка «коснитесь» — на месте полосы прогресса.
    placeLabels: function (s) {
        var cx = Math.round(s.width / 2);
        var cy = Math.round(s.height / 2);
        screen = { width: s.width, height: s.height, round: s.round };
        ballDiameter = s.round ? Math.round(Math.min(s.width, s.height) * ROUND_BALL_SHARE) : RECT_BALL_DIAMETER;
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
            this.hintLeft = cx - 130; this.hintTop = cy + 170; this.hintWidth = 260;
        } else {
            this.phaseLeft = 28; this.phaseTop = 22; this.phaseWidth = 220; this.phaseAlign = 'left';
            this.timeLeft = s.width - 168; this.timeTop = 22; this.timeWidth = 140; this.timeAlign = 'right';
            this.progressLeft = 28; this.progressTop = s.height - 44; this.progressWidth = s.width - 56;
            this.hintLeft = 28; this.hintTop = s.height - 54; this.hintWidth = s.width - 56;
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
            this.finish(state.holds);
            return;
        }
        var size = Math.round(ballDiameter * ballScale(state));
        setIfChanged(this, 'ballSize', size);
        setIfChanged(this, 'ballRadius', Math.floor(size / 2));
        setIfChanged(this, 'ballLeft', Math.round((screen.width - size) / 2));
        setIfChanged(this, 'ballTop', Math.round((screen.height - size) / 2));
        setIfChanged(this, 'ballColor', BALL_COLORS[state.phase]);
        setIfChanged(this, 'phaseLabel', t(state.paused ? 'session.paused' : state.phase === 'relax' ? 'series.relax' : 'phase.' + state.phase));
        setIfChanged(this, 'timeLabel', state.rounds ? state.round + '/' + state.rounds : String(state.round));
        var counter;
        var progress = 0;
        if (state.hold) {
            // Задержка «до касания» — секундомер вперёд, фиксированная — обратный отсчёт.
            counter = formatClock(state.open ? Math.floor(state.phaseElapsed / 1000) * 1000 : state.phaseDuration - state.phaseElapsed);
        } else if (state.breath) {
            counter = String(state.breath);
            progress = (state.breath - 1 + (state.phase === 'exhale' ? 0.5 : 0) + state.phaseProgress01 / 2) / state.breaths;
        } else {
            counter = String(Math.ceil((state.phaseDuration - state.phaseElapsed) / 1000));
            progress = state.phaseProgress01;
        }
        setIfChanged(this, 'counter', counter);
        setIfChanged(this, 'counting', !state.paused);
        setIfChanged(this, 'paused', state.paused);
        setIfChanged(this, 'holding', state.hold && !state.paused);
        setIfChanged(this, 'showProgress', !state.hold);
        setIfChanged(this, 'percent', Math.floor(progress * 100));
    },

    // Итоги — на своей странице; задержки передаются в мс через запятую.
    finish: function (holds) {
        if (!session) return;
        session.stop();
        session = null;
        navigate(router, 'seriesdone', settings, screen, { holds: holds.join(',') });
    },

    onTap: function () {
        var state = session && session.state();
        if (!state) {
            return;
        } else if ((state.hold || state.phase === 'relax') && !state.paused) {
            session.release();
        } else if (state.paused) {
            session.resume();
        } else {
            session.pause();
        }
    },

    onSwipe: function (e) {
        if (!e || e.direction !== 'right') return;
        var state = session && session.state();
        if (state && state.holds.length) this.finish(state.holds);
        else this.exit();
    },

    exit: function () {
        if (session) session.stop();
        session = null;
        navigate(router, 'series', settings, screen);
    }
};
