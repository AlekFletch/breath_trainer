// Копия src/core/i18n.js. Не редактировать: правьте исходник и запустите npm run sync:watch
// Локализация интерфейса. Общая для прототипа и часов: стандартный $t в ArkUI.Lite
// всегда следует языку системы и не умеет переключаться внутри приложения.
//
// Настройка языка — 'auto' или код из LANGUAGES. При 'auto' берётся язык системы,
// а если он не поддержан — английский.

export var AUTO_LANGUAGE = 'auto';
export var DEFAULT_LANGUAGE = 'en';

// Названия языков — на самих языках, чтобы свой язык узнавался при любом текущем.
export var LANGUAGES = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'zh', name: '中文' }
];

export var STRINGS = {
  ru: {
    'phase.inhale': 'Вдох',
    'phase.holdIn': 'Задержка',
    'phase.exhale': 'Выдох',
    'phase.holdOut': 'Задержка',
    'preset.478': '4-7-8',
    'preset.box': 'Квадрат',
    'preset.relax': 'Расслабление',
    'preset.custom': 'Своё',
    'home.settings': 'Настройки',
    'home.vibrationOn': 'Вибро: вкл',
    'home.vibrationOff': 'Вибро: выкл',
    'home.start': 'Старт',
    'unit.sec': 'с',
    'unit.min': 'мин',
    'settings.title': 'Настройки',
    'settings.inhale': 'Вдох',
    'settings.holdIn': 'Задержка (вдох)',
    'settings.exhale': 'Выдох',
    'settings.holdOut': 'Задержка (выдох)',
    'settings.session': 'Сессия',
    'settings.language': 'Язык',
    'language.title': 'Язык',
    'language.auto': 'Как в системе',
    'session.paused': 'Пауза',
    'session.done': 'Готово',
    'session.cycles': 'Циклов: {n}',
    'stats.time': 'Время',
    'stats.cycles': 'Циклы',
    'stats.exitHint': 'Коснитесь, чтобы выйти',
    'home.soundOn': 'Звук: вкл',
    'home.soundOff': 'Звук: выкл',
    'settings.sound': 'Звук',
    'settings.vibration': 'Вибрация',
    'settings.customSection': 'Своё дыхание',
    'settings.save': 'Сохранить',
    'settings.saved': 'Сохранено',
    'settings.saveFailed': 'Не сохранено',
    'common.on': 'Вкл',
    'common.off': 'Выкл'
  },
  en: {
    'phase.inhale': 'Inhale',
    'phase.holdIn': 'Hold',
    'phase.exhale': 'Exhale',
    'phase.holdOut': 'Hold',
    'preset.478': '4-7-8',
    'preset.box': 'Box',
    'preset.relax': 'Relax',
    'preset.custom': 'Custom',
    'home.settings': 'Settings',
    'home.vibrationOn': 'Vibration: on',
    'home.vibrationOff': 'Vibration: off',
    'home.start': 'Start',
    'unit.sec': 's',
    'unit.min': 'min',
    'settings.title': 'Settings',
    'settings.inhale': 'Inhale',
    'settings.holdIn': 'Hold (full)',
    'settings.exhale': 'Exhale',
    'settings.holdOut': 'Hold (empty)',
    'settings.session': 'Session',
    'settings.language': 'Language',
    'language.title': 'Language',
    'language.auto': 'System default',
    'session.paused': 'Paused',
    'session.done': 'Done',
    'session.cycles': 'Cycles: {n}',
    'stats.time': 'Time',
    'stats.cycles': 'Cycles',
    'stats.exitHint': 'Tap to exit',
    'home.soundOn': 'Sound: on',
    'home.soundOff': 'Sound: off',
    'settings.sound': 'Sound',
    'settings.vibration': 'Vibration',
    'settings.customSection': 'Custom breathing',
    'settings.save': 'Save',
    'settings.saved': 'Saved',
    'settings.saveFailed': 'Not saved',
    'common.on': 'On',
    'common.off': 'Off'
  },
  es: {
    'phase.inhale': 'Inhalar',
    'phase.holdIn': 'Retener',
    'phase.exhale': 'Exhalar',
    'phase.holdOut': 'Retener',
    'preset.478': '4-7-8',
    'preset.box': 'Cuadrada',
    'preset.relax': 'Relajación',
    'preset.custom': 'Personalizado',
    'home.settings': 'Ajustes',
    'home.vibrationOn': 'Vibración: sí',
    'home.vibrationOff': 'Vibración: no',
    'home.start': 'Iniciar',
    'unit.sec': 's',
    'unit.min': 'min',
    'settings.title': 'Ajustes',
    'settings.inhale': 'Inhalar',
    'settings.holdIn': 'Retener (lleno)',
    'settings.exhale': 'Exhalar',
    'settings.holdOut': 'Retener (vacío)',
    'settings.session': 'Sesión',
    'settings.language': 'Idioma',
    'language.title': 'Idioma',
    'language.auto': 'Como el sistema',
    'session.paused': 'En pausa',
    'session.done': 'Listo',
    'session.cycles': 'Ciclos: {n}',
    'stats.time': 'Tiempo',
    'stats.cycles': 'Ciclos',
    'stats.exitHint': 'Toca para salir',
    'home.soundOn': 'Sonido: sí',
    'home.soundOff': 'Sonido: no',
    'settings.sound': 'Sonido',
    'settings.vibration': 'Vibración',
    'settings.customSection': 'Respiración personalizada',
    'settings.save': 'Guardar',
    'settings.saved': 'Guardado',
    'settings.saveFailed': 'No guardado',
    'common.on': 'Sí',
    'common.off': 'No'
  },
  de: {
    'phase.inhale': 'Einatmen',
    'phase.holdIn': 'Halten',
    'phase.exhale': 'Ausatmen',
    'phase.holdOut': 'Halten',
    'preset.478': '4-7-8',
    'preset.box': 'Quadrat',
    'preset.relax': 'Entspannung',
    'preset.custom': 'Eigene',
    'home.settings': 'Einstellungen',
    'home.vibrationOn': 'Vibration: an',
    'home.vibrationOff': 'Vibration: aus',
    'home.start': 'Start',
    'unit.sec': 's',
    'unit.min': 'min',
    'settings.title': 'Einstellungen',
    'settings.inhale': 'Einatmen',
    'settings.holdIn': 'Halten (voll)',
    'settings.exhale': 'Ausatmen',
    'settings.holdOut': 'Halten (leer)',
    'settings.session': 'Sitzung',
    'settings.language': 'Sprache',
    'language.title': 'Sprache',
    'language.auto': 'Wie im System',
    'session.paused': 'Pausiert',
    'session.done': 'Fertig',
    'session.cycles': 'Zyklen: {n}',
    'stats.time': 'Zeit',
    'stats.cycles': 'Zyklen',
    'stats.exitHint': 'Tippen zum Beenden',
    'home.soundOn': 'Ton: an',
    'home.soundOff': 'Ton: aus',
    'settings.sound': 'Ton',
    'settings.vibration': 'Vibration',
    'settings.customSection': 'Eigene Atmung',
    'settings.save': 'Speichern',
    'settings.saved': 'Gespeichert',
    'settings.saveFailed': 'Nicht gespeichert',
    'common.on': 'An',
    'common.off': 'Aus'
  },
  fr: {
    'phase.inhale': 'Inspirer',
    'phase.holdIn': 'Retenir',
    'phase.exhale': 'Expirer',
    'phase.holdOut': 'Retenir',
    'preset.478': '4-7-8',
    'preset.box': 'Carrée',
    'preset.relax': 'Détente',
    'preset.custom': 'Personnalisé',
    'home.settings': 'Réglages',
    'home.vibrationOn': 'Vibration : oui',
    'home.vibrationOff': 'Vibration : non',
    'home.start': 'Démarrer',
    'unit.sec': 's',
    'unit.min': 'min',
    'settings.title': 'Réglages',
    'settings.inhale': 'Inspirer',
    'settings.holdIn': 'Retenir (plein)',
    'settings.exhale': 'Expirer',
    'settings.holdOut': 'Retenir (vide)',
    'settings.session': 'Séance',
    'settings.language': 'Langue',
    'language.title': 'Langue',
    'language.auto': 'Comme le système',
    'session.paused': 'En pause',
    'session.done': 'Terminé',
    'session.cycles': 'Cycles : {n}',
    'stats.time': 'Temps',
    'stats.cycles': 'Cycles',
    'stats.exitHint': 'Touchez pour quitter',
    'home.soundOn': 'Son : oui',
    'home.soundOff': 'Son : non',
    'settings.sound': 'Son',
    'settings.vibration': 'Vibration',
    'settings.customSection': 'Respiration personnalisée',
    'settings.save': 'Enregistrer',
    'settings.saved': 'Enregistré',
    'settings.saveFailed': 'Non enregistré',
    'common.on': 'Oui',
    'common.off': 'Non'
  },
  zh: {
    'phase.inhale': '吸气',
    'phase.holdIn': '屏息',
    'phase.exhale': '呼气',
    'phase.holdOut': '屏息',
    'preset.478': '4-7-8',
    'preset.box': '箱式',
    'preset.relax': '放松',
    'preset.custom': '自定义',
    'home.settings': '设置',
    'home.vibrationOn': '振动：开',
    'home.vibrationOff': '振动：关',
    'home.start': '开始',
    'unit.sec': '秒',
    'unit.min': '分钟',
    'settings.title': '设置',
    'settings.inhale': '吸气',
    'settings.holdIn': '屏息（吸气后）',
    'settings.exhale': '呼气',
    'settings.holdOut': '屏息（呼气后）',
    'settings.session': '时长',
    'settings.language': '语言',
    'language.title': '语言',
    'language.auto': '跟随系统',
    'session.paused': '已暂停',
    'session.done': '完成',
    'session.cycles': '循环：{n}',
    'stats.time': '时间',
    'stats.cycles': '循环',
    'stats.exitHint': '轻触退出',
    'home.soundOn': '声音：开',
    'home.soundOff': '声音：关',
    'settings.sound': '声音',
    'settings.vibration': '振动',
    'settings.customSection': '自定义呼吸',
    'settings.save': '保存',
    'settings.saved': '已保存',
    'settings.saveFailed': '未保存',
    'common.on': '开',
    'common.off': '关'
  }
};

