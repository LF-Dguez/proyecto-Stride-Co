const express = require('express');
const request = require('supertest');
const i18n = require('../config/i18n');

// App mínima con el mismo middleware de idioma que usa app.js
const app = express();
app.use(i18n.middleware);
app.get('/t', (req, res) => res.json({ locale: req.getLocale(), message: req.__('auth.invalidCredentials') }));

const ES = 'Credenciales Inválidas';
const EN = 'Invalid Credentials';
const ask = (url, headers = {}) => request(app).get(url).set(headers);

describe('detección del idioma', () => {
  it('el idioma por defecto es el español', async () => {
    expect(i18n.DEFAULT_LOCALE).toBe('es');
    const res = await ask('/t');
    expect(res.body).toEqual({ locale: 'es', message: ES });
  });

  it('Accept-Language: en responde en inglés y es en español', async () => {
    expect((await ask('/t', { 'Accept-Language': 'en' })).body.message).toBe(EN);
    expect((await ask('/t', { 'Accept-Language': 'es' })).body.message).toBe(ES);
  });

  it('?lang=en y ?lang=es seleccionan el idioma', async () => {
    expect((await ask('/t?lang=en')).body.message).toBe(EN);
    expect((await ask('/t?lang=es')).body.message).toBe(ES);
  });

  it('?lang tiene prioridad sobre Accept-Language', async () => {
    expect((await ask('/t?lang=en', { 'Accept-Language': 'es' })).body.message).toBe(EN);
    expect((await ask('/t?lang=es', { 'Accept-Language': 'en' })).body.message).toBe(ES);
  });

  it.each(['es-MX', 'es-ES', 'ES_mx'])('la variante regional %s se resuelve a es', async (variant) => {
    expect((await ask(`/t?lang=${variant}`)).body.locale).toBe('es');
    expect((await ask('/t', { 'Accept-Language': variant })).body.locale).toBe('es');
  });

  it.each(['en-US', 'en-GB'])('la variante regional %s se resuelve a en', async (variant) => {
    expect((await ask(`/t?lang=${variant}`)).body.locale).toBe('en');
    expect((await ask('/t', { 'Accept-Language': variant })).body.locale).toBe('en');
  });

  it('un idioma no soportado (fr) responde en el idioma por defecto', async () => {
    expect((await ask('/t?lang=fr')).body.locale).toBe('es');
    expect((await ask('/t', { 'Accept-Language': 'fr' })).body.locale).toBe('es');
  });

  it('?lang no soportado gana sobre Accept-Language y usa el idioma por defecto', async () => {
    expect((await ask('/t?lang=fr', { 'Accept-Language': 'en' })).body.locale).toBe('es');
  });

  it('con una lista de preferencias usa el primer idioma soportado', async () => {
    expect((await ask('/t', { 'Accept-Language': 'fr,en;q=0.8' })).body.locale).toBe('en');
  });

  it('un valor de ?lang que no es texto se ignora y se usa la cabecera', async () => {
    expect((await ask('/t?lang[]=en', { 'Accept-Language': 'en' })).body.locale).toBe('en');
  });
});
