/* Node-only browser voice UI smoke tests. No network, browser, audio hardware or GPU. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, 'browser_voice_interrupt.html'), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert(match, 'Inline JS missing; fixture intentionally requires self-contained HTML');

const controls = new Map();
for (const id of ['lina', 'bob', 'stop', 'reset', 'status', 'latency', 'log']) {
  controls.set(id, {
    disabled: false, textContent: '', handlers: {},
    addEventListener(event, fn) { this.handlers[event] = fn; },
    click() {
      assert.equal(this.disabled, false, 'Attempted disabled control: ' + id);
      assert.equal(typeof this.handlers.click, 'function');
      this.handlers.click();
    }
  });
}
let cancelCalls = 0;
let spoken = [];
class FakeUtterance {
  constructor(text) { this.text = text; this.onend = null; this.onerror = null; }
}
const synthesis = {
  getVoices: () => [{ lang: 'es-ES', name: 'Local test voice' }],
  speak(utterance) { spoken.push(utterance); },
  cancel() { cancelCalls++; }
};
const pageHandlers = {};
const sandbox = {
  document: { getElementById(id) {
    assert(controls.has(id), 'Unexpected element ' + id);
    return controls.get(id);
  }},
  window: {
    speechSynthesis: synthesis, SpeechSynthesisUtterance: FakeUtterance,
    addEventListener(event, fn) { pageHandlers[event] = fn; }
  },
  SpeechSynthesisUtterance: FakeUtterance,
  performance: { now: (() => { let t = 0; return () => ++t; })() },
  Date,
  console: { log() { throw Error('Unexpected console output'); } }
};
vm.runInNewContext(match[1], sandbox, { timeout: 1000, filename: 'browser_voice_interrupt.inline.js' });
const click = id => controls.get(id).click();

assert.match(controls.get('status').textContent, /Listo/);
click('lina');
assert.equal(spoken.length, 1);
assert.equal(controls.get('stop').disabled, false);
const staleLina = spoken[0];
click('stop');
assert.equal(cancelCalls, 1);
assert.equal(controls.get('stop').disabled, true);
assert.match(controls.get('status').textContent, /Interrupci/);
assert.match(controls.get('latency').textContent, /orden de cancelaci/);
click('bob');
assert.equal(spoken.length, 2);
const activeBob = spoken[1];
staleLina.onend(); // Old TTS callback must not end Bob's turn
assert.equal(controls.get('stop').disabled, false, 'Old callback hijacked active turn');
activeBob.onend();
assert.equal(controls.get('stop').disabled, true);
click('reset');
assert.equal(controls.get('latency').textContent, '—');
assert.equal(typeof pageHandlers.pagehide, 'function');
pageHandlers.pagehide();
assert.equal(cancelCalls >= 3, true);
process.stdout.write('Browser voice UI smoke: 1 scenario OK (mock speech, no audio device)\n');