export function isSupported(code) {
  return Object.prototype.hasOwnProperty.call(STRINGS, code);
}

// Язык интерфейса по локали системы: 'ru-RU' → 'ru', 'zh-Hans-CN' → 'zh'; неподдержанный → английский.
export function matchLocale(locale) {
  if (typeof locale !== 'string' || !locale) return DEFAULT_LANGUAGE;
  var primary = locale.toLowerCase().split('_').join('-').split('-')[0];
  return isSupported(primary) ? primary : DEFAULT_LANGUAGE;
}

// Итоговый язык: явный выбор пользователя, иначе язык системы.
export function resolveLanguage(setting, systemLocale) {
  if (setting && setting !== AUTO_LANGUAGE && isSupported(setting)) return setting;
  return matchLocale(systemLocale);
}

export function languageName(code) {
  for (var i = 0; i < LANGUAGES.length; i++) {
    if (LANGUAGES[i].code === code) return LANGUAGES[i].name;
  }
  return code;
}

// t(key, params): строка на выбранном языке; нет перевода — английская; нет и её — сам ключ.
// Параметры подставляются вместо {name}.
export function createTranslator(code) {
  var table = isSupported(code) ? STRINGS[code] : STRINGS[DEFAULT_LANGUAGE];
  return function (key, params) {
    var text = table[key];
    if (text === undefined) text = STRINGS[DEFAULT_LANGUAGE][key];
    if (text === undefined) return key;
    if (params) {
      for (var name in params) {
        if (Object.prototype.hasOwnProperty.call(params, name)) {
          text = text.split('{' + name + '}').join(String(params[name]));
        }
      }
    }
    return text;
  };
}
