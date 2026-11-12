import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A localhost-only bridge to the existing temporary Qwen/LiveKit test server.
 * No voice keys or production credentials are stored in this application.
 * Never enable outside local development.
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  if (process.env.NODE_ENV !== 'development' ||
      !['localhost:3001', '127.0.0.1:3001'].includes(host)) {
    return NextResponse.json({error: 'Solo para laboratorio local'}, {status:403});
  }
  const persona = request.nextUrl.searchParams.get('persona');
  if (persona !== 'lina' && persona !== 'bob') {
    return NextResponse.json({error:'Personaje desconocido'}, {status:400});
  }
  try {
    const response = await fetch('http://127.0.0.1:7890/token?role=B', {cache:'no-store'});
    if (!response.ok) throw new Error('Servidor del laboratorio WAV sin respuesta (' + response.status + ')');
    const data = await response.json() as {url?:string; token?:string};
    if (data.url !== 'ws://127.0.0.1:7880' || !data.token) throw new Error('Configuracion LiveKit inesperada');
    return NextResponse.json({server:data.url,token:data.token}, {headers:{'Cache-Control':'no-store'}});
  } catch(e) {
    return NextResponse.json({error:e instanceof Error?e.message:'Laboratorio WAV no disponible'}, {status:503});
  }
}
