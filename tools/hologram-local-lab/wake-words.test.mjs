import test from 'node:test';
import assert from 'node:assert/strict';
import { detectAddressee, routeTranscript } from './wake-words.mjs';

test('Bob addressed in a natural Spanish question', () => {
  assert.deepEqual(routeTranscript('Bob, ¿me escuchas? Quiero que me expliques algo.').target, 'bob');
  assert.equal(routeTranscript('Bob, ¿me escuchas?').action, 'LISTENING');
});
test('Lina addressed in a natural Spanish question', () => {
  assert.equal(routeTranscript('Lina, ¿qué opinas del transporte público de Nueva York?').target, 'lina');
});
test('accents and punctuation do not break matching', () => {
  assert.equal(detectAddressee('¡LÍNA! ¿Estás ahí?').target, 'lina');
});
test('no spurious matches inside other words', () => {
  assert.equal(routeTranscript('La bobina y la colina están dañadas.').target, null);
  assert.equal(routeTranscript('Me llamo Felencho.').action, 'NONE');
});
test('both names in one transcript require clarification', () => {
  const result = routeTranscript('Bob y Lina, ¿qué piensan?');
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.action, 'NONE');
  assert.equal(result.target, null);
});
test('no implicit wake-word context carried across turns', () => {
  assert.equal(routeTranscript('Y ahora otra pregunta', 'bob').action, 'NONE');
});
