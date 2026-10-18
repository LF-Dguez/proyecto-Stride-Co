const { hashPassword, verifyPassword, getSaltRounds } = require('../services/password');

describe('services/password', () => {
  const original = process.env.BCRYPT_SALT_ROUNDS;
  afterEach(() => {
    if (original === undefined) delete process.env.BCRYPT_SALT_ROUNDS;
    else process.env.BCRYPT_SALT_ROUNDS = original;
  });

  it('hashPassword devuelve password_hash y salt_key', async () => {
    const result = await hashPassword('Secret123');
    expect(Object.keys(result).sort()).toEqual(['password_hash', 'salt_key']);
    expect(result.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(result.salt_key).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('el hash incluye el salt generado (salt_key es su prefijo)', async () => {
    const { password_hash, salt_key } = await hashPassword('Secret123');
    expect(password_hash.startsWith(salt_key)).toBe(true);
  });

  it('el hash no contiene la contraseña en texto plano', async () => {
    const { password_hash } = await hashPassword('Secret123');
    expect(password_hash).not.toContain('Secret123');
  });

  it('la misma contraseña genera salt y hash distintos cada vez', async () => {
    const a = await hashPassword('Secret123');
    const b = await hashPassword('Secret123');
    expect(a.salt_key).not.toBe(b.salt_key);
    expect(a.password_hash).not.toBe(b.password_hash);
  });

  it('verifyPassword acepta la contraseña correcta y rechaza la incorrecta', async () => {
    const { password_hash } = await hashPassword('Secret123');
    await expect(verifyPassword('Secret123', password_hash)).resolves.toBe(true);
    await expect(verifyPassword('otra-clave', password_hash)).resolves.toBe(false);
  });

  it('verifyPassword devuelve false con datos inválidos en lugar de lanzar error', async () => {
    await expect(verifyPassword('Secret123', undefined)).resolves.toBe(false);
    await expect(verifyPassword('Secret123', '')).resolves.toBe(false);
    await expect(verifyPassword(undefined, '$2b$04$abc')).resolves.toBe(false);
  });

  it('hashPassword rechaza contraseñas vacías o que no son texto', async () => {
    await expect(hashPassword('')).rejects.toThrow(TypeError);
    await expect(hashPassword(undefined)).rejects.toThrow(TypeError);
    await expect(hashPassword(12345)).rejects.toThrow(TypeError);
  });

  it('respeta el factor de costo de BCRYPT_SALT_ROUNDS', async () => {
    process.env.BCRYPT_SALT_ROUNDS = '5';
    const { password_hash } = await hashPassword('Secret123');
    expect(password_hash.startsWith('$2b$05$')).toBe(true);
  });

  it('usa un costo por defecto de 10 si la variable falta o es inválida', () => {
    delete process.env.BCRYPT_SALT_ROUNDS;
    expect(getSaltRounds()).toBe(10);
    process.env.BCRYPT_SALT_ROUNDS = 'abc';
    expect(getSaltRounds()).toBe(10);
    process.env.BCRYPT_SALT_ROUNDS = '2';
    expect(getSaltRounds()).toBe(10);
  });
});
