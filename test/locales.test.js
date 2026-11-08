const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'locales');
const load = (name) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));

// { products: { list: 'x' } } -> { 'products.list': 'x' }
function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const route = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') Object.assign(acc, flatten(value, route));
    else acc[route] = value;
    return acc;
  }, {});
}

const es = flatten(load('es'));
const en = flatten(load('en'));
const placeholders = (text) => (String(text).match(/%[sdj]|%\{\w+\}|\{\{\w+\}\}/g) || []).sort();

describe('archivos de traducción', () => {
  it('es.json y en.json tienen exactamente las mismas claves', () => {
    const missingInEn = Object.keys(es).filter((key) => !(key in en));
    const missingInEs = Object.keys(en).filter((key) => !(key in es));
    expect({ missingInEn, missingInEs }).toEqual({ missingInEn: [], missingInEs: [] });
  });

  it('todas las traducciones son texto no vacío', () => {
    [['es', es], ['en', en]].forEach(([name, messages]) => {
      Object.entries(messages).forEach(([key, value]) => {
        expect({ name, key, ok: typeof value === 'string' && value.trim() !== '' }).toEqual({ name, key, ok: true });
      });
    });
  });

  it('cada clave conserva los mismos marcadores (%s, %d, {{x}}) en ambos idiomas', () => {
    Object.keys(es).forEach((key) => {
      expect({ key, placeholders: placeholders(es[key]) }).toEqual({ key, placeholders: placeholders(en[key]) });
    });
  });

  it('no queda ninguna traducción duplicada con el idioma equivocado (es distinto de en)', () => {
    const same = Object.keys(es).filter((key) => es[key] === en[key] && /[a-z]{4,}/i.test(es[key]));
    expect(same).toEqual([]);
  });

  it('la librería no escribe claves faltantes en locales/', () => {
    const i18n = require('../config/i18n');
    const before = ['es', 'en'].map((n) => fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
    i18n.__({ phrase: 'clave.que.no.existe', locale: 'es' });
    i18n.__({ phrase: 'clave.que.no.existe', locale: 'en' });
    const after = ['es', 'en'].map((n) => fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));
    expect(after).toEqual(before);
  });
});
