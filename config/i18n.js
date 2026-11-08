const path = require('path');
const i18n = require('i18n');

const SUPPORTED_LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = 'es';

i18n.configure({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  directory: path.join(__dirname, '..', 'locales'),
  queryParameter: 'lang',
  header: 'accept-language',
  objectNotation: true, // permite usar obj.valor
  // Los textos se mantienen a mano en locales/*.json: la librería no debe escribir claves
  // faltantes en los archivos (en un contenedor eso sería un efecto secundario peligroso).
  updateFiles: false,
  syncFiles: false
});

// 'es-MX' -> 'es', 'EN_us' -> 'en'
function toBaseLocale(value) {
  return String(value).trim().toLowerCase().split(/[-_]/)[0];
}

// Orden de detección del idioma:  ?lang=es  ->  cabecera Accept-Language  ->  idioma por defecto.
// i18n.init ya resuelve la cabecera (variantes regionales incluidas, con el idioma por
// defecto si ninguno está soportado); aquí se respeta ?lang= y se normalizan sus variantes.
function selectLocale(req, res, next) {
  const requested = req.query && req.query.lang;
  if (typeof requested === 'string' && requested !== '') {
    const base = toBaseLocale(requested);
    i18n.setLocale([req, res.locals], SUPPORTED_LOCALES.includes(base) ? base : DEFAULT_LOCALE);
  }
  next();
}

i18n.middleware = [i18n.init, selectLocale];
i18n.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
i18n.DEFAULT_LOCALE = DEFAULT_LOCALE;

module.exports = i18n;
