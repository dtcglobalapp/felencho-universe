import { NextRequest, NextResponse } from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request: NextRequest){
  const host=request.headers.get('host') || '';
  if(process.env.NODE_ENV!=='development'||!['localhost:3001','127.0.0.1:3001'].includes(host))
    return NextResponse.json({error:'Solo laboratorio local'},{status:403});
  const required=['OPENAI_API_KEY','ELEVENLABS_API_KEY','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'] as const;
  const missing=required.filter(name=>!process.env[name]);
  return NextResponse.json({ready:missing.length===0,missing},{headers:{'Cache-Control':'no-store'}});
}
