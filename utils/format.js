// Precios según el idioma de la petición (sección 4.10 del PDF: Intl.NumberFormat con MXN).
function formatPrice(value, locale) {
  const intlLocale = locale === 'en' ? 'en-US' : 'es-MX';
  return new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'MXN' }).format(value);
}

// Fechas según el idioma (Intl.DateTimeFormat).
function formatDate(value, locale) {
  const intlLocale = locale === 'en' ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

module.exports = { formatPrice, formatDate };
