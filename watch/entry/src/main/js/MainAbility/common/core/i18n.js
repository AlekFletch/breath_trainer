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

// Строки хранятся компактно: на язык — одна строка с разделителем «|» в порядке KEYS, а таблица
// { ключ: строка } собирается только для выбранного языка. На часах куча JS — 100 КБ на страницу,
// и объект со всеми шестью языками (~290 строк и свойств) не оставлял запаса памяти при переходах.
export var KEYS = [
  'phase.inhale',
  'phase.holdIn',
  'phase.exhale',
  'phase.holdOut',
  'preset.478',
  'preset.box',
  'preset.relax',
  'preset.custom',
  'home.settings',
  'home.vibrationOn',
  'home.vibrationOff',
  'home.start',
  'unit.sec',
  'unit.min',
  'settings.title',
  'settings.inhale',
  'settings.holdIn',
  'settings.exhale',
  'settings.holdOut',
  'settings.session',
  'settings.language',
  'language.title',
  'language.auto',
  'session.paused',
  'session.done',
  'session.cycles',
  'stats.time',
  'stats.cycles',
  'stats.backHint',
  'home.soundOn',
  'home.soundOff',
  'settings.sound',
  'settings.vibration',
  'settings.vibrationStrength',
  'settings.strengthStrong',
  'settings.strengthWeak',
  'settings.customSection',
  'common.on',
  'common.off'
];
export var TEXTS = {
  ru: 'Вдох|Задержка|Выдох|Задержка|4-7-8|Квадрат|Расслабление|Своё|Настройки|Вибро: вкл|Вибро: выкл|Старт|с|мин|Настройки|Вдох|Задержка (вдох)|Выдох|Задержка (выдох)|Сессия|Язык|Язык|Как в системе|Пауза|Готово|Циклов: {n}|Время|Циклы|Коснитесь для возврата|Звук: вкл|Звук: выкл|Звук|Вибрация|Сила вибрации|Сильная|Слабая (ночь)|Своё дыхание|Вкл|Выкл',
  en: 'Inhale|Hold|Exhale|Hold|4-7-8|Box|Relax|Custom|Settings|Vibration: on|Vibration: off|Start|s|min|Settings|Inhale|Hold (full)|Exhale|Hold (empty)|Session|Language|Language|System default|Paused|Done|Cycles: {n}|Time|Cycles|Tap to go back|Sound: on|Sound: off|Sound|Vibration|Vibration strength|Strong|Weak (night)|Custom breathing|On|Off',
  es: 'Inhalar|Retener|Exhalar|Retener|4-7-8|Cuadrada|Relajación|Personalizado|Ajustes|Vibración: sí|Vibración: no|Iniciar|s|min|Ajustes|Inhalar|Retener (lleno)|Exhalar|Retener (vacío)|Sesión|Idioma|Idioma|Como el sistema|En pausa|Listo|Ciclos: {n}|Tiempo|Ciclos|Toca para volver|Sonido: sí|Sonido: no|Sonido|Vibración|Intensidad|Fuerte|Suave (noche)|Respiración personalizada|Sí|No',
  de: 'Einatmen|Halten|Ausatmen|Halten|4-7-8|Quadrat|Entspannung|Eigene|Einstellungen|Vibration: an|Vibration: aus|Start|s|min|Einstellungen|Einatmen|Halten (voll)|Ausatmen|Halten (leer)|Sitzung|Sprache|Sprache|Wie im System|Pausiert|Fertig|Zyklen: {n}|Zeit|Zyklen|Tippen für zurück|Ton: an|Ton: aus|Ton|Vibration|Vibrationsstärke|Stark|Schwach (Nacht)|Eigene Atmung|An|Aus',
  fr: 'Inspirer|Retenir|Expirer|Retenir|4-7-8|Carrée|Détente|Personnalisé|Réglages|Vibration : oui|Vibration : non|Démarrer|s|min|Réglages|Inspirer|Retenir (plein)|Expirer|Retenir (vide)|Séance|Langue|Langue|Comme le système|En pause|Terminé|Cycles : {n}|Temps|Cycles|Touchez pour revenir|Son : oui|Son : non|Son|Vibration|Intensité|Forte|Faible (nuit)|Respiration personnalisée|Oui|Non',
  zh: '吸气|屏息|呼气|屏息|4-7-8|箱式|放松|自定义|设置|振动：开|振动：关|开始|秒|分钟|设置|吸气|屏息（吸气后）|呼气|屏息（呼气后）|时长|语言|语言|跟随系统|已暂停|完成|循环：{n}|时间|循环|轻触返回|声音：开|声音：关|声音|振动|振动强度|强|弱（夜间）|自定义呼吸|开|关'
};

export function isSupported(code) {
  return Object.prototype.hasOwnProperty.call(TEXTS, code);
}

// Таблица строк языка: { ключ: строка }. Неподдержанный код — английская.
export function stringsFor(code) {
  var texts = TEXTS[isSupported(code) ? code : DEFAULT_LANGUAGE].split('|');
  var table = {};
  for (var i = 0; i < KEYS.length; i++) table[KEYS[i]] = texts[i];
  return table;
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

// t(key, params): строка на выбранном языке (неподдержанный язык — английский); нет такого ключа — сам ключ.
// Параметры подставляются вместо {name}. Переводы полные во всех языках — это проверяет тест.
export function createTranslator(code) {
  var table = stringsFor(code);
  return function (key, params) {
    var text = table[key];
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
