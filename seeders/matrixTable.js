const { RESOURCES, ACTIONS, ROLES, ROLE_PERMISSIONS } = require('./rbacMatrix');

// Alcance que tiene un rol sobre recurso:acción: 'any', 'own' o '—' (sin permiso)
function scopeOf(role, resource, action) {
  const keys = ROLE_PERMISSIONS[role];
  if (keys.includes(`${resource}:${action}:any`)) return 'any';
  if (keys.includes(`${resource}:${action}:own`)) return 'own';
  return '—';
}

// Tabla Markdown de la matriz RBAC, generada desde la MISMA fuente que el seed.
// El README debe contener exactamente esta tabla (lo verifica test/routesAudit.test.js).
function matrixMarkdown() {
  const header = `| Recurso · operación | ${ROLES.map((r) => r.name.toUpperCase()).join(' | ')} |`;
  const separator = `|---|${ROLES.map(() => ':---:').join('|')}|`;
  const rows = RESOURCES.flatMap((resource) => ACTIONS.map((action) => {
    const scopes = ROLES.map((r) => scopeOf(r.name, resource, action));
    return `| ${resource} · ${action} | ${scopes.join(' | ')} |`;
  }));
  return [header, separator, ...rows].join('\n');
}

module.exports = { scopeOf, matrixMarkdown };
