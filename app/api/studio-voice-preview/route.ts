import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function enabled(req: NextRequest) {
  const hostname = req.headers.get('host') ?? '';
  return process.env.NODE_ENV === 'development'
    && process.env.FELENCHO_VOICE_PREVIEW === '1'
    && ['127.0.0.1:3121', 'localhost:3121'].includes(hostname);
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: {
        ...process.env,
        HF_HUB_OFFLINE: '1',
        TRANSFORMERS_OFFLINE: '1',
        HF_HUB_DISABLE_TELEMETRY: '1',
      },
    });
    let stderr = '';
    let finished = false;
    const stop = (err?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (err) reject(err); else resolve();
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      stop(new Error('La síntesis tardó demasiado; ensayo detenido.'));
    }, timeoutMs);
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + String(chunk)).slice(-1200);
    });
    child.once('error', error => stop(error));
    child.once('close', code =>
      stop(code === 0 ? undefined : new Error('Motor de voz falló: ' + stderr.slice(-320)))
    );
  });
}

export async function GET(request: NextRequest) {
  if (!enabled(request)) return NextResponse.json({error:'Vista desactivada'}, {status:403});
  return NextResponse.json({
    ready: true,
    mode:'isolated-voice-screen',
    bob:'Qwen3 Base 1.7B + SHA-256 protected reference',
    lina:'Serena CustomVoice',
    audio_route:'Browser only; never LiveKit',
  }, {headers:{'Cache-Control':'no-store'}});
}

export async function POST(request: NextRequest) {
  if (!enabled(request)) return NextResponse.json({error:'Vista desactivada'}, {status:403});
  let temp: string | null = null;
  try {
    const body = await request.json() as { persona?: unknown; text?: unknown };
    if (!['bob', 'lina'].includes(String(body.persona)))
      return NextResponse.json({error:'Persona desconocida'}, {status:400});
    if (typeof body.text !== 'string' || body.text.trim().length < 1 || body.text.length > 320)
      return NextResponse.json({error:'Texto de ensayo fuera de rango (1-320 caracteres)'},{status:400});
    const persona = body.persona as 'bob'|'lina';
    const text = body.text.trim();
    const python = join(homedir(), 'felencho-qwen3-tts-lab/.venv/bin/python');
    await access(python);
    temp = await mkdtemp(join(tmpdir(),'felencho-voice-screen-'));
    const output = join(temp, 'voice.wav');
    const began = Date.now();

    if (persona === 'bob') {
      const script = join(homedir(),'Documents/felencho-light-integration-lab/tools/voice-library-lab/bob-clone-base.py');
      await access(script);
      await run(python, [script,'--studio-text',text,'--studio-output',output], 65000);
    } else {
      const base = join(temp,'lina');
      await run(python, ['-m','mlx_audio.tts.generate',
        '--model','mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit',
        '--voice','Serena','--text',text,'--lang_code','Spanish',
        '--output_path',base], 65000);
      const bytes = await readFile(join(base,'audio_000.wav'));
      return NextResponse.json({
        persona, voice:'Serena',
        audio_base64:bytes.toString('base64'), audio_mime:'audio/wav',
        tts_ms:Date.now()-began,
      },{headers:{'Cache-Control':'no-store'}});
    }
    const bytes = await readFile(output);
    return NextResponse.json({
      persona, voice:'Bob Base 1.7B — referencia aprobada',
      audio_base64:bytes.toString('base64'), audio_mime:'audio/wav',
      tts_ms:Date.now()-began,
    },{headers:{'Cache-Control':'no-store'}});
  } catch(err) {
    return NextResponse.json({error:err instanceof Error ? err.message : 'Error de voz aislada'}, {status:502});
  } finally {
    if (temp) await rm(temp,{recursive:true,force:true});
  }
}
