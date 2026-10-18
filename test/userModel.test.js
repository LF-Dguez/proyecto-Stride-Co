const { User } = require('../models/relationals');

const buildUser = () => User.build({
  id: 1,
  first_name: 'Ana',
  last_name: 'López',
  email: 'ana@stride.co',
  role_id: 1,
  active: true,
  password_hash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  salt_key: '$2b$10$N9qo8uLOickgx2ZMRZoMyeI',
  password: 'Secret123'
});

describe('modelo User: datos sensibles', () => {
  it('declara password_hash y salt_key como obligatorios', () => {
    expect(User.rawAttributes.password_hash.allowNull).toBe(false);
    expect(User.rawAttributes.salt_key.allowNull).toBe(false);
  });

  it('toJSON() oculta password, password_hash y salt_key', () => {
    const json = buildUser().toJSON();
    expect(json).not.toHaveProperty('password');
    expect(json).not.toHaveProperty('password_hash');
    expect(json).not.toHaveProperty('salt_key');
  });

  it('toJSON() conserva los datos seguros del usuario', () => {
    expect(buildUser().toJSON()).toMatchObject({
      id: 1, first_name: 'Ana', last_name: 'López', email: 'ana@stride.co', role_id: 1, active: true
    });
  });

  it('JSON.stringify(user) y res.json no filtran los campos sensibles', () => {
    const text = JSON.stringify(buildUser());
    expect(text).not.toMatch(/password|salt_key|\$2b\$/);
    expect(JSON.stringify({ data: [buildUser()] })).not.toMatch(/password|salt_key|\$2b\$/);
  });
});
