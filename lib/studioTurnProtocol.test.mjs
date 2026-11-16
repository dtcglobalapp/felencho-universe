import test from 'node:test';
import assert from 'node:assert/strict';
import {routeProducerTurn as route} from './studioTurnProtocol.mjs';

for (const [phrase, expected] of [
  ['Lina que opinas tu', ['lina']],
  ['Bob que te parece', ['bob']],
  ['Lina y Bob ustedes que piensan', ['lina','bob']],
  ['Bob y Lina me gustaria escuchar su punto de vista', ['bob','lina']],
  ['Lina y Bob, ¿qué piensan de la inteligencia artificial?', ['lina','bob']],
  ['Lina y Bob, me gustaría escuchar sus opiniones', ['lina','bob']],
  ['Bob y Lina, quisiera escucharlos', ['bob','lina']],
  ['Bob, ¿cómo explicas esto?', ['bob']],
  ['Bob y Lina, estoy exponiendo una idea', []],
  ['Bob, un momento, no respondas', []],
  ['Lina, espera que termine', []],
  ['Estoy hablando sobre Bob y Lina', []],
  ['Seguimos con el tema sin dar la palabra', []],
  ['Lina y Bob, silencio', []]
]) {
  test(phrase, () => assert.deepEqual(route(phrase).order, expected));
}
