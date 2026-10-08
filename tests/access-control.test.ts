import assert from 'node:assert/strict';
import { can, isAppRole } from '../lib/access-control';

assert.equal(can('administrador', 'team:manage'), true);
assert.equal(can('supervisor', 'team:manage'), false);
assert.equal(can('supervisor', 'production:write'), true);
assert.equal(can('operador', 'production:write'), true);
assert.equal(can('operador', 'catalog:write'), false);
assert.equal(can('consulta', 'production:read'), true);
assert.equal(can('consulta', 'production:write'), false);
assert.equal(can('pendente', 'production:read'), false);
assert.equal(isAppRole('nutricionista'), true);
assert.equal(isAppRole('diretor'), false);

console.log('access-control: ok');
