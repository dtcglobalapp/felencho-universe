import { test } from "node:test";
import assert from "node:assert/strict";
import { HologramTurnController } from "../../../lib/hologramTurnController.mjs";

const defer = () => {
 let resolve, reject;
 const promise = new Promise((a,b) => {resolve=a; reject=b});
 return { promise, resolve, reject };
};
const make = (overrides = {}) => {
 const events = [], stops = { count: 0 };
 const controller = new HologramTurnController({
  brain: async () => "Respuesta verificada de prueba",
  tts: async ({provider}) => ({ provider, bytes: new Uint8Array([1,2]) }),
  playback: async () => {},
  stopPlayback: () => { stops.count++; },
  onChange: snapshot => events.push(snapshot),
  ...overrides,
 });
 return { controller, events, stops };
};

test("normal turn: thinking -> speaking -> listening", async () => {
 const {controller,events} = make();
 const result = await controller.request({character:"lina",question:"¿Qué piensas?",presenterAuthorized:true});
 assert.equal(result.status,"completed");
 assert.ok(events.some(s=>s.lina.mode==="pensando"));
 assert.ok(events.some(s=>s.lina.mode==="hablando"));
 assert.equal(controller.snapshot.lina.mode,"escuchando");
 assert.equal(controller.snapshot.active,null);
});

test("requests require explicit verified conductor authorization from caller", async () => {
 const {controller} = make();
 await assert.rejects(controller.request({character:"bob",question:"Hola"}),/authorization required/);
});

test("selected voice provider travels to injected TTS; no credentials or network", async () => {
 const heard = [];
 const {controller} = make({tts:async p=>{heard.push(p.provider);return {};}});
 controller.setProvider("bob","cartesia");
 await controller.request({character:"bob",question:"Hola",presenterAuthorized:true});
 assert.deepEqual(heard,["cartesia"]);
 assert.throws(()=>controller.setProvider("bob","not-a-provider"));
});

test("suspension blocks requests but keeps mode visible", async () => {
 const {controller} = make();
 controller.setMode("lina","suspendido");
 assert.equal(controller.snapshot.lina.mode,"suspendido");
 await assert.rejects(controller.request({character:"lina",question:"Hola",presenterAuthorized:true}),/suspended/);
 controller.setMode("lina","escuchando");
 assert.equal(controller.snapshot.lina.mode,"escuchando");
});

test("presenter interrupt while brain awaits cancels stale audio generation", async () => {
 const pending = defer();let ttsCalls=0;
 const {controller,stops} = make({brain:()=>pending.promise,tts:async()=>{ttsCalls++;return {};}});
 const turn = controller.request({character:"bob",question:"Hola",presenterAuthorized:true});
 controller.interrupt();
 pending.resolve("Texto tardío");
 assert.equal((await turn).status,"cancelled");
 assert.equal(ttsCalls,0);
 assert.ok(stops.count>0);
 assert.equal(controller.snapshot.active,null);
});

test("presenter interrupt during TTS suppresses stale playback", async () => {
 const pending=defer();let plays=0;
 const {controller}=make({tts:()=>pending.promise,playback:async()=>{plays++;}});
 const turn=controller.request({character:"lina",question:"Hola",presenterAuthorized:true});
 await Promise.resolve(); // brain resolves
 controller.interrupt("presenter");
 pending.resolve({});
 assert.equal((await turn).status,"cancelled");
 assert.equal(plays,0);
});

test("new turn interrupts old playback and keeps new turn active", async () => {
 const first=defer();let plays=0;
 const {controller}=make({playback:async()=>{plays++;if(plays===1)await first.promise;}});
 const old=controller.request({character:"bob",question:"Uno",presenterAuthorized:true});
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 const current=controller.request({character:"lina",question:"Dos",presenterAuthorized:true});
 first.resolve();
 assert.equal((await old).status,"cancelled");
 assert.equal((await current).status,"completed");
 assert.equal(controller.snapshot.active,null);
 assert.equal(controller.snapshot.bob.mode,"escuchando");
 assert.equal(controller.snapshot.lina.mode,"escuchando");
});

test("invalid questions never reach brain or TTS", async () => {
 const {controller}=make({brain:()=>{throw Error("must not call")}})
 await assert.rejects(controller.request({character:"bob",question:" ",presenterAuthorized:true}),/Invalid question/);
 await assert.rejects(controller.request({character:"guest",question:"Hola",presenterAuthorized:true}),/Unknown cohost/);
});
