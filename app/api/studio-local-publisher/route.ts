import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The local studio voice console publishes audio to the isolated LiveKit WAV room.
// Never return publisher credentials on a hosted preview or production domain.
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  if (process.env.NODE_ENV !== 'development' ||
      !['localhost:3001','127.0.0.1:3001'].includes(host)) {
    return NextResponse.json({error:'Solo laboratorio local'}, {status:403});
  }
  try {
    const res = await fetch('http://127.0.0.1:7890/token?role=A',{cache:'no-store'});
    if(!res.ok)throw new Error('Voces WebRTC 7890 no disponible');
    const data=await res.json() as {url?:string;token?:string};
    if(data.url!=='ws://127.0.0.1:7880'||!data.token)throw new Error('Credenciales LiveKit inesperadas');
    return NextResponse.json({server:data.url,token:data.token},{headers:{'Cache-Control':'no-store'}});
  } catch(e) {
    return NextResponse.json({error:e instanceof Error?e.message:'Sin acceso a LiveKit local'},{status:503});
  }
}
