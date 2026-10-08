export const appRoles = [
  'administrador',
  'supervisor',
  'nutricionista',
  'operador',
  'consulta',
  'pendente',
] as const;

export type AppRole = (typeof appRoles)[number];
export type Permission =
  | 'production:read'
  | 'production:write'
  | 'catalog:read'
  | 'catalog:write'
  | 'sheets:read'
  | 'sheets:write'
  | 'equipment:read'
  | 'equipment:write'
  | 'team:read'
  | 'team:manage';

const allPermissions: Permission[] = [
  'production:read', 'production:write', 'catalog:read', 'catalog:write',
  'sheets:read', 'sheets:write', 'equipment:read', 'equipment:write',
  'team:read', 'team:manage',
];

const permissions: Record<AppRole, ReadonlySet<Permission>> = {
  administrador: new Set(allPermissions),
  supervisor: new Set(allPermissions.filter(permission => permission !== 'team:manage')),
  nutricionista: new Set(allPermissions.filter(permission => !permission.startsWith('team:'))),
  operador: new Set(['production:read', 'production:write', 'catalog:read', 'sheets:read', 'equipment:read']),
  consulta: new Set(['production:read', 'catalog:read', 'sheets:read', 'equipment:read']),
  pendente: new Set(),
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && appRoles.includes(value as AppRole);
}

export function can(role: AppRole, permission: Permission): boolean {
  return permissions[role].has(permission);
}

export const selectableRoles = [
  { value: 'supervisor', label: 'Supervisor(a)' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'operador', label: 'Operador(a) de produção' },
  { value: 'consulta', label: 'Consulta / auditoria' },
] as const;
