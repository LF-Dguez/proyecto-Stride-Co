const { Role } = require('../models/relationals');
const { parsePermissionKey, buildAccessControl, loadAccessControl, getAccessControl, getRoleName } = require('../services/rbac');

afterEach(() => jest.restoreAllMocks());

describe('services/rbac', () => {
  it('parsePermissionKey separa recurso, acción y alcance', () => {
    expect(parsePermissionKey('orders:read:own')).toEqual({ resource: 'orders', action: 'read', possession: 'own' });
  });

  it.each(['orders:read', 'orders:leer:own', 'orders:read:todo', ':read:any', 'a:b:c:d'])(
    'parsePermissionKey rechaza la key inválida %s', (key) => {
      expect(() => parsePermissionKey(key)).toThrow(/inválida/);
    }
  );

  it('buildAccessControl crea los grants a partir de filas de la BD', () => {
    const ac = buildAccessControl([
      { role: 'admin', key: 'products:delete:any' },
      { role: 'user', key: 'orders:read:own' }
    ]);
    expect(ac.can('admin').deleteAny('products').granted).toBe(true);
    expect(ac.can('user').readOwn('orders').granted).toBe(true);
    expect(ac.can('user').readAny('orders').granted).toBe(false);
  });

  it('loadAccessControl lee Role -> Permission de la BD y traduce role_id a nombre de rol', async () => {
    jest.spyOn(Role, 'findAll').mockResolvedValue([
      { id: 1, name: 'admin', permissions: [{ key: 'products:delete:any' }] },
      { id: 3, name: 'user', permissions: [{ key: 'orders:read:own' }] }
    ]);
    await loadAccessControl();
    const ac = getAccessControl();
    expect(ac.can('admin').deleteAny('products').granted).toBe(true);
    expect(ac.can('user').deleteAny('products').granted).toBe(false);
    expect(getRoleName({ id: 7, role_id: 3 })).toBe('user');
  });
});
