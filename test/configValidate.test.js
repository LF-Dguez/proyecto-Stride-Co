const path = require('path');
const { spawnSync } = require('child_process');

// La configuración se simula para poder dejarla incompleta en cada prueba
jest.mock('config', () => {
  const values = {};
  return {
    __values: values,
    has: (key) => values[key] !== undefined,
    get: (key) => values[key],
    util: { getEnv: () => 'development' }
  };
});

const config = require('config');
const { REQUIRED, getMissingConfig, assertRequiredConfig } = require('../config/validate');

const complete = () => Object.fromEntries(REQUIRED.map((key) => [key, `valor-${key}`]));

describe('config/validate', () => {
  beforeEach(() => Object.assign(config.__values, complete()));
  afterEach(() => Object.keys(config.__values).forEach((key) => delete config.__values[key]));

  it('exige jwt.secret, los datos del JWT y las URIs de las dos bases de datos', () => {
    expect(REQUIRED).toEqual(expect.arrayContaining(['jwt.secret', 'postgres.uri', 'mongo.uri']));
  });

  it('con la configuración completa no lanza error', () => {
    expect(getMissingConfig()).toEqual([]);
    expect(() => assertRequiredConfig()).not.toThrow();
  });

  it('si falta jwt.secret lanza un error claro con la forma de arreglarlo', () => {
    delete config.__values['jwt.secret'];
    expect(() => assertRequiredConfig()).toThrow(/jwt\.secret/);
    expect(() => assertRequiredConfig()).toThrow(/config\/local-development\.json/);
  });

  it('un jwt.secret vacío (como el de la plantilla) también se rechaza', () => {
    config.__values['jwt.secret'] = '';
    expect(getMissingConfig()).toEqual(['jwt.secret']);
  });

  it('lista todo lo que falta', () => {
    delete config.__values['postgres.uri'];
    delete config.__values['mongo.uri'];
    expect(getMissingConfig()).toEqual(['postgres.uri', 'mongo.uri']);
  });
});

describe('arranque del servidor sin secretos', () => {
  it('npm start no arranca y muestra qué falta cuando no existe config/local-<entorno>.json', () => {
    // Un entorno sin archivos de configuración propios: solo se carga default.json (sin secretos)
    const result = spawnSync('node', [path.join(__dirname, '..', 'bin', 'www')], {
      env: { ...process.env, NODE_ENV: 'sin-secretos', NODE_CONFIG_STRICT_MODE: '' },
      encoding: 'utf8',
      timeout: 15000
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Falta configuración obligatoria/);
    expect(result.stderr).toMatch(/jwt\.secret/);
  });
});
