import test from 'node:test';
import assert from 'node:assert/strict';
import { login } from './src/auth.js';

test('credenciales seed de recepción funcionan',()=>{
  const result=login('recepcion','Recepcion123');
  assert.ok(result?.token);
  assert.equal(result.user.role,'RECEPCION');
});
test('credenciales incorrectas son rechazadas',()=>{
  assert.equal(login('recepcion','incorrecta'),null);
});
