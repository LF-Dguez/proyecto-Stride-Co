const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const configDir = path.join(root, 'config');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Recorre un objeto y devuelve [ruta, valor] de cada hoja
function leaves(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const route = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? leaves(value, route) : [[route, value]];
  });
}

describe('configuración por entornos', () => {
  const PUBLIC_VALUES = ['seed.demoPasswords.admin', 'seed.demoPasswords.sales', 'seed.demoPasswords.user'];
  const SECRET_KEY = /secret|password|uri|token|apikey/i;

  it.each(['default.json', 'development.json', 'production.json'])(
    '%s no contiene secretos (jwt.secret, contraseñas ni URIs de bases de datos)', (file) => {
      const json = JSON.parse(fs.readFileSync(path.join(configDir, file), 'utf8'));
      const leaked = leaves(json)
        .filter(([route, value]) => SECRET_KEY.test(route) && !PUBLIC_VALUES.includes(route) && value !== '')
        .map(([route]) => route);
      expect(leaked).toEqual([]);
    }
  );

  it('los archivos versionados no contienen la contraseña que estuvo escrita antes', () => {
    ['default.json', 'development.json', 'production.json', 'test.json'].forEach((file) => {
      expect(fs.readFileSync(path.join(configDir, file), 'utf8')).not.toMatch(/abdc1234/);
    });
  });

  it('existen los archivos de entorno y las plantillas de secretos', () => {
    [
      'default.json', 'development.json', 'test.json', 'production.json',
      'custom-environment-variables.json',
      'local-development.example.json', 'local-production.example.json'
    ].forEach((file) => expect(fs.existsSync(path.join(configDir, file))).toBe(true));
  });

  it('las plantillas de secretos dejan jwt.secret vacío', () => {
    ['local-development.example.json', 'local-production.example.json'].forEach((file) => {
      const json = JSON.parse(fs.readFileSync(path.join(configDir, file), 'utf8'));
      expect(json.jwt.secret).toBe('');
    });
  });

  it('npm test funciona sin archivos locales: en NODE_ENV=test solo se cargan archivos versionados', () => {
    const config = require('config');
    const sources = config.util.getConfigSources().map((s) => path.basename(s.name));
    expect(sources).toEqual(expect.arrayContaining(['default.json', 'test.json']));
    expect(sources.filter((name) => /^local/.test(name))).toEqual([]);
    expect(config.get('jwt.secret')).toBeTruthy();
    expect(config.get('bcrypt.saltRounds')).toBe(4);
  });

  it('usa los valores no secretos de default.json', () => {
    const config = require('config');
    expect(config.get('jwt.issuer')).toBe('stride-co');
    expect(config.get('jwt.audience')).toBe('stride-co-api');
    expect(config.get('jwt.expiresIn')).toBe('15m');
  });

  it('PORT se enlaza con server.port como número', () => {
    const saved = process.env.PORT;
    process.env.PORT = '8080';
    let port;
    jest.isolateModules(() => {
      port = require('config').get('server.port');
    });
    if (saved === undefined) delete process.env.PORT;
    else process.env.PORT = saved;
    expect(port).toBe(8080);
  });

  it('sin PORT se usa el puerto por defecto 3000', () => {
    const saved = process.env.PORT;
    delete process.env.PORT;
    let port;
    jest.isolateModules(() => {
      port = require('config').get('server.port');
    });
    if (saved !== undefined) process.env.PORT = saved;
    expect(port).toBe(3000);
  });

  it('.gitignore y .dockerignore excluyen config/local*.json y conservan las plantillas', () => {
    ['.gitignore', '.dockerignore'].forEach((file) => {
      const text = read(file);
      expect(text).toMatch(/^config\/local\*\.json$/m);
      expect(text).toMatch(/^!config\/local\*\.example\.json$/m);
    });
  });
});
