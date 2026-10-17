// Matriz RBAC del proyecto: define QUÉ se siembra en la BD (roles, permisos y su relación).
// La API NO lee este archivo para autorizar: lo hace desde las tablas roles / permissions / role_permission.

const RESOURCES = ['users', 'roles', 'permissions', 'products', 'variants', 'inventory', 'customers', 'orders'];
const ACTIONS = ['create', 'read', 'update', 'delete'];

const ROLES = [
  { name: 'admin', description: 'Administrador: acceso total' },
  { name: 'sales', description: 'Vendedor: catálogo en lectura y operación de órdenes y clientes' },
  { name: 'user', description: 'Cliente: catálogo en lectura y sus propias órdenes' }
];

// Permisos asignados a cada rol, con el formato recurso:acción:alcance
const ROLE_PERMISSIONS = {
  // admin: create/read/update/delete de TODOS los recursos con alcance any
  admin: RESOURCES.flatMap((resource) => ACTIONS.map((action) => `${resource}:${action}:any`)),
  sales: [
    'products:read:any', 'variants:read:any',
    'inventory:read:any', 'inventory:update:any',
    'customers:create:any', 'customers:read:any', 'customers:update:any',
    'orders:create:any', 'orders:read:any', 'orders:update:any'
  ],
  user: [
    'products:read:any', 'variants:read:any',
    'customers:read:own', 'customers:update:own',
    'orders:create:any', 'orders:read:own', 'orders:update:own'
  ]
};

// Catálogo de permisos = todas las keys distintas usadas arriba
const PERMISSION_KEYS = [...new Set(Object.values(ROLE_PERMISSIONS).flat())];

// Un usuario de prueba por rol (para probar manualmente)
const USERS = [
  { first_name: 'Admin', last_name: 'Stride', email: 'admin@stride.co', role: 'admin' },
  { first_name: 'Ventas', last_name: 'Stride', email: 'sales@stride.co', role: 'sales' },
  { first_name: 'Cliente', last_name: 'Stride', email: 'user@stride.co', role: 'user' }
];

module.exports = { RESOURCES, ACTIONS, ROLES, ROLE_PERMISSIONS, PERMISSION_KEYS, USERS };
