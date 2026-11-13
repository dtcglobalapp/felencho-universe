#!/usr/bin/env node
// LOCAL MIC -> WHISPER -> WAKE-WORD LAB. Does NOT connect to LiveKit or change hologram state.
// Microphone captures and transcript files are stored only in a temporary local directory.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { routeTranscript } from './wake-words.mjs';

function usage() {
  console.log('Usage: node tools/hologram-local-lab/mic-whisper-wake.mjs [--once] [--seconds 5] [--device 0] [--model /absolute/path/ggml-small.bin] [--dry-text "Bob, hola"]');
}
function parse(argv) {
  const out = { once: false, seconds: 5, device: '0', model: join(homedir(), 'felencho-whisper-lab/models/ggml-small.bin'), dryText: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--once') out.once = true;
    else if (arg === '--help') { usage(); process.exit(0); }
    else if (['--seconds', '--device', '--model', '--dry-text'].includes(arg)) {
      if (!argv[i+1]) throw new Error('Missing argument for ' + arg);
      const key = { '--seconds':'seconds','--device':'device','--model':'model','--dry-text':'dryText' }[arg];
      out[key] = argv[++i];
    } else throw new Error('Unknown argument: ' + arg);
  }
  out.seconds = Number(out.seconds);
  if (!Number.isInteger(out.seconds) || out.seconds < 2 || out.seconds > 30) throw new Error('--seconds must be 2..30');
  if (!/^[0-9]+$/.test(String(out.device))) throw new Error('--device must be an AVFoundation audio device index');
  return out;
}
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 4 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(command + ' exit=' + result.status + '\n' + String(result.stderr).slice(-1800));
}
function display(transcript) {
  const routed = routeTranscript(transcript);
  console.log('\n[Whisper] ' + (transcript || '(sin voz reconocida)'));
  console.log('[Detector] ' + (routed.target ? routed.target.toUpperCase() + ' -> ' + routed.action : routed.status + ' -> NONE'));
  console.log('[Seguridad] Solo diagnóstico: todavía NO se envían órdenes al holograma ni respuestas a TTS.');
  return routed;
}
const opts = parse(process.argv.slice(2));
if (opts.dryText !== null) { display(opts.dryText); process.exit(0); }
if (!existsSync(opts.model)) throw new Error('Whisper model not found: ' + opts.model);
let stop = false;
process.on('SIGINT', () => { stop = true; console.log('\nCerrando prueba local...'); });
process.on('SIGTERM', () => { stop = true; });
console.log('Felencho Mundial — RODECaster mic STT lab (offline)');
console.log('Audio device: ' + opts.device + ' | segment: ' + opts.seconds + 's | CTRL+C to stop');
console.log('IMPORTANT: monitor only. Do not treat this as live hologram activation.');
do {
  const dir = mkdtempSync(join(tmpdir(), 'felencho-stt-'));
  const wav = join(dir, 'micro.wav');
  const prefix = join(dir, 'transcript');
  try {
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'avfoundation', '-i', ':' + opts.device, '-t', String(opts.seconds), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
    run('whisper-cli', ['-m', opts.model, '-f', wav, '-l', 'es', '-nt', '-otxt', '-of', prefix, '-np']);
    const text = existsSync(prefix + '.txt') ? readFileSync(prefix + '.txt', 'utf8').trim() : '';
    display(text);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} while (!opts.once && !stop);
